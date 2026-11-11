<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/marketplace/transfer_service.php';

header('Content-Type: application/json; charset=utf-8');

$user = require_auth();
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_response(false, null, 'Método não permitido', 405);
}

gcv_marketplace_ensure_schema();
$lang = strtolower(substr((string)($user['lang'] ?? 'pt'), 0, 2));
if (!in_array($lang, ['pt', 'en', 'es'], true)) {
    $lang = 'pt';
}
$sales = gcv_transfer_list_client_sales($user);
json_response(true, [
    'sales' => $sales,
    'type_heading' => gcv_sale_tipo_heading($lang),
]);
