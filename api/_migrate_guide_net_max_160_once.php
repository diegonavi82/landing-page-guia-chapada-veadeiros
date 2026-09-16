<?php
/**
 * ONE-SHOT: diária máxima R$160 nas configs + restaura líquido R$200 da Gyovanna (#17).
 * https://www.guiachapadaveadeiros.com/api/_migrate_guide_net_max_160_once.php?key=GCV-MKT-2026
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
    out('OK: schema');
} catch (Throwable $e) {
    out('AVISO schema: ' . $e->getMessage());
}

$sqlFile = __DIR__ . '/database/migration_guide_net_max_160.sql';
if (is_file($sqlFile)) {
    $raw = (string)file_get_contents($sqlFile);
    $parts = preg_split('/;\s*\n/', $raw) ?: [];
    foreach ($parts as $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '' || str_starts_with($stmt, '--')) {
            continue;
        }
        if (!preg_match('/^\s*(INSERT|UPDATE)\b/i', $stmt)) {
            continue;
        }
        try {
            $n = $pdo->exec($stmt);
            out('OK SQL rows=' . (int)$n . ' ' . preg_replace('/\s+/', ' ', substr($stmt, 0, 80)));
        } catch (Throwable $e) {
            out('SKIP/ERR: ' . substr($e->getMessage(), 0, 180));
        }
    }
}

try {
    out('');
    out('--- configs ---');
    $st = $pdo->query(
        "SELECT key_name, value FROM gcv_settings
         WHERE key_name IN ('guide_net_min_reais','guide_net_max_reais','guide_net_max_dragao_reais','platform_commission_pct')
         ORDER BY key_name"
    );
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        out($row['key_name'] . '=' . $row['value']);
    }
} catch (Throwable $e) {
    out('AVISO configs: ' . $e->getMessage());
}

$restoreNet = 20000; // R$ 200 — valor original pedido pela Gyovanna (ex#17, 200→150 na troca da taxa)
try {
    out('');
    out('--- restaura Gyovanna líquido 200 ---');
    $sql = "SELECT e.id, e.guide_user_id, e.attraction_id, e.departure_city_id,
                   e.guide_net_cents, e.price_cents, e.date_iso, e.status,
                   a.slug, a.title_pt
            FROM gcv_excursions e
            LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
            WHERE e.id = 17
               OR (
                 e.business_mode = 'GUIDE_MARKETPLACE'
                 AND e.date_iso = '2026-09-16'
                 AND (a.slug LIKE '%janela%' OR a.title_pt LIKE '%Janela%')
               )
            ORDER BY CASE WHEN e.id = 17 THEN 0 ELSE 1 END, e.id ASC
            LIMIT 3";
    $rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC) ?: [];
    if (!$rows) {
        out('AVISO: passeio não encontrado');
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
    $doneIds = [];
    foreach ($rows as $row) {
        $id = (int)$row['id'];
        if (isset($doneIds[$id])) {
            continue;
        }
        $doneIds[$id] = true;
        out(
            'ex#' . $id
            . ' date=' . ($row['date_iso'] ?? '')
            . ' status=' . ($row['status'] ?? '')
            . ' attr=' . ($row['title_pt'] ?? '')
            . ' net=' . ((int)$row['guide_net_cents'] / 100)
            . ' price=' . ((int)$row['price_cents'] / 100)
        );
        $pricing = gcv_pricing_from_guide_net(
            $restoreNet,
            $id,
            (int)($row['guide_user_id'] ?? 0) ?: null,
            null,
            (int)($row['departure_city_id'] ?? 0) ?: null
        );
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
        out(
            'restaurado net '
            . ($pricing['guide_net_cents'] / 100)
            . ' price '
            . ($pricing['final_price_cents'] / 100)
            . ' pct '
            . $pricing['commission_pct']
        );
    }
} catch (Throwable $e) {
    out('ERRO restore: ' . $e->getMessage());
}

out('');
out('FEITO. Apague api/_migrate_guide_net_max_160_once.php');
