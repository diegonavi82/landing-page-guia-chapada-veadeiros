<?php
declare(strict_types=1);

/**
 * Menu TERAPIA do admin.
 * Terapia é uma experiência vendida por hora e não entra no site.
 */

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/experiencias.php';

header('Content-Type: application/json; charset=utf-8');
require_admin();
gcv_cms_ensure_schema();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = $method === 'GET' ? [] : gcv_cms_json_body();

try {
    $pdo = db();
    if ($method === 'GET') {
        json_response(true, [
            'terapias' => gcv_terapia_list($pdo),
            'nota' => 'Terapia é vendida por hora e não aparece no site. Só o passeio feito só de atrativo é publicado.',
        ]);
    }
    if ($method === 'POST') {
        json_response(true, gcv_terapia_save($pdo, null, $body));
    }
    if ($method === 'PUT') {
        $id = (int)($body['id'] ?? 0);
        if ($id <= 0) {
            json_response(false, null, 'id obrigatório', 400);
        }
        json_response(true, gcv_terapia_save($pdo, $id, $body));
    }
    json_response(false, null, 'Método não permitido', 405);
} catch (InvalidArgumentException $e) {
    json_response(false, null, $e->getMessage(), 400);
} catch (Throwable $e) {
    error_log('terapias.php: ' . $e->getMessage());
    json_response(false, null, 'Não foi possível salvar a terapia.', 500);
}
