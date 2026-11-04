<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/inbox.php';

header('Content-Type: application/json; charset=utf-8');

$user = require_auth();
$uid = (int)($user['id'] ?? 0);
$limit = (int)($_GET['limit'] ?? 80);

json_response(true, [
    'unread' => gcv_inbox_unread_count($uid),
    'agenda_unread' => gcv_inbox_unread_count($uid, 'new_booking'),
    'items' => gcv_inbox_list($uid, $limit),
]);
