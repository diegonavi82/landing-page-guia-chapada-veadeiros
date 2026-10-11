<?php

declare(strict_types=1);

/**
 * Confere um cupom no carrinho público.
 * POST { codigo, pessoas, total_cents, locale }
 */

require_once __DIR__ . '/helpers/cupons.php';

header('Content-Type: application/json; charset=utf-8');
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid JSON']);
    exit;
}

$locale = in_array($data['locale'] ?? 'pt', ['pt', 'en', 'es'], true) ? (string) $data['locale'] : 'pt';
$pessoas = max(0, (int) ($data['pessoas'] ?? 0));
$total = max(0, (int) ($data['total_cents'] ?? 0));
$calc = gcv_cupom_aplicar_codigo((string) ($data['codigo'] ?? ''), $pessoas, $total, $locale);
if (empty($calc['ok'])) {
    echo json_encode([
        'ok' => false,
        'error' => $calc['error'] ?? 'invalid',
        'message' => $calc['message'] ?? '',
        'minimo_pessoas' => (int) ($calc['minimo_pessoas'] ?? 0),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$cupom = $calc['cupom'];
echo json_encode([
    'ok' => true,
    'codigo' => $cupom['codigo'],
    'tipo' => $cupom['tipo'],
    'modo' => $cupom['modo'],
    'valor' => (int) $cupom['valor'],
    'minimo_pessoas' => (int) $cupom['minimo_pessoas'],
    'alcance' => $cupom['alcance'],
    'desconto_cents' => (int) $calc['desconto_cents'],
    'total_cents' => $total,
    'pessoas' => $pessoas,
], JSON_UNESCAPED_UNICODE);
