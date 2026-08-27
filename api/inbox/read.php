<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/inbox.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

$user = require_auth();
$uid = (int)($user['id'] ?? 0);
$raw = file_get_contents('php://input') ?: '';
$body = json_decode($raw, true);
if (!is_array($body)) {
    $body = $_POST;
}
$id = isset($body['id']) ? (int)$body['id'] : 0;
$all = !empty($body['all']);

$n = gcv_inbox_mark_read($uid, $all ? null : ($id > 0 ? $id : null));

json_response(true, [
    'marked' => $n,
    'unread' => gcv_inbox_unread_count($uid),
]);
