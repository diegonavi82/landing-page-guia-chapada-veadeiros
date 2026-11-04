<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/anfitrioes.php';
require_once __DIR__ . '/../helpers/ranking.php';

header('Content-Type: application/json; charset=utf-8');

$me = current_user();
if (!$me) {
    json_response(false, null, 'Faça login para ver o ranking.', 401);
}

$pdo = db();
gcv_anfitriao_ensure($pdo);
$id = (int)($_GET['id'] ?? 0);
if (($me['role'] ?? '') === 'admin' && $id > 0) {
    $st = $pdo->prepare('SELECT * FROM gcv_anfitrioes WHERE id = ?');
    $st->execute([$id]);
} else {
    $st = $pdo->prepare('SELECT * FROM gcv_anfitrioes WHERE email = ?');
    $st->execute([strtolower((string)($me['email'] ?? ''))]);
}
$host = $st->fetch(PDO::FETCH_ASSOC);
if (!$host || ($host['status'] ?? '') !== 'active') {
    json_response(true, ['aguardando' => true, 'anfitriao' => $host ?: null]);
}

$atra = null;
$attractionId = (int)($host['attraction_id'] ?? 0);
if ($attractionId > 0) {
    $aq = $pdo->prepare('SELECT id, slug, title_pt FROM gcv_attractions WHERE id = ?');
    $aq->execute([$attractionId]);
    $row = $aq->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        $atra = [
            'id' => (int)$row['id'],
            'slug' => (string)$row['slug'],
            'nome' => (string)$row['title_pt'],
        ];
    }
}

json_response(true, [
    'atrativo' => $atra,
    'ranking' => gcv_ranking_build(),
]);
