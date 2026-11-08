<?php

declare(strict_types=1);

/**
 * Aceite da guiagem pelo link do WhatsApp. O token vale enquanto a oferta está pendente.
 */

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/guide_queue_offer.php';

$token = trim((string)($_GET['t'] ?? ''));
$title = 'Confirmação da guiagem';
$message = 'Este link não está mais válido.';
$ok = false;

if ($token !== '' && preg_match('/^[a-f0-9]{32}$/', $token)) {
    gcv_guiagem_ensure_schema();
    $st = db()->prepare(
        "SELECT excursion_id, guide_user_id FROM gcv_guide_queue_offers
         WHERE accept_token = ? AND status = 'pending'
         ORDER BY id DESC LIMIT 1"
    );
    $st->execute([$token]);
    $offer = $st->fetch(PDO::FETCH_ASSOC) ?: null;
    if ($offer) {
        $result = gcv_guiagem_accept((int)$offer['excursion_id'], [
            'id' => (int)$offer['guide_user_id'],
            'role' => 'guide',
        ]);
        $ok = !empty($result['ok']);
        $message = (string)($result['message'] ?? $result['error'] ?? $message);
    }
}

header('Content-Type: text/html; charset=utf-8');
$safe = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
$heading = $ok ? 'Guiagem confirmada' : 'Não foi possível confirmar';
echo '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    . '<title>' . $heading . '</title></head><body style="font-family:sans-serif;margin:2rem;line-height:1.45">'
    . '<h1>' . $heading . '</h1><p>' . $safe . '</p></body></html>';
