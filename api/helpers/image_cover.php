<?php
declare(strict_types=1);

/**
 * Recorta e redimensiona uma imagem para preencher um retângulo (cover).
 * Usado no upload da foto 3×4 do guia para o chip das próximas saídas.
 *
 * @return array{ok:bool,path?:string,width?:int,height?:int,mime?:string}
 */
function gcv_image_cover_to_jpeg(string $srcAbs, string $destAbs, int $targetW, int $targetH, string $srcMime): array
{
    if (!function_exists('imagecreatetruecolor')) {
        return ['ok' => false];
    }
    $im = gcv_gd_load($srcAbs, $srcMime);
    if (!$im) {
        return ['ok' => false];
    }
    $im = gcv_gd_apply_exif_orientation($im, $srcAbs, $srcMime);
    $sw = imagesx($im);
    $sh = imagesy($im);
    if ($sw < 1 || $sh < 1) {
        imagedestroy($im);
        return ['ok' => false];
    }

    $srcRatio = $sw / $sh;
    $dstRatio = $targetW / $targetH;
    if ($srcRatio > $dstRatio) {
        $cropH = $sh;
        $cropW = (int)round($sh * $dstRatio);
        $sx = (int)max(0, ($sw - $cropW) / 2);
        $sy = 0;
    } else {
        $cropW = $sw;
        $cropH = (int)round($sw / $dstRatio);
        $sx = 0;
        // Retrato: um pouco acima do centro para não cortar o rosto
        $sy = (int)max(0, ($sh - $cropH) * 0.22);
    }

    $out = imagecreatetruecolor($targetW, $targetH);
    if (!$out) {
        imagedestroy($im);
        return ['ok' => false];
    }
    imagecopyresampled($out, $im, 0, 0, $sx, $sy, $targetW, $targetH, $cropW, $cropH);
    imagedestroy($im);

    $ok = imagejpeg($out, $destAbs, 88);
    imagedestroy($out);
    if (!$ok || !is_file($destAbs)) {
        return ['ok' => false];
    }
    return [
        'ok' => true,
        'path' => $destAbs,
        'width' => $targetW,
        'height' => $targetH,
        'mime' => 'image/jpeg',
    ];
}

/** @return \GdImage|resource|null */
function gcv_gd_load(string $path, string $mime)
{
    return match ($mime) {
        'image/jpeg', 'image/jpg' => @imagecreatefromjpeg($path) ?: null,
        'image/png' => @imagecreatefrompng($path) ?: null,
        'image/webp' => function_exists('imagecreatefromwebp') ? (@imagecreatefromwebp($path) ?: null) : null,
        'image/gif' => @imagecreatefromgif($path) ?: null,
        default => null,
    };
}

/**
 * @param \GdImage|resource $im
 * @return \GdImage|resource
 */
function gcv_gd_apply_exif_orientation($im, string $path, string $mime)
{
    if ($mime !== 'image/jpeg' && $mime !== 'image/jpg') {
        return $im;
    }
    if (!function_exists('exif_read_data')) {
        return $im;
    }
    $exif = @exif_read_data($path);
    $ori = (int)($exif['Orientation'] ?? 1);
    $rotated = match ($ori) {
        3 => imagerotate($im, 180, 0),
        6 => imagerotate($im, -90, 0),
        8 => imagerotate($im, 90, 0),
        default => false,
    };
    if ($rotated) {
        imagedestroy($im);
        return $rotated;
    }
    return $im;
}
