<?php
/**
 * ONE-SHOT: idiomas dos guias (PT fixo; Diego Navi = pt+en+es).
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
require_once __DIR__ . '/helpers/cms_schema.php';
require_once __DIR__ . '/helpers/guide_languages.php';

function out(string $m): void
{
    echo $m . "\n";
}

try {
    gcv_cms_ensure_schema();
    $pdo = db();
    out('OK: conectado');

    $empty = $pdo->exec(
        "UPDATE gcv_guides SET languages_json = '[\"pt\"]' WHERE languages_json IS NULL OR TRIM(languages_json) IN ('', '[]', 'null')"
    );
    out('vazios_para_pt: ' . (int)$empty);

    $diego = $pdo->exec(
        "UPDATE gcv_guides g
         INNER JOIN gcv_users u ON u.id = g.user_id
         SET g.languages_json = '[\"pt\",\"en\",\"es\"]'
         WHERE LOWER(u.email) = 'diegonavi82@gmail.com'
            OR LOWER(TRIM(g.nickname)) LIKE 'diego navi%'"
    );
    out('diego_atualizado: ' . (int)$diego);

    $q = $pdo->query(
        "SELECT g.id, g.nickname, g.languages_json, u.email
         FROM gcv_guides g
         LEFT JOIN gcv_users u ON u.id = g.user_id
         ORDER BY g.id ASC"
    );
    foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $langs = implode(',', gcv_guide_languages_normalize($row['languages_json'] ?? null));
        out(sprintf(
            'guia#%s %s <%s> json=%s normalizado=%s',
            (string)$row['id'],
            (string)$row['nickname'],
            (string)($row['email'] ?? ''),
            (string)($row['languages_json'] ?? ''),
            $langs
        ));
    }
    out('');
    out('FEITO. Apague api/_migrate_guide_languages_once.php');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
}
