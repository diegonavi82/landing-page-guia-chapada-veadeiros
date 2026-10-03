<?php
declare(strict_types=1);

/**
 * Menu TARIFÁRIO do admin.
 *
 * GET                                   visão geral: tarifários, atrativos, passeios com 2+ atrativos
 * POST   {nome, quorum, cidades}        cria tarifário
 * PUT    {id, nome, quorum, cidades}    salva preços
 * PUT    {action:"link", attraction_id|passeio_id, tarifario_id|null}   liga ou desliga
 * PUT    {action:"combo", attraction_ids:[...], tarifario_id?}           cria passeio do mesmo dia
 * PUT    {action:"duracao", attraction_id|passeio_id, duracao:{cidade:minutos}}  horas por cidade de saída
 * DELETE {id}                           apaga tarifário (quem usava fica fora da venda)
 * DELETE {passeio_id}                   apaga passeio do mesmo dia
 */

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/related_tours.php';
require_once __DIR__ . '/../helpers/tarifarios.php';

header('Content-Type: application/json; charset=utf-8');
require_admin();
gcv_cms_ensure_schema();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = $method === 'GET' ? [] : gcv_cms_json_body();
$pdo = db();

function gcv_tarifario_reply(PDO $pdo, array $extra = []): void
{
    echo json_encode(['ok' => true, 'data' => array_merge(gcv_tarifario_admin_overview($pdo), $extra)], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    if ($method === 'GET') {
        gcv_tarifario_reply($pdo);
    }
    if ($method === 'POST') {
        $id = gcv_tarifario_save($pdo, null, $body);
        gcv_tarifario_reply($pdo, ['saved_id' => $id]);
    }
    if ($method === 'PUT') {
        $action = (string)($body['action'] ?? '');
        if ($action === 'link') {
            $tid = isset($body['tarifario_id']) && $body['tarifario_id'] !== '' && $body['tarifario_id'] !== null ? (int)$body['tarifario_id'] : null;
            if (!empty($body['attraction_id'])) {
                gcv_tarifario_link_attraction($pdo, (int)$body['attraction_id'], $tid);
            } elseif (!empty($body['passeio_id'])) {
                gcv_tarifario_link_tour($pdo, (int)$body['passeio_id'], $tid);
            } else {
                throw new InvalidArgumentException('Informe o atrativo ou o passeio.');
            }
            gcv_tarifario_reply($pdo);
        }
        if ($action === 'oferta') {
            gcv_passeio_oferta_save($pdo, $body);
            gcv_tarifario_reply($pdo);
        }
        if ($action === 'duracao') {
            $duracao = is_array($body['duracao'] ?? null) ? $body['duracao'] : [];
            if (!empty($body['attraction_id'])) {
                gcv_duracao_save($pdo, 'atrativo', (int)$body['attraction_id'], $duracao);
            } elseif (!empty($body['passeio_id'])) {
                gcv_duracao_save($pdo, 'passeio', (int)$body['passeio_id'], $duracao);
            } else {
                throw new InvalidArgumentException('Informe o atrativo ou o passeio.');
            }
            gcv_tarifario_reply($pdo);
        }
        if ($action === 'combo') {
            $ids = array_map('intval', (array)($body['attraction_ids'] ?? []));
            $tour = gcv_related_tour_save($pdo, $ids);
            if (!empty($body['tarifario_id']) && !empty($tour['id'])) {
                gcv_tarifario_link_tour($pdo, (int)$tour['id'], (int)$body['tarifario_id']);
            }
            gcv_tarifario_reply($pdo, ['saved_passeio_id' => $tour['id'] ?? null]);
        }
        $id = (int)($body['id'] ?? 0);
        if ($id <= 0) {
            throw new InvalidArgumentException('id obrigatório');
        }
        gcv_tarifario_save($pdo, $id, $body);
        gcv_tarifario_reply($pdo, ['saved_id' => $id]);
    }
    if ($method === 'DELETE') {
        if (!empty($body['passeio_id'])) {
            gcv_related_tour_delete($pdo, (int)$body['passeio_id']);
            gcv_tarifario_reply($pdo);
        }
        $id = (int)($body['id'] ?? $_GET['id'] ?? 0);
        if ($id <= 0) {
            throw new InvalidArgumentException('id obrigatório');
        }
        gcv_tarifario_delete($pdo, $id);
        gcv_tarifario_reply($pdo);
    }
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('tarifarios: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Erro ao salvar o tarifário.'], JSON_UNESCAPED_UNICODE);
}
