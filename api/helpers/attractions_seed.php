<?php
declare(strict_types=1);

/**
 * Importa atrativos do site para gcv_attractions.
 * Idempotente: não sobrescreve slug nem title_pt já existentes.
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

    $paths = [];
    if ($jsonPath) {
        $paths[] = $jsonPath;
    } else {
        $dir = dirname(__DIR__) . '/data';
        $paths[] = $dir . '/attractions-seed.json';
        $extra = $dir . '/attractions-catalog-extra.json';
        if (is_file($extra)) {
            $paths[] = $extra;
        }
    }

    $list = [];
    foreach ($paths as $path) {
        if (!is_file($path)) {
            throw new RuntimeException('Arquivo de seed não encontrado: ' . $path);
        }
        $raw = json_decode((string)file_get_contents($path), true);
        $chunk = is_array($raw['attractions'] ?? null) ? $raw['attractions'] : [];
        foreach ($chunk as $page) {
            $list[] = $page;
        }
    }
    if ($list === []) {
        throw new RuntimeException('Seed de atrativos vazio.');
    }

    $imported = 0;
    $skipped = 0;
    $titles = [];

    $existsStmt = $pdo->prepare('SELECT id FROM gcv_attractions WHERE slug = ? LIMIT 1');
    $titleStmt = $pdo->prepare('SELECT id FROM gcv_attractions WHERE LOWER(TRIM(title_pt)) = LOWER(TRIM(?)) LIMIT 1');
    $insertStmt = $pdo->prepare(
        'INSERT INTO gcv_attractions (
            slug, status,
            title_pt, title_en, title_es,
            excerpt_pt, excerpt_en, excerpt_es,
            content_pt, cover_url,
            seo_title_pt, seo_title_en, seo_title_es,
            seo_desc_pt, published_at, created_at
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())'
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
        if ($title !== '') {
            $titleStmt->execute([$title]);
            if ($titleStmt->fetch()) {
                $skipped++;
                continue;
            }
        }
        $status = (string)($page['status'] ?? 'published');
        if (!in_array($status, ['draft', 'published', 'archived'], true)) {
            $status = 'published';
        }
        $cover = trim((string)($page['cover_url'] ?? ''));
        if ($cover !== '' && !str_starts_with($cover, 'http') && !str_starts_with($cover, '/')) {
            $cover = '/' . ltrim($cover, '/');
        }
        if (!function_exists('gcv_normalize_media_url')) {
            require_once __DIR__ . '/excursion_attractions.php';
        }
        $cover = gcv_normalize_media_url($cover);
        $titleEn = trim((string)($page['title_en'] ?? ''));
        $titleEs = trim((string)($page['title_es'] ?? ''));
        $excerptEn = trim((string)($page['excerpt_en'] ?? ''));
        $excerptEs = trim((string)($page['excerpt_es'] ?? ''));
        $seoEn = trim((string)($page['seo_title_en'] ?? $titleEn));
        $seoEs = trim((string)($page['seo_title_es'] ?? $titleEs));
        $insertStmt->execute([
            $slug,
            $status,
            $title,
            $titleEn !== '' ? $titleEn : null,
            $titleEs !== '' ? $titleEs : null,
            (string)($page['excerpt_pt'] ?? ''),
            $excerptEn !== '' ? $excerptEn : null,
            $excerptEs !== '' ? $excerptEs : null,
            (string)($page['content_pt'] ?? ''),
            $cover !== '' ? $cover : null,
            (string)($page['seo_title_pt'] ?? $title),
            $seoEn !== '' ? $seoEn : null,
            $seoEs !== '' ? $seoEs : null,
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
