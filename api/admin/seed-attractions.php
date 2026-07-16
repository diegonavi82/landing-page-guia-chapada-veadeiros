<?php
/**
 * Importa os atrativos atuais do site para o CMS (admin logado).
 * GET  → importa se faltarem
 * Abrir: /api/admin/seed-attractions.php
 */
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/attractions_seed.php';

header('Content-Type: application/json; charset=utf-8');

$admin = require_admin();

try {
    $result = gcv_seed_attractions_from_json();
    $count = (int)db()->query('SELECT COUNT(*) FROM gcv_attractions')->fetchColumn();
    echo json_encode([
        'ok' => true,
        'data' => array_merge($result, [
            'in_db' => $count,
            'admin' => $admin['email'] ?? '',
        ]),
        'message' => $result['imported'] > 0
            ? ('Importados ' . $result['imported'] . ' atrativos. Agora aparecem em Excursões.')
            : ('Nada novo: ' . $result['skipped'] . ' já existiam. Total no banco: ' . $count),
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
