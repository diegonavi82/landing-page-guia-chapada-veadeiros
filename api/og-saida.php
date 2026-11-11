<?php
declare(strict_types=1);

/**
 * Prévia 1200×630: metade esquerda a arara, metade direita a foto do guia.
 * GET /api/og-saida.php?id={cartId}
 */
require_once __DIR__ . '/helpers/saida_share.php';

$cartId = gcv_saida_slug((string)($_GET['id'] ?? ''));
$row = $cartId !== '' ? gcv_saida_find($cartId) : null;

$fallback = dirname(__DIR__) . '/assets/img/og/home-arara-80.jpg';

if (!$row || !function_exists('imagecreatetruecolor')) {
    gcv_og_saida_send_file($fallback);
}

$canvasW = 1200;
$canvasH = 630;
$half = 600;
$im = imagecreatetruecolor($canvasW, $canvasH);
if (!$im) {
    gcv_og_saida_send_file($fallback);
}
$white = imagecolorallocate($im, 255, 255, 255);
imagefilledrectangle($im, 0, 0, $canvasW, $canvasH, $white);

$macawPath = dirname(__DIR__) . '/assets/img/og/home-arara-80.jpg';
$macaw = is_file($macawPath) ? @imagecreatefromjpeg($macawPath) : false;
if ($macaw) {
    $mw = imagesx($macaw);
    $mh = imagesy($macaw);
    $box = 560;
    $dx = (int)(($half - $box) / 2);
    $dy = (int)(($canvasH - $box) / 2);
    imagecopyresampled($im, $macaw, $dx, $dy, 0, 0, $box, $box, $mw, $mh);
    imagedestroy($macaw);
}

$photoRef = trim((string)($row['guide_photo_3x4'] ?? ''));
if ($photoRef === '') {
    $photoRef = trim((string)($row['guide_photo'] ?? ''));
}
$photo = $photoRef !== '' ? gcv_saida_read_image($photoRef) : ['binary' => ''];
$face = ($photo['binary'] ?? '') !== '' ? @imagecreatefromstring($photo['binary']) : false;
if ($face) {
    $sw = imagesx($face);
    $sh = imagesy($face);
    if ($sw > 0 && $sh > 0) {
        $dstRatio = $half / $canvasH;
        $srcRatio = $sw / $sh;
        if ($srcRatio > $dstRatio) {
            $cropH = $sh;
            $cropW = (int)round($sh * $dstRatio);
            $sx = (int)max(0, ($sw - $cropW) / 2);
            $sy = 0;
        } else {
            $cropW = $sw;
            $cropH = (int)round($sw / $dstRatio);
            $sx = 0;
            $sy = (int)max(0, ($sh - $cropH) * 0.22);
        }
        imagecopyresampled($im, $face, $half, 0, $sx, $sy, $half, $canvasH, $cropW, $cropH);
    }
    imagedestroy($face);
}

try {
    $bin = gcv_og_saida_jpeg($im);
} catch (Throwable $e) {
    error_log('og-saida jpeg: ' . $e->getMessage());
    imagedestroy($im);
    gcv_og_saida_send_file($fallback);
}
imagedestroy($im);
if ($bin === '') {
    gcv_og_saida_send_file($fallback);
}
header('Content-Type: image/jpeg');
header('Cache-Control: public, max-age=3600');
header('Content-Length: ' . strlen($bin));
header('X-Content-Type-Options: nosniff');
echo $bin;
exit;

function gcv_og_saida_jpeg($im): string
{
    $tmp = tempnam(sys_get_temp_dir(), 'ogsaida');
    if ($tmp === false) {
        return '';
    }
    $ok = @imagejpeg($im, $tmp, 86);
    $bin = $ok ? (string)file_get_contents($tmp) : '';
    @unlink($tmp);
    return $bin;
}

function gcv_og_saida_send_file(string $path): void
{
    if (!is_file($path)) {
        http_response_code(404);
        exit;
    }
    header('Content-Type: image/jpeg');
    header('Cache-Control: public, max-age=3600');
    header('X-Content-Type-Options: nosniff');
    readfile($path);
    exit;
}
