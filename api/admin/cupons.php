<?php

declare(strict_types=1);

/**
 * Menu CUPONS do admin.
 *
 * GET                         lista
 * POST   {codigo,...}         cria
 * PUT    {id,codigo,...}      atualiza
 * DELETE {id}                 apaga
 */

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/cupons.php';

header('Content-Type: application/json; charset=utf-8');
require_admin();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = $method === 'GET' ? [] : gcv_cms_json_body();
$pdo = db();

try {
    $lista = gcv_cupons_listar($pdo);
    if ($method === 'GET') {
        echo json_encode(['ok' => true, 'cupons' => $lista], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($method === 'DELETE') {
        $id = trim((string) ($body['id'] ?? ''));
        $next = array_values(array_filter($lista, static function (array $c) use ($id): bool {
            return $c['id'] !== $id;
        }));
        if (count($next) === count($lista)) {
            throw new RuntimeException('Cupom não encontrado.');
        }
        gcv_cupons_gravar($pdo, $next);
        echo json_encode(['ok' => true, 'cupons' => gcv_cupons_listar($pdo)], JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($method !== 'POST' && $method !== 'PUT') {
        http_response_code(405);
        echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
        exit;
    }

    $norm = gcv_cupom_normalizar($body);
    if ($norm['codigo'] === '') {
        throw new RuntimeException('Informe o código do cupom.');
    }
    foreach ($lista as $c) {
        if ($c['codigo'] === $norm['codigo'] && $c['id'] !== (string) ($body['id'] ?? '')) {
            throw new RuntimeException('Já existe um cupom com este código.');
        }
    }

    if ($method === 'POST') {
        $norm['id'] = 'c' . bin2hex(random_bytes(4));
        $lista[] = $norm;
    } else {
        $id = trim((string) ($body['id'] ?? ''));
        $hit = false;
        foreach ($lista as $i => $c) {
            if ($c['id'] === $id) {
                $norm['id'] = $id;
                $lista[$i] = $norm;
                $hit = true;
                break;
            }
        }
        if (!$hit) {
            throw new RuntimeException('Cupom não encontrado.');
        }
    }

    gcv_cupons_gravar($pdo, $lista);
    echo json_encode(['ok' => true, 'cupons' => gcv_cupons_listar($pdo)], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
