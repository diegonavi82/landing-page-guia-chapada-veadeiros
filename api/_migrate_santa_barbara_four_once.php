<?php
/**
 * ONE-SHOT: Santa Bárbara fica só com 4 opções no catálogo.
 * Apague depois de rodar.
 */
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

if ((string)($_GET['key'] ?? '') !== 'GCV-MKT-2026') {
    http_response_code(403);
    echo "Forbidden\n";
    exit;
}

require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/attractions_seed.php';

function out(string $m): void
{
    echo $m . "\n";
}

$keep = [
    'Santa Bárbara',
    'Santa Bárbara + Capivara',
    'Santa Bárbara + Candaru',
    'Santa Bárbara + Capivara + Candaru',
];

try {
    $pdo = db();
    out('OK: conectado');

    $oldCombo = $pdo->prepare(
        "UPDATE gcv_attractions
         SET title_pt = 'Santa Bárbara + Capivara + Candaru',
             title_en = 'Santa Bárbara + Capivara + Candaru',
             title_es = 'Santa Bárbara + Capivara + Candaru',
             status = 'published'
         WHERE title_pt LIKE '%Capivara e Candaru%'
            OR title_pt LIKE '%Capivara and Candaru%'
            OR title_pt LIKE '%Capivara y Candaru%'"
    );
    $oldCombo->execute();
    out('renamed_old_combo: ' . (int)$oldCombo->rowCount());

    $seed = gcv_seed_attractions_from_json();
    out('seed imported: ' . (int)$seed['imported'] . ' skipped: ' . (int)$seed['skipped']);

    $stmt = $pdo->query(
        "SELECT id, slug, title_pt, status FROM gcv_attractions
         WHERE title_pt LIKE '%Santa Bárbara%'
            OR title_pt LIKE '%Santa Barbara%'
            OR slug LIKE '%santa-barbara%'
         ORDER BY title_pt ASC, id ASC"
    );
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $seenKeep = [];
    $arch = $pdo->prepare("UPDATE gcv_attractions SET status = 'archived' WHERE id = ?");
    $pub = $pdo->prepare("UPDATE gcv_attractions SET status = 'published' WHERE id = ?");

    foreach ($rows as $row) {
        $title = trim((string)($row['title_pt'] ?? ''));
        $id = (int)$row['id'];
        $isKeep = in_array($title, $keep, true);
        if ($isKeep) {
            if (isset($seenKeep[$title])) {
                $arch->execute([$id]);
                out('dup archived #' . $id . ' ' . $title);
                continue;
            }
            $seenKeep[$title] = $id;
            $pub->execute([$id]);
            out('keep #' . $id . ' ' . $title);
            continue;
        }
        $arch->execute([$id]);
        out('archived #' . $id . ' ' . $title);
    }

    $missing = array_values(array_diff($keep, array_keys($seenKeep)));
    if ($missing) {
        out('MISSING: ' . implode(' | ', $missing));
    }

    out('');
    out('--- santa bárbara published ---');
    $final = $pdo->query(
        "SELECT title_pt FROM gcv_attractions
         WHERE status = 'published'
           AND (title_pt LIKE '%Santa Bárbara%' OR title_pt LIKE '%Santa Barbara%')
         ORDER BY title_pt ASC"
    )->fetchAll(PDO::FETCH_COLUMN);
    foreach ($final as $t) {
        out('- ' . $t);
    }
    out('');
    out('FEITO. Apague api/_migrate_santa_barbara_four_once.php');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
}
