<?php
/**
 * ONE-SHOT: taxa padrão 14% → 10% + teto do guia R$150 (Dragão R$190).
 * Recalcula preço das saídas futuras do marketplace (arredondamento 5/8).
 * https://www.guiachapadaveadeiros.com/api/_migrate_commission_10_once.php?key=GCV-MKT-2026
 * Apague depois de rodar.
 */
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

if ((string)($_GET['key'] ?? '') !== 'GCV-MKT-2026') {
    http_response_code(403);
    echo "Forbidden\n";
    exit;
}

require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/marketplace_schema.php';
require_once __DIR__ . '/helpers/marketplace/pricing_service.php';

function out(string $m): void
{
    echo $m . "\n";
}

try {
    $pdo = db();
    out('OK: conectado');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO DB: ' . $e->getMessage());
    exit;
}

try {
    gcv_marketplace_ensure_schema();
    out('OK: gcv_marketplace_ensure_schema()');
} catch (Throwable $e) {
    out('AVISO ensure: ' . $e->getMessage());
}

$sqlFile = __DIR__ . '/database/migration_commission_10.sql';
if (is_file($sqlFile)) {
    $raw = (string)file_get_contents($sqlFile);
    $parts = preg_split('/;\s*\n/', $raw) ?: [];
    foreach ($parts as $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '' || str_starts_with($stmt, '--')) {
            continue;
        }
        if (!preg_match('/^\s*UPDATE\b/i', $stmt)) {
            continue;
        }
        try {
            $n = $pdo->exec($stmt);
            out('OK: ' . preg_replace('/\s+/', ' ', substr($stmt, 0, 90)) . '… (rows=' . (int)$n . ')');
        } catch (Throwable $e) {
            out('SKIP/ERR: ' . substr($e->getMessage(), 0, 180));
        }
    }
} else {
    out('AVISO: migration_commission_10.sql não encontrado no servidor');
}

try {
    $pdo->exec("UPDATE gcv_settings SET value = '10' WHERE key_name = 'platform_commission_pct'");
    $pdo->exec(
        "UPDATE gcv_commission_rules
         SET commission_pct = 10.000
         WHERE scope_type = 'global' AND scope_id IS NULL AND deleted_at IS NULL"
    );
    out('OK: taxa global forçada para 10%');
} catch (Throwable $e) {
    out('AVISO force 10%: ' . $e->getMessage());
}

try {
    out('');
    out('--- repreço saídas futuras marketplace ---');
    $today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
    $st = $pdo->prepare(
        "SELECT e.id, e.attraction_id, e.guide_user_id, e.departure_city_id,
                e.guide_net_cents, e.price_cents, e.commission_pct_applied,
                a.slug, a.title_pt
         FROM gcv_excursions e
         LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
         WHERE e.business_mode = 'GUIDE_MARKETPLACE'
           AND e.status IN ('draft','pending_approval','published')
           AND e.date_iso >= ?
           AND (e.deleted_at IS NULL OR e.deleted_at = '0000-00-00 00:00:00')"
    );
    try {
        $st->execute([$today]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        $st = $pdo->prepare(
            "SELECT e.id, e.attraction_id, e.guide_user_id, e.departure_city_id,
                    e.guide_net_cents, e.price_cents, e.commission_pct_applied,
                    a.slug, a.title_pt
             FROM gcv_excursions e
             LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
             WHERE e.business_mode = 'GUIDE_MARKETPLACE'
               AND e.status IN ('draft','pending_approval','published')
               AND e.date_iso >= ?"
        );
        $st->execute([$today]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    $upd = $pdo->prepare(
        "UPDATE gcv_excursions
         SET guide_net_cents = ?,
             price_cents = ?,
             commission_rule_id = ?,
             commission_pct_applied = ?,
             commission_cents = ?,
             price_before_round_cents = ?,
             rounding_diff_cents = ?,
             platform_margin_cents = ?,
             guide_payout_planned_cents = ?
         WHERE id = ?"
    );

    $changed = 0;
    $capped = 0;
    foreach ($rows as $row) {
        $id = (int)$row['id'];
        $attrId = (int)($row['attraction_id'] ?? 0);
        $net = (int)($row['guide_net_cents'] ?? 0);
        if ($net <= 0) {
            continue;
        }
        $max = gcv_guide_net_max_cents($attrId, (string)($row['slug'] ?? ''), (string)($row['title_pt'] ?? ''));
        if ($net > $max) {
            $net = $max;
            $capped++;
        }
        $pricing = gcv_pricing_from_guide_net(
            $net,
            $id,
            (int)($row['guide_user_id'] ?? 0) ?: null,
            null,
            (int)($row['departure_city_id'] ?? 0) ?: null
        );
        $same =
            (int)$row['guide_net_cents'] === $pricing['guide_net_cents']
            && (int)$row['price_cents'] === $pricing['final_price_cents']
            && abs(((float)$row['commission_pct_applied']) - $pricing['commission_pct']) < 0.001;
        if ($same) {
            continue;
        }
        $upd->execute([
            $pricing['guide_net_cents'],
            $pricing['final_price_cents'],
            $pricing['commission_rule_id'],
            $pricing['commission_pct'],
            $pricing['commission_cents'],
            $pricing['price_before_round_cents'],
            $pricing['rounding_diff_cents'],
            $pricing['commission_cents'],
            $pricing['guide_net_cents'],
            $id,
        ]);
        $changed++;
        out(
            'ex#' . $id
            . ' net ' . ((int)$row['guide_net_cents'] / 100)
            . '→' . ($pricing['guide_net_cents'] / 100)
            . ' price ' . ((int)$row['price_cents'] / 100)
            . '→' . ($pricing['final_price_cents'] / 100)
            . ' pct ' . $row['commission_pct_applied']
            . '→' . $pricing['commission_pct']
        );
    }
    out('recalculadas=' . $changed . ' teto_aplicado=' . $capped . ' total=' . count($rows));
} catch (Throwable $e) {
    out('AVISO reprice: ' . $e->getMessage());
}

try {
    out('');
    out('--- regra global ---');
    $st = $pdo->query(
        "SELECT id, commission_pct, is_active, deleted_at
         FROM gcv_commission_rules
         WHERE scope_type = 'global' AND deleted_at IS NULL
         ORDER BY id DESC"
    );
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        out('id=' . $row['id'] . ' pct=' . $row['commission_pct'] . ' active=' . $row['is_active']);
    }
    $pct = $pdo->query(
        "SELECT value FROM gcv_settings WHERE key_name = 'platform_commission_pct' LIMIT 1"
    )->fetchColumn();
    out('settings.platform_commission_pct=' . (string)$pct);
} catch (Throwable $e) {
    out('AVISO verify: ' . $e->getMessage());
}

out('');
out('FEITO. Apague api/_migrate_commission_10_once.php');
