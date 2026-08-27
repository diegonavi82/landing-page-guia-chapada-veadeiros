<?php
/**
 * ONE-SHOT: corrige WhatsApp do guia Diego Navi para +55 21 99603-9027.
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
require_once __DIR__ . '/helpers/notify_ops.php';
require_once __DIR__ . '/helpers/guides_seed.php';

function out(string $m): void
{
    echo $m . "\n";
}

$newPhone = '21996039027';

try {
    $pdo = db();
    out('OK: conectado');

    $emails = ['diegonavi82@gmail.com', 'diego@guiachapadaveadeiros.com'];
    $st = $pdo->prepare(
        "SELECT u.id, u.email, g.id AS guide_id, g.phone, g.phone_ddi, g.nickname
         FROM gcv_users u
         LEFT JOIN gcv_guides g ON g.user_id = u.id
         WHERE LOWER(u.email) IN (?, ?)
            OR g.nickname LIKE 'Diego Navi%'
            OR u.name LIKE 'Diego Navi%'
         ORDER BY u.id ASC"
    );
    $st->execute($emails);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    if (!$rows) {
        out('nenhum usuário Diego encontrado — rodando seed');
        gcv_seed_diego_navi_guide();
        $st->execute($emails);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    }

    $updated = 0;
    $userIds = [];
    foreach ($rows as $r) {
        $uid = (int)($r['id'] ?? 0);
        if ($uid <= 0) {
            continue;
        }
        $userIds[$uid] = true;
        $gid = (int)($r['guide_id'] ?? 0);
        if ($gid > 0) {
            $pdo->prepare(
                'UPDATE gcv_guides SET phone = ?, phone_ddi = ?, phone_iso = ? WHERE id = ?'
            )->execute([$newPhone, '+55', 'br', $gid]);
            $updated++;
            out(sprintf(
                'guia #%s user=%s email=%s nick=%s tel_antes=***%s tel_depois=***9027',
                (string)$gid,
                (string)$uid,
                (string)($r['email'] ?? ''),
                (string)($r['nickname'] ?? ''),
                substr(preg_replace('/\D+/', '', (string)($r['phone'] ?? '')) ?? '', -4) ?: '????'
            ));
        }
        try {
            $pdo->prepare(
                'UPDATE gcv_client_profiles SET phone = ?, phone_ddi = ? WHERE user_id = ?'
            )->execute([$newPhone, '+55', $uid]);
        } catch (Throwable $e) {
            // tabela pode não existir
        }
    }

    $seed = gcv_seed_diego_navi_guide();
    out('seed user_id=' . (int)$seed['user_id']);

    $check = $pdo->prepare(
        'SELECT g.phone, g.phone_ddi FROM gcv_guides g WHERE g.user_id = ? ORDER BY g.id DESC LIMIT 1'
    );
    $check->execute([(int)$seed['user_id']]);
    $after = $check->fetch(PDO::FETCH_ASSOC) ?: [];
    $digits = preg_replace('/\D+/', '', (string)($after['phone'] ?? '')) ?? '';
    out('confirmado phone=' . $digits . ' ddi=' . (string)($after['phone_ddi'] ?? ''));

    if ($digits !== $newPhone && $digits !== '5521996039027') {
        throw new RuntimeException('telefone não gravou como 21996039027');
    }

    $contact = gcv_ops_guide_contact((int)$seed['user_id']);
    out('normalize=' . (string)($contact['phone'] ?? ''));

    $excId = 11;
    $exc = gcv_ops_load_excursion($excId);
    if ($exc && (int)($exc['guide_user_id'] ?? 0) === (int)$seed['user_id']) {
        $title = gcv_ops_excursion_title($exc);
        $when = trim(gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
        $text = "✅ Seu passeio foi APROVADO e já aparece no site.\n\n"
            . 'Passeio: ' . $title . "\n"
            . 'Quando: ' . $when . "\n"
            . 'Preço: ' . gcv_ops_brl((int)($exc['price_cents'] ?? 0)) . " por pessoa\n"
            . 'Embarque: ' . (string)($exc['departure_city_name'] ?? '') . "\n\n"
            . "Veja no site: https://www.guiachapadaveadeiros.com/";
        $ok = gcv_ops_wa_guide((int)$seed['user_id'], $text);
        out('whatsapp_teste=' . ($ok ? 'ENVIADO' : 'FALHOU') . ' excursao=#' . $excId);
    } else {
        out('whatsapp_teste=PULADO (excursão #11 não é deste guia)');
    }

    out('');
    out('guias_atualizados=' . $updated);
    out('FEITO. Apague api/_fix_diego_phone_once.php');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
}
