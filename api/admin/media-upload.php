<?php
declare(strict_types=1);

/**
 * Upload de mídia (imagens/PDFs) para o CMS admin.
 * Salva em /assets/img/uploads/{folder}/YYYY/MM/
 * Registra em gcv_media.
 *
 * POST multipart:
 *   file (obrigatório)
 *   folder (opcional: revista|atrativos|guias|geral)
 *   alt (opcional)
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';

header('Content-Type: application/json; charset=utf-8');

$admin = require_admin();
gcv_cms_ensure_schema();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
    exit;
}

if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Arquivo obrigatório']);
    exit;
}

$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Falha no upload']);
    exit;
}

$maxBytes = 8 * 1024 * 1024; // 8MB
if (($file['size'] ?? 0) > $maxBytes) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Arquivo maior que 8MB']);
    exit;
}

$folder = preg_replace('/[^a-z0-9_-]/i', '', (string)($_POST['folder'] ?? 'geral')) ?: 'geral';
$allowedFolders = ['revista', 'atrativos', 'guias', 'geral', 'excursões', 'excursoes'];
if (!in_array($folder, $allowedFolders, true)) $folder = 'geral';
if ($folder === 'excursões') $folder = 'excursoes';

$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']) ?: ($file['type'] ?? 'application/octet-stream');
$allowed = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
    'application/pdf' => 'pdf',
];
if (!isset($allowed[$mime])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Tipo não permitido (use JPG, PNG, WEBP, GIF ou PDF)']);
    exit;
}

$ext = $allowed[$mime];
$ym = date('Y/m');
$root = gcv_cms_uploads_root();
$dir = $root . '/' . $folder . '/' . $ym;
if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Não foi possível criar pasta de upload']);
    exit;
}

$name = bin2hex(random_bytes(8)) . '-' . time() . '.' . $ext;
$abs = $dir . '/' . $name;
if (!move_uploaded_file($file['tmp_name'], $abs)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Falha ao salvar arquivo']);
    exit;
}

$rel = 'assets/img/uploads/' . $folder . '/' . $ym . '/' . $name;
$url = gcv_cms_public_url($rel);
$alt = trim((string)($_POST['alt'] ?? ''));
$width = null;
$height = null;
if (str_starts_with($mime, 'image/')) {
    $size = @getimagesize($abs);
    if (is_array($size)) {
        $width = (int)$size[0];
        $height = (int)$size[1];
    }
}

$stmt = db()->prepare(
    'INSERT INTO gcv_media (path, url, mime, bytes, width, height, alt_text, folder, uploaded_by)
     VALUES (?,?,?,?,?,?,?,?,?)'
);
$stmt->execute([
    $rel,
    $url,
    $mime,
    (int)$file['size'],
    $width,
    $height,
    $alt !== '' ? $alt : null,
    $folder,
    (int)$admin['id'],
]);

$id = (int)db()->lastInsertId();

echo json_encode([
    'ok' => true,
    'data' => [
        'id' => $id,
        'url' => $url,
        'path' => $rel,
        'mime' => $mime,
        'bytes' => (int)$file['size'],
        'width' => $width,
        'height' => $height,
        'folder' => $folder,
        'alt' => $alt,
    ],
]);
