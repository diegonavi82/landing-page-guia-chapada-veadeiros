<?php
/**
 * Cadastra/atualiza o guia Diego Navi (admin logado).
 * Abrir: /api/admin/seed-diego-guide.php
 */
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/guides_seed.php';

header('Content-Type: application/json; charset=utf-8');

$admin = require_admin();

try {
    $result = gcv_seed_diego_navi_guide();
    echo json_encode([
        'ok' => true,
        'data' => $result,
        'message' => ($result['created'] ? 'Guia criado: ' : 'Guia atualizado: ')
            . $result['name'] . ' (' . $result['email'] . '). Já aparece em Excursões → Guia.',
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
