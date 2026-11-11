<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/indicacoes.php';

header('Content-Type: application/json; charset=utf-8');
require_admin();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    $rank = gcv_referral_ranking(30);
    $public = [];
    foreach ($rank['rows'] as $row) {
        $public[] = [
            'position' => $row['position'],
            'name' => $row['name'],
            'points' => $row['points'],
        ];
    }
    json_response(true, [
        'withdrawals' => gcv_wallet_withdrawals_admin(80),
        'ranking' => $public,
    ]);
}

if ($method !== 'PUT' && $method !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

$data = body_json();
try {
    gcv_wallet_withdraw_decide((int)($data['id'] ?? 0), (string)($data['status'] ?? ''));
    json_response(true, ['ok' => true]);
} catch (InvalidArgumentException $e) {
    json_response(false, null, $e->getMessage(), 422);
} catch (Throwable $e) {
    error_log('admin indicacoes: ' . $e->getMessage());
    json_response(false, null, 'Não foi possível atualizar o saque.', 500);
}
