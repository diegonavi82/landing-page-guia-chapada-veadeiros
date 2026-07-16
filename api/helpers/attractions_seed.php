<?php
declare(strict_types=1);

/**
 * Importa atrativos do site (api/data/attractions-seed.json) para gcv_attractions.
 * Idempotente: não sobrescreve slugs já existentes.
 *
 * @return array{imported:int, skipped:int, total:int, titles:string[]}
 */
function gcv_seed_attractions_from_json(?string $jsonPath = null): array
{
    if (!function_exists('db')) {
        require_once __DIR__ . '/db.php';
    }
    if (!function_exists('gcv_cms_ensure_schema')) {
        require_once __DIR__ . '/cms_schema.php';
    }
    gcv_cms_ensure_schema();
    $pdo = db();

    $path = $jsonPath ?: (dirname(__DIR__) . '/data/attractions-seed.json');
    if (!is_file($path)) {
        throw new RuntimeException('Arquivo de seed não encontrado: ' . $path);
    }
    $raw = json_decode((string)file_get_contents($path), true);
    $list = is_array($raw['attractions'] ?? null) ? $raw['attractions'] : [];
    if ($list === []) {
        throw new RuntimeException('Seed de atrativos vazio.');
    }

    $imported = 0;
    $skipped = 0;
    $titles = [];

    $existsStmt = $pdo->prepare('SELECT id FROM gcv_attractions WHERE slug = ?');
    $insertStmt = $pdo->prepare(
        'INSERT INTO gcv_attractions (
            slug, status, title_pt, excerpt_pt, content_pt, cover_url,
            seo_title_pt, seo_desc_pt, published_at, created_at
         ) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())'
    );
    $galStmt = $pdo->prepare(
        'INSERT INTO gcv_attraction_media (attraction_id, url, alt_text, sort_order) VALUES (?,?,?,?)'
    );

    foreach ($list as $page) {
        if (!is_array($page)) continue;
        $slug = trim((string)($page['slug'] ?? ''));
        if ($slug === '') continue;
        $existsStmt->execute([$slug]);
        if ($existsStmt->fetch()) {
            $skipped++;
            continue;
        }
        $title = trim((string)($page['title_pt'] ?? $slug));
        $status = (string)($page['status'] ?? 'published');
        if (!in_array($status, ['draft', 'published', 'archived'], true)) {
            $status = 'published';
        }
        $cover = trim((string)($page['cover_url'] ?? ''));
        if ($cover !== '' && !str_starts_with($cover, 'http') && !str_starts_with($cover, '/')) {
            $cover = '/' . ltrim($cover, '/');
        }
        $insertStmt->execute([
            $slug,
            $status,
            $title,
            (string)($page['excerpt_pt'] ?? ''),
            (string)($page['content_pt'] ?? ''),
            $cover !== '' ? $cover : null,
            (string)($page['seo_title_pt'] ?? $title),
            (string)($page['seo_desc_pt'] ?? ''),
        ]);
        $id = (int)$pdo->lastInsertId();
        $gallery = $page['gallery'] ?? [];
        if (is_array($gallery)) {
            $i = 0;
            foreach ($gallery as $item) {
                if (!is_array($item)) continue;
                $url = trim((string)($item['url'] ?? ''));
                if ($url === '') continue;
                if (!str_starts_with($url, 'http') && !str_starts_with($url, '/')) {
                    $url = '/' . ltrim($url, '/');
                }
                $galStmt->execute([
                    $id,
                    $url,
                    ($item['alt'] ?? null) ?: null,
                    isset($item['sort_order']) ? (int)$item['sort_order'] : $i,
                ]);
                $i++;
            }
        }
        $imported++;
        $titles[] = $title;
    }

    return [
        'imported' => $imported,
        'skipped' => $skipped,
        'total' => count($list),
        'titles' => $titles,
    ];
}
