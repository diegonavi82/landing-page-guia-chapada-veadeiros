<?php
declare(strict_types=1);

require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/auth.php';
require_once __DIR__ . '/helpers/indicacoes.php';

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    $user = require_auth();
    $role = (string)($user['active_role'] ?? $user['role'] ?? '');
    if (!in_array($role, ['client', 'guide'], true)) {
        json_response(false, null, 'Entre como cliente ou guia.', 403);
    }
    $panel = gcv_referral_panel((int)$user['id']);
    $panel['role'] = $role;
    if ($role !== 'guide') {
        $panel['ranking'] = [];
        $panel['position'] = null;
        $panel['points'] = 0;
    }
    $panel['lang'] = in_array((string)($user['lang'] ?? 'pt'), ['pt', 'en', 'es'], true)
        ? (string)$user['lang']
        : 'pt';
    json_response(true, $panel);
}

if ($method !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

$user = require_auth();
$data = body_json();
$action = (string)($data['action'] ?? 'criar');

try {
    if ($action === 'vincular') {
        $code = (string)($data['ind'] ?? $data['code'] ?? '');
        $row = gcv_referral_attach((int)$user['id'], $code);
        json_response(true, [
            'status' => $row['status'] ?? null,
            'linked' => $row && (int)($row['referred_user_id'] ?? 0) === (int)$user['id'],
        ]);
    }
    if ($action === 'sacar') {
        $role = (string)($user['active_role'] ?? $user['role'] ?? '');
        if (!in_array($role, ['client', 'guide'], true)) {
            json_response(false, null, 'Entre como cliente ou guia.', 403);
        }
        $cents = (int)($data['amount_cents'] ?? 0);
        if ($cents < 1) {
            $cents = gcv_wallet_balance((int)$user['id']);
        }
        $out = gcv_wallet_withdraw((int)$user['id'], (string)($data['pix_key'] ?? ''), $cents);
        json_response(true, $out);
    }
    $role = (string)($user['active_role'] ?? $user['role'] ?? '');
    if (!in_array($role, ['client', 'guide'], true)) {
        json_response(false, null, 'Entre como cliente ou guia.', 403);
    }
    $created = gcv_referral_create(
        $user,
        (string)($data['phone'] ?? ''),
        isset($data['date_from']) ? (string)$data['date_from'] : null,
        (string)($data['phone_ddi'] ?? '+55'),
        (string)($data['phone_iso'] ?? 'br'),
        (string)($data['email'] ?? '')
    );
    json_response(true, $created);
} catch (InvalidArgumentException $e) {
    json_response(false, null, $e->getMessage(), 422);
} catch (Throwable $e) {
    error_log('indicacoes: ' . $e->getMessage());
    json_response(false, null, 'Não foi possível concluir agora.', 500);
}
