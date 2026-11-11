<?php

declare(strict_types=1);

/**
 * O link antigo do WhatsApp não aceita mais sozinho.
 * Leva ao login do guia e, depois, ao popup da agenda.
 */

require_once __DIR__ . '/../helpers/auth.php';

$token = strtolower(trim((string)($_GET['t'] ?? $_POST['t'] ?? '')));
$dest = '/dashboard/?as=guide';
if (preg_match('/^[a-f0-9]{32}$/', $token)) {
    $dest .= '#guiagem/' . $token;
}

$user = current_user();
if (!$user) {
    header('Location: /guia/login.html?redirect=' . rawurlencode($dest), true, 302);
    exit;
}

header('Location: ' . $dest, true, 302);
exit;
