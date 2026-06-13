<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(false, null, 'Método não permitido', 405);
}

$lang     = 'pt';
$uri      = $_SERVER['REQUEST_URI'] ?? '';
if (str_contains($uri, '/en/')) $lang = 'en';
elseif (str_contains($uri, '/es/')) $lang = 'es';
$lang = $_GET['lang'] ?? $lang;
$lang = validate_lang($lang);

$limit    = min(50, max(1, (int)($_GET['limit'] ?? 10)));
$page     = max(1, (int)($_GET['page'] ?? 1));
$offset   = ($page - 1) * $limit;
$difficulty = $_GET['difficulty'] ?? '';
$region   = $_GET['region'] ?? '';
$dateFrom = $_GET['date_from'] ?? '';
$dateTo   = $_GET['date_to'] ?? '';

$where  = ['t.status = \'approved\'', 't.departure_date >= CURDATE()'];
$params = [];

if ($difficulty && in_array($difficulty, ['easy', 'medium', 'hard'], true)) {
    $where[] = 't.difficulty = ?';
    $params[] = $difficulty;
}
if ($region) {
    $where[] = 't.region = ?';
    $params[] = $region;
}
if ($dateFrom) {
    $where[] = 't.departure_date >= ?';
    $params[] = $dateFrom;
}
if ($dateTo) {
    $where[] = 't.departure_date <= ?';
    $params[] = $dateTo;
}

$titleField = "title_{$lang}";
$descField  = "description_{$lang}";

$sql = "SELECT t.id, t.{$titleField} AS title, t.{$descField} AS description,
               t.departure_date, t.departure_time, t.meeting_point, t.region,
               t.max_spots, t.spots_taken, t.price_cents, t.difficulty,
               t.cover_url, t.guide_id,
               u.name AS guide_name, g.photo_url AS guide_photo, g.cadastur AS guide_cadastur
        FROM gcv_tours t
        JOIN gcv_users u ON u.id = t.guide_id
        LEFT JOIN gcv_guides g ON g.user_id = t.guide_id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY t.departure_date ASC, t.departure_time ASC
        LIMIT ? OFFSET ?";

$params[] = $limit;
$params[] = $offset;

$stmt = db()->prepare($sql);
$stmt->execute($params);
$tours = $stmt->fetchAll();

// Count total
$countSql = 'SELECT COUNT(*) FROM gcv_tours t WHERE ' . implode(' AND ', array_slice($where, 0));
$countParams = array_slice($params, 0, -2);
$total = (int)db()->prepare($countSql)->execute($countParams) ? (int)db()->query(
    'SELECT COUNT(*) FROM gcv_tours t WHERE ' . implode(' AND ', $where)
)->fetchColumn() : 0;

// Format
foreach ($tours as &$t) {
    $t['price_brl']  = 'R$ ' . number_format($t['price_cents'] / 100, 2, ',', '.');
    $t['spots_left'] = (int)$t['max_spots'] - (int)$t['spots_taken'];
}
unset($t);

json_response(true, ['tours' => $tours, 'total' => count($tours), 'page' => $page, 'limit' => $limit]);
