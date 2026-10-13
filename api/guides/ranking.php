<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/ranking.php';

header('Content-Type: application/json; charset=utf-8');

$me = current_user();
if (!$me || ($me['role'] ?? '') !== 'guide') {
    json_response(false, null, 'Acesso restrito ao guia.', 403);
}

$data = gcv_ranking_build();
$data['guia_id'] = (int)($me['id'] ?? 0);
$data['guia_nome'] = (string)($me['name'] ?? '');
json_response(true, $data);
