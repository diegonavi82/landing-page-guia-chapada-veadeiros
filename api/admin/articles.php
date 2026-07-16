<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';

header('Content-Type: application/json; charset=utf-8');
$admin = require_admin();
gcv_cms_ensure_schema();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function gcv_article_row_from_body(array $body, ?array $existing = null): array
{
    $title = trim((string)($body['title_pt'] ?? ($existing['title_pt'] ?? '')));
    $slug = trim((string)($body['slug'] ?? ''));
    if ($slug === '') $slug = gcv_cms_slugify($title);
    $status = (string)($body['status'] ?? ($existing['status'] ?? 'draft'));
    if (!in_array($status, ['draft', 'published', 'archived'], true)) $status = 'draft';
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
        'cover_media_id' => isset($body['cover_media_id']) && $body['cover_media_id'] !== '' ? (int)$body['cover_media_id'] : null,
        'cover_url' => ($body['cover_url'] ?? null) ?: null,
        'published_at' => $status === 'published'
            ? (($body['published_at'] ?? null) ?: ($existing['published_at'] ?? date('Y-m-d H:i:s')))
            : null,
    ];
}

if ($method === 'GET') {
    try {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id > 0) {
            $stmt = db()->prepare('SELECT * FROM gcv_articles WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Artigo não encontrado']);
                exit;
            }
            echo json_encode(['ok' => true, 'data' => $row]);
            exit;
        }
        $rows = db()->query('SELECT id, slug, status, title_pt, title_en, title_es, cover_url, published_at, updated_at FROM gcv_articles ORDER BY updated_at DESC')->fetchAll();
        echo json_encode(['ok' => true, 'data' => ['articles' => $rows]]);
        exit;
    } catch (Throwable $e) {
        error_log('articles.php GET: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Tabela CMS ausente. Rode migration_cms.sql ou /api/_migrate_cms_once.php', 'detail' => $e->getMessage()]);
        exit;
    }
}

$body = gcv_cms_json_body();

if ($method === 'POST') {
    $row = gcv_article_row_from_body($body);
    if ($row['title_pt'] === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Título (PT) obrigatório']);
        exit;
    }
    $stmt = db()->prepare(
        'INSERT INTO gcv_articles (
          slug, status, title_pt, title_en, title_es, excerpt_pt, excerpt_en, excerpt_es,
          content_pt, content_en, content_es, seo_title_pt, seo_title_en, seo_title_es,
          seo_desc_pt, seo_desc_en, seo_desc_es, cover_media_id, cover_url, published_at, created_by, updated_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    $stmt->execute([
        $row['slug'], $row['status'], $row['title_pt'], $row['title_en'], $row['title_es'],
        $row['excerpt_pt'], $row['excerpt_en'], $row['excerpt_es'],
        $row['content_pt'], $row['content_en'], $row['content_es'],
        $row['seo_title_pt'], $row['seo_title_en'], $row['seo_title_es'],
        $row['seo_desc_pt'], $row['seo_desc_en'], $row['seo_desc_es'],
        $row['cover_media_id'], $row['cover_url'], $row['published_at'],
        (int)$admin['id'], (int)$admin['id'],
    ]);
    $id = (int)db()->lastInsertId();
    $stmt = db()->prepare('SELECT * FROM gcv_articles WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode(['ok' => true, 'data' => $stmt->fetch()]);
    exit;
}

if ($method === 'PUT') {
    $id = (int)($body['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'id obrigatório']);
        exit;
    }
    $stmt = db()->prepare('SELECT * FROM gcv_articles WHERE id = ?');
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Artigo não encontrado']);
        exit;
    }
    $row = gcv_article_row_from_body($body, $existing);
    $stmt = db()->prepare(
        'UPDATE gcv_articles SET
          slug=?, status=?, title_pt=?, title_en=?, title_es=?, excerpt_pt=?, excerpt_en=?, excerpt_es=?,
          content_pt=?, content_en=?, content_es=?, seo_title_pt=?, seo_title_en=?, seo_title_es=?,
          seo_desc_pt=?, seo_desc_en=?, seo_desc_es=?, cover_media_id=?, cover_url=?, published_at=?, updated_by=?
         WHERE id=?'
    );
    $stmt->execute([
        $row['slug'], $row['status'], $row['title_pt'], $row['title_en'], $row['title_es'],
        $row['excerpt_pt'], $row['excerpt_en'], $row['excerpt_es'],
        $row['content_pt'], $row['content_en'], $row['content_es'],
        $row['seo_title_pt'], $row['seo_title_en'], $row['seo_title_es'],
        $row['seo_desc_pt'], $row['seo_desc_en'], $row['seo_desc_es'],
        $row['cover_media_id'], $row['cover_url'], $row['published_at'],
        (int)$admin['id'], $id,
    ]);
    $stmt = db()->prepare('SELECT * FROM gcv_articles WHERE id = ?');
    $stmt->execute([$id]);
    echo json_encode(['ok' => true, 'data' => $stmt->fetch()]);
    exit;
}

if ($method === 'DELETE') {
    $id = (int)($body['id'] ?? $_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'id obrigatório']);
        exit;
    }
    db()->prepare('UPDATE gcv_articles SET status="archived", updated_by=? WHERE id=?')->execute([(int)$admin['id'], $id]);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
