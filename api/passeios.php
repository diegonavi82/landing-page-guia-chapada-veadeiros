<?php
declare(strict_types=1);

/**
 * Preços públicos do site, sempre vindos do Tarifário do admin.
 * GET ?slug=<atrativo>  dados do widget "Meu roteiro" na página do atrativo
 * GET                   catálogo da página Passeios
 */

require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/cms_schema.php';
require_once __DIR__ . '/helpers/related_tours.php';
require_once __DIR__ . '/helpers/tarifarios.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
    exit;
}

try {
    gcv_cms_ensure_schema();
    $pdo = db();
    $slug = trim((string)($_GET['slug'] ?? ''));
    if ($slug === '') {
        echo json_encode(['ok' => true, 'data' => ['tours' => gcv_tarifario_public_catalog($pdo)]], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!preg_match('/^[a-z0-9-]{1,190}$/', $slug)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'slug inválido']);
        exit;
    }
    $data = gcv_tarifario_public_attraction($pdo, $slug);
    if (!$data) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Atrativo não encontrado']);
        exit;
    }
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('passeios.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Erro ao carregar os preços']);
}
