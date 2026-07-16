<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';

header('Content-Type: application/json; charset=utf-8');
$admin = require_admin();
gcv_cms_ensure_schema();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function gcv_attraction_gallery(int $attractionId): array
{
    $stmt = db()->prepare('SELECT * FROM gcv_attraction_media WHERE attraction_id = ? ORDER BY sort_order ASC, id ASC');
    $stmt->execute([$attractionId]);
    return $stmt->fetchAll();
}

function gcv_save_attraction_gallery(int $attractionId, array $gallery): void
{
    db()->prepare('DELETE FROM gcv_attraction_media WHERE attraction_id = ?')->execute([$attractionId]);
    $ins = db()->prepare(
        'INSERT INTO gcv_attraction_media (attraction_id, media_id, url, alt_text, sort_order) VALUES (?,?,?,?,?)'
    );
    $i = 0;
    foreach ($gallery as $item) {
        if (!is_array($item)) continue;
        $url = trim((string)($item['url'] ?? ''));
        if ($url === '') continue;
        $ins->execute([
            $attractionId,
            isset($item['media_id']) && $item['media_id'] !== '' ? (int)$item['media_id'] : null,
            $url,
            ($item['alt_text'] ?? null) ?: null,
            isset($item['sort_order']) ? (int)$item['sort_order'] : $i,
        ]);
        $i++;
    }
}

function gcv_attraction_from_body(array $body, ?array $existing = null): array
{
    $title = trim((string)($body['title_pt'] ?? ($existing['title_pt'] ?? '')));
    $slug = trim((string)($body['slug'] ?? ''));
    if ($slug === '') $slug = gcv_cms_slugify($title);
    $status = (string)($body['status'] ?? ($existing['status'] ?? 'draft'));
    if (!in_array($status, ['draft', 'published', 'archived'], true)) $status = 'draft';
    $diff = (string)($body['difficulty'] ?? ($existing['difficulty'] ?? ''));
    if (!in_array($diff, ['easy', 'medium', 'hard', ''], true)) $diff = '';
    return [
        'slug' => $slug,
        'status' => $status,
        'title_pt' => $title,
        'title_en' => ($body['title_en'] ?? null),
        'title_es' => ($body['title_es'] ?? null),
        'excerpt_pt' => ($body['excerpt_pt'] ?? null),
        'excerpt_en' => ($body['excerpt_en'] ?? null),
        'excerpt_es' => ($body['excerpt_es'] ?? null),
        'content_pt' => ($body['content_pt'] ?? null),
        'content_en' => ($body['content_en'] ?? null),
        'content_es' => ($body['content_es'] ?? null),
        'seo_title_pt' => ($body['seo_title_pt'] ?? null),
        'seo_title_en' => ($body['seo_title_en'] ?? null),
        'seo_title_es' => ($body['seo_title_es'] ?? null),
        'seo_desc_pt' => ($body['seo_desc_pt'] ?? null),
        'seo_desc_en' => ($body['seo_desc_en'] ?? null),
        'seo_desc_es' => ($body['seo_desc_es'] ?? null),
        'distance_km' => isset($body['distance_km']) && $body['distance_km'] !== '' ? (float)$body['distance_km'] : null,
        'trail_distance_km' => isset($body['trail_distance_km']) && $body['trail_distance_km'] !== '' ? (float)$body['trail_distance_km'] : null,
        'difficulty' => $diff,
        'entry_price_cents' => isset($body['entry_price_cents']) && $body['entry_price_cents'] !== '' ? (int)$body['entry_price_cents'] : null,
        'entry_price_label' => ($body['entry_price_label'] ?? null) ?: null,
        'parking_info' => ($body['parking_info'] ?? null) ?: null,
        'recommended_period' => ($body['recommended_period'] ?? null) ?: null,
        'city_id' => isset($body['city_id']) && $body['city_id'] !== '' ? (int)$body['city_id'] : null,
        'cover_media_id' => isset($body['cover_media_id']) && $body['cover_media_id'] !== '' ? (int)$body['cover_media_id'] : null,
        'cover_url' => ($body['cover_url'] ?? null) ?: null,
        'sidebar_html_pt' => ($body['sidebar_html_pt'] ?? null),
        'sidebar_html_en' => ($body['sidebar_html_en'] ?? null),
        'sidebar_html_es' => ($body['sidebar_html_es'] ?? null),
        'published_at' => $status === 'published'
            ? (($body['published_at'] ?? null) ?: ($existing['published_at'] ?? date('Y-m-d H:i:s')))
            : null,
    ];
}

if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id > 0) {
        $stmt = db()->prepare('SELECT * FROM gcv_attractions WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Atrativo não encontrado']);
            exit;
        }
        $row['gallery'] = gcv_attraction_gallery($id);
        echo json_encode(['ok' => true, 'data' => $row]);
        exit;
    }
    $rows = db()->query(
        'SELECT id, slug, status, title_pt, cover_url, difficulty, entry_price_cents, entry_price_label, city_id, updated_at
         FROM gcv_attractions ORDER BY title_pt ASC'
    )->fetchAll();
    echo json_encode(['ok' => true, 'data' => ['attractions' => $rows]]);
    exit;
}

$body = gcv_cms_json_body();

if ($method === 'POST') {
    $row = gcv_attraction_from_body($body);
    if ($row['title_pt'] === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Título (PT) obrigatório']);
        exit;
    }
    $stmt = db()->prepare(
        'INSERT INTO gcv_attractions (
          slug, status, title_pt, title_en, title_es, excerpt_pt, excerpt_en, excerpt_es,
          content_pt, content_en, content_es, seo_title_pt, seo_title_en, seo_title_es,
          seo_desc_pt, seo_desc_en, seo_desc_es, distance_km, trail_distance_km, difficulty,
          entry_price_cents, entry_price_label, parking_info, recommended_period, city_id,
          cover_media_id, cover_url, sidebar_html_pt, sidebar_html_en, sidebar_html_es,
          published_at, created_by, updated_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    $stmt->execute([
        $row['slug'], $row['status'], $row['title_pt'], $row['title_en'], $row['title_es'],
        $row['excerpt_pt'], $row['excerpt_en'], $row['excerpt_es'],
        $row['content_pt'], $row['content_en'], $row['content_es'],
        $row['seo_title_pt'], $row['seo_title_en'], $row['seo_title_es'],
        $row['seo_desc_pt'], $row['seo_desc_en'], $row['seo_desc_es'],
        $row['distance_km'], $row['trail_distance_km'], $row['difficulty'],
        $row['entry_price_cents'], $row['entry_price_label'], $row['parking_info'], $row['recommended_period'], $row['city_id'],
        $row['cover_media_id'], $row['cover_url'], $row['sidebar_html_pt'], $row['sidebar_html_en'], $row['sidebar_html_es'],
        $row['published_at'], (int)$admin['id'], (int)$admin['id'],
    ]);
    $id = (int)db()->lastInsertId();
    if (!empty($body['gallery']) && is_array($body['gallery'])) {
        gcv_save_attraction_gallery($id, $body['gallery']);
    }
    $stmt = db()->prepare('SELECT * FROM gcv_attractions WHERE id = ?');
    $stmt->execute([$id]);
    $out = $stmt->fetch();
    $out['gallery'] = gcv_attraction_gallery($id);
    echo json_encode(['ok' => true, 'data' => $out]);
    exit;
}

if ($method === 'PUT') {
    $id = (int)($body['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'id obrigatório']);
        exit;
    }
    $stmt = db()->prepare('SELECT * FROM gcv_attractions WHERE id = ?');
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Atrativo não encontrado']);
        exit;
    }
    $row = gcv_attraction_from_body($body, $existing);
    $stmt = db()->prepare(
        'UPDATE gcv_attractions SET
          slug=?, status=?, title_pt=?, title_en=?, title_es=?, excerpt_pt=?, excerpt_en=?, excerpt_es=?,
          content_pt=?, content_en=?, content_es=?, seo_title_pt=?, seo_title_en=?, seo_title_es=?,
          seo_desc_pt=?, seo_desc_en=?, seo_desc_es=?, distance_km=?, trail_distance_km=?, difficulty=?,
          entry_price_cents=?, entry_price_label=?, parking_info=?, recommended_period=?, city_id=?,
          cover_media_id=?, cover_url=?, sidebar_html_pt=?, sidebar_html_en=?, sidebar_html_es=?,
          published_at=?, updated_by=?
         WHERE id=?'
    );
    $stmt->execute([
        $row['slug'], $row['status'], $row['title_pt'], $row['title_en'], $row['title_es'],
        $row['excerpt_pt'], $row['excerpt_en'], $row['excerpt_es'],
        $row['content_pt'], $row['content_en'], $row['content_es'],
        $row['seo_title_pt'], $row['seo_title_en'], $row['seo_title_es'],
        $row['seo_desc_pt'], $row['seo_desc_en'], $row['seo_desc_es'],
        $row['distance_km'], $row['trail_distance_km'], $row['difficulty'],
        $row['entry_price_cents'], $row['entry_price_label'], $row['parking_info'], $row['recommended_period'], $row['city_id'],
        $row['cover_media_id'], $row['cover_url'], $row['sidebar_html_pt'], $row['sidebar_html_en'], $row['sidebar_html_es'],
        $row['published_at'], (int)$admin['id'], $id,
    ]);
    if (array_key_exists('gallery', $body) && is_array($body['gallery'])) {
        gcv_save_attraction_gallery($id, $body['gallery']);
    }
    $stmt = db()->prepare('SELECT * FROM gcv_attractions WHERE id = ?');
    $stmt->execute([$id]);
    $out = $stmt->fetch();
    $out['gallery'] = gcv_attraction_gallery($id);
    echo json_encode(['ok' => true, 'data' => $out]);
    exit;
}

if ($method === 'DELETE') {
    $id = (int)($body['id'] ?? $_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'id obrigatório']);
        exit;
    }
    db()->prepare('UPDATE gcv_attractions SET status="archived", updated_by=? WHERE id=?')->execute([(int)$admin['id'], $id]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
