<?php
/**
 * Diagnóstico rápido (sem login): quais helpers CMS existem no servidor.
 * Apague depois do teste: /api/admin/deploy-check.php
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$helpers = [
    'db.php',
    'auth.php',
    'cms_schema.php',
    'user_roles.php',
    'guides_seed.php',
    'attractions_seed.php',
    'excursion_attractions.php',
];
$adminFiles = [
    'seed-test-excursion.php',
    'setup-cms.php',
    'seed-attractions.php',
    'excursions.php',
];

$out = [
    'ok' => true,
    'php' => PHP_VERSION,
    'helpers' => [],
    'admin' => [],
];

foreach ($helpers as $f) {
    $p = __DIR__ . '/../helpers/' . $f;
    $out['helpers'][$f] = is_file($p);
}
foreach ($adminFiles as $f) {
    $p = __DIR__ . '/' . $f;
    $out['admin'][$f] = is_file($p);
}

$missing = [];
foreach ($out['helpers'] as $k => $ok) {
    if (!$ok) $missing[] = 'helpers/' . $k;
}
foreach ($out['admin'] as $k => $ok) {
    if (!$ok) $missing[] = 'admin/' . $k;
}
$out['missing'] = $missing;
$out['deploy_ok'] = $missing === [];

echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
