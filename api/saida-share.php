<?php
declare(strict_types=1);

/**
 * Página do link /s/{id}. O WhatsApp lê a prévia aqui e não segue o JavaScript.
 * A pessoa cai na home com o card da saída aberto.
 */
require_once __DIR__ . '/helpers/saida_share.php';

$lang = gcv_saida_lang((string)($_GET['lang'] ?? 'pt'));
$cartId = gcv_saida_slug((string)($_GET['id'] ?? ''));
$row = $cartId !== '' ? gcv_saida_find($cartId) : null;
$bundle = $row ? gcv_saida_share_bundle($row, $lang) : null;

if ($bundle) {
    $title = $bundle['title'];
    $description = $bundle['description'];
    $image = $bundle['image'];
    $imageW = '1200';
    $imageH = '630';
    $pageUrl = $bundle['url'];
    $go = gcv_saida_home_url($bundle['cartId'], $lang);
} else {
    $title = $lang === 'en'
        ? 'Tours in Chapada dos Veadeiros'
        : ($lang === 'es' ? 'Paseos en la Chapada dos Veadeiros' : 'Passeios na Chapada dos Veadeiros');
    $description = $lang === 'en'
        ? 'This departure is no longer available.'
        : ($lang === 'es' ? 'Esta salida ya no está disponible.' : 'Essa saída não está mais disponível.');
    $image = gcv_saida_site_origin() . '/assets/img/og/home-arara-80.jpg';
    $imageW = '1200';
    $imageH = '1200';
    $pageUrl = $cartId !== '' ? gcv_saida_share_url($cartId, $lang) : gcv_saida_site_origin() . '/';
    $go = gcv_saida_home_url('', $lang);
}

$alt = $lang === 'en'
    ? 'Macaw emblem and the guide photo for this departure'
    : ($lang === 'es'
        ? 'Emblema de la guacamaya y la foto del guía de esta salida'
        : 'Emblema da arara e a foto do guia desta saída');
$htmlLang = $lang === 'en' ? 'en' : ($lang === 'es' ? 'es' : 'pt-BR');
$wait = $lang === 'en' ? 'Opening the tour…' : ($lang === 'es' ? 'Abriendo el paseo…' : 'Abrindo o passeio…');

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: public, max-age=300');
header('X-Robots-Tag: noindex');

echo '<!DOCTYPE html><html lang="' . gcv_saida_h($htmlLang) . '"><head><meta charset="utf-8">';
echo '<meta name="viewport" content="width=device-width, initial-scale=1">';
echo '<title>' . gcv_saida_h($title) . '</title>';
echo '<meta name="description" content="' . gcv_saida_h($description) . '">';
echo '<meta name="robots" content="noindex">';
echo '<link rel="canonical" href="' . gcv_saida_h($pageUrl) . '">';
echo '<meta property="og:type" content="website">';
echo '<meta property="og:site_name" content="Guia Chapada Veadeiros">';
echo '<meta property="og:locale" content="' . ($lang === 'en' ? 'en_US' : ($lang === 'es' ? 'es_ES' : 'pt_BR')) . '">';
echo '<meta property="og:url" content="' . gcv_saida_h($pageUrl) . '">';
echo '<meta property="og:title" content="' . gcv_saida_h($title) . '">';
echo '<meta property="og:description" content="' . gcv_saida_h($description) . '">';
echo '<meta property="og:image" content="' . gcv_saida_h($image) . '">';
echo '<meta property="og:image:secure_url" content="' . gcv_saida_h($image) . '">';
echo '<meta property="og:image:width" content="' . $imageW . '">';
echo '<meta property="og:image:height" content="' . $imageH . '">';
echo '<meta property="og:image:alt" content="' . gcv_saida_h($alt) . '">';
echo '<meta name="twitter:card" content="summary_large_image">';
echo '<meta name="twitter:title" content="' . gcv_saida_h($title) . '">';
echo '<meta name="twitter:description" content="' . gcv_saida_h($description) . '">';
echo '<meta name="twitter:image" content="' . gcv_saida_h($image) . '">';
echo '</head><body style="margin:0;font:16px/1.4 system-ui,sans-serif;background:#fffdf9;color:#1c3a2e">';
echo '<p style="margin:2rem 1rem"><a href="' . gcv_saida_h($go) . '">' . gcv_saida_h($wait) . '</a></p>';
echo '<script>location.replace(' . json_encode($go, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ');</script>';
echo '</body></html>';
