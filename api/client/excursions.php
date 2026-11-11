<?php

declare(strict_types=1);

/**
 * Clientes não propõem excursão. O menu e o formulário foram removidos.
 * O arquivo permanece para o endereço antigo responder sem criar rascunho.
 */

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_auth();
json_response(false, null, 'Clientes não propõem excursão.', 410);
