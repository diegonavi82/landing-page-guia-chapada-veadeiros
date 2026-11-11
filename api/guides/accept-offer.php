<?php

declare(strict_types=1);

/**
 * O link do WhatsApp só mostra a escolha. Aceitar ou recusar exige o botão,
 * para a prévia da mensagem não confirmar a guiagem sozinha.
 */

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/guide_queue_offer.php';

$token = trim((string)($_POST['t'] ?? $_GET['t'] ?? ''));
$action = strtolower(trim((string)($_POST['action'] ?? '')));
$title = 'Confirmação da guiagem';
$message = 'Este link não está mais válido.';
$ok = false;
$pending = false;
$tourTitle = 'este passeio';

if ($token !== '' && preg_match('/^[a-f0-9]{32}$/', $token)) {
    gcv_guiagem_ensure_schema();
    $st = db()->prepare(
        "SELECT excursion_id, guide_user_id, status FROM gcv_guide_queue_offers
         WHERE accept_token = ?
         ORDER BY id DESC LIMIT 1"
    );
    $st->execute([$token]);
    $offer = $st->fetch(PDO::FETCH_ASSOC) ?: null;
    if ($offer) {
        $excursionId = (int)$offer['excursion_id'];
        $tour = gcv_substitution_load_excursion($excursionId);
        $name = trim((string)($tour['attraction_title'] ?? ''));
        if ($name !== '') {
            $tourTitle = $name;
        }
        $status = (string)($offer['status'] ?? '');
        if ($status === 'pending' && $action === 'accept') {
            $result = gcv_guiagem_accept($excursionId, [
                'id' => (int)$offer['guide_user_id'],
                'role' => 'guide',
            ]);
            $ok = !empty($result['ok']);
            $message = (string)($result['message'] ?? $result['error'] ?? $message);
        } elseif ($status === 'pending' && $action === 'decline') {
            $result = gcv_guiagem_decline($excursionId, (int)$offer['guide_user_id']);
            $ok = !empty($result['ok']);
            $message = (string)($result['message'] ?? $result['error'] ?? 'Você recusou esta guiagem.');
        } elseif ($status === 'pending') {
            $pending = true;
            $message = 'A guiagem de ' . $tourTitle . ' ainda não é sua. Aceite ou recuse abaixo.';
        } elseif ($status === 'accepted') {
            $ok = true;
            $message = 'Você já confirmou esta guiagem.';
        } elseif (gcv_guiagem_taken_by_other($excursionId, (int)$offer['guide_user_id'])) {
            $message = 'A proposta foi aceita por outro guia e não está mais disponível.';
        } elseif ($status === 'declined') {
            $message = 'Você recusou esta guiagem.';
        }
    }
}

header('Content-Type: text/html; charset=utf-8');
$safe = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
$heading = $pending ? 'Aceitar esta guiagem?' : ($ok ? 'Guiagem' : 'Não foi possível confirmar');
echo '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
echo '<title>' . htmlspecialchars($heading, ENT_QUOTES, 'UTF-8') . '</title></head>';
echo '<body style="font-family:sans-serif;margin:2rem;line-height:1.45;max-width:28rem">';
echo '<h1>' . htmlspecialchars($heading, ENT_QUOTES, 'UTF-8') . '</h1><p>' . $safe . '</p>';
if ($pending) {
    $tokenField = htmlspecialchars($token, ENT_QUOTES, 'UTF-8');
    echo '<form method="post" style="display:flex;gap:12px;margin-top:1.5rem">';
    echo '<input type="hidden" name="t" value="' . $tokenField . '">';
    echo '<button type="submit" name="action" value="accept" style="background:#1c3a2e;color:#fff;border:0;border-radius:8px;padding:12px 18px;font-weight:700">Aceitar</button>';
    echo '<button type="submit" name="action" value="decline" style="background:#fff;color:#1c3a2e;border:1px solid #1c3a2e;border-radius:8px;padding:12px 18px;font-weight:700">Recusar</button>';
    echo '</form>';
}
echo '</body></html>';
