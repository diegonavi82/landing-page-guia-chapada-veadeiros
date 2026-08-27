<?php
/**
 * ONE-SHOT: reenvia WhatsApp de aprovação só para os 3 passeios de teste
 * (Flip #8, Gyovanna #10, Diego #11). Apague depois de rodar.
 */
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

if ((string)($_GET['key'] ?? '') !== 'GCV-MKT-2026') {
    http_response_code(403);
    echo "Forbidden\n";
    exit;
}

require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/notify_ops.php';

function out(string $m): void
{
    echo $m . "\n";
}

$want = [8, 10, 11];

try {
    $pdo = db();
    out('OK: conectado');

    $in = implode(',', array_map('intval', $want));
    $rows = $pdo->query(
        "SELECT e.id, e.status, e.date_iso, e.departure_time, e.price_cents, e.guide_user_id,
                e.notify_approved_at, e.approved_at,
                u.name AS user_name, g.nickname, g.full_name, g.phone
         FROM gcv_excursions e
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         LEFT JOIN gcv_guides g ON g.user_id = e.guide_user_id
         WHERE e.id IN ($in) AND e.deleted_at IS NULL
         ORDER BY e.id ASC"
    )->fetchAll(PDO::FETCH_ASSOC);

    $found = [];
    foreach ($rows as $r) {
        $found[(int)$r['id']] = $r;
    }

    $sent = 0;
    foreach ($want as $id) {
        if (!isset($found[$id])) {
            out("FALTA: excursão #$id não encontrada");
            continue;
        }
        $row = $found[$id];
        $guideId = (int)($row['guide_user_id'] ?? 0);
        $exc = gcv_ops_load_excursion($id);
        $title = $exc ? gcv_ops_excursion_title($exc) : 'Passeio';
        $when = $exc
            ? trim(gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5))
            : '';
        $name = (string)($row['nickname'] ?: $row['full_name'] ?: $row['user_name'] ?: 'Guia');
        $phone = (string)($row['phone'] ?? '');
        $tail = $phone !== '' ? substr(preg_replace('/\D+/', '', $phone) ?? '', -4) : '????';

        out(sprintf(
            '— #%d %s | %s | %s | guia=%s | tel=***%s | status=%s | notify_antes=%s',
            $id,
            $name,
            $title,
            $when,
            (string)$guideId,
            $tail,
            (string)($row['status'] ?? ''),
            (string)($row['notify_approved_at'] ?? '-')
        ));

        if ($guideId <= 0 || !$exc) {
            out("  ERRO: sem guia ou excursão");
            continue;
        }

        $text = "✅ Seu passeio foi APROVADO e já aparece no site.\n\n"
            . 'Passeio: ' . $title . "\n"
            . 'Quando: ' . $when . "\n"
            . 'Preço: ' . gcv_ops_brl((int)($exc['price_cents'] ?? 0)) . " por pessoa\n"
            . 'Embarque: ' . (string)($exc['departure_city_name'] ?? '') . "\n\n"
            . "Veja no site: https://www.guiachapadaveadeiros.com/";

        $ok = gcv_ops_wa_guide($guideId, $text);
        if ($ok) {
            $pdo->prepare(
                'UPDATE gcv_excursions SET notify_approved_at = NOW() WHERE id = ?'
            )->execute([$id]);
            $sent++;
            out('  WhatsApp: ENVIADO');
        } else {
            out('  WhatsApp: FALHOU');
        }
    }

    out('');
    out('enviados=' . $sent . '/' . count($want));
    out('FEITO. Apague api/_notify_approved_test_once.php');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
}
