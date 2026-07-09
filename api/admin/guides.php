<?php

declare(strict_types=1);

/**
 * Admin — listar / atualizar guias e chave PIX (whitelist de pagamento).
 * GET  → lista guias
 * PUT  → atualiza PIX / dados do guia (somente admin)
 */

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/pix_key.php';
require_once __DIR__ . '/../helpers/guide_payout_schema.php';
require_once __DIR__ . '/../helpers/rate_limiter.php';

header('Content-Type: application/json; charset=utf-8');

$admin = require_admin();
gcv_ensure_guide_payout_schema();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $status = trim((string)($_GET['status'] ?? ''));
    $sql =
        'SELECT u.id AS user_id, u.name, u.email, u.status, u.created_at,
                g.id AS guide_id, g.phone, g.cadastur, g.photo_url,
                g.pix_key, g.pix_key_type, g.pix_holder_name,
                g.pix_verified_at, g.pix_verified_by, g.approved_at
         FROM gcv_users u
         JOIN gcv_guides g ON g.user_id = u.id
         WHERE u.role = \'guide\'';
    $params = [];
    if (in_array($status, ['pending', 'active', 'suspended'], true)) {
        $sql .= ' AND u.status = ?';
        $params[] = $status;
    }
    $sql .= ' ORDER BY u.name ASC';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$row) {
        $row['pix_ready'] = !empty($row['pix_key'])
            && !empty($row['pix_verified_at'])
            && ($row['status'] ?? '') === 'active';
        // Não expor chave completa em listagens longas? Admin precisa ver — mascara parcial
        if (!empty($row['pix_key'])) {
            $row['pix_key_masked'] = gcv_admin_mask_pix((string)$row['pix_key']);
        }
    }
    unset($row);

    json_response(true, ['guides' => $rows]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    check_rate_limit('admin_guides_put', 30, 15);

    $data = body_json();
    $userId = (int)($data['user_id'] ?? 0);
    if ($userId <= 0) {
        json_response(false, null, 'user_id obrigatório', 422);
    }

    $stmt = db()->prepare(
        'SELECT u.id, u.name, u.email, u.status, u.role, g.pix_key
         FROM gcv_users u
         JOIN gcv_guides g ON g.user_id = u.id
         WHERE u.id = ? AND u.role = \'guide\''
    );
    $stmt->execute([$userId]);
    $guide = $stmt->fetch();
    if (!$guide) {
        json_response(false, null, 'Guia não encontrado', 404);
    }

    $fields = [];
    $params = [];

    if (array_key_exists('phone', $data)) {
        $fields[] = 'phone = ?';
        $params[] = sanitize_text((string)$data['phone'], 20);
    }
    if (array_key_exists('cadastur', $data)) {
        $fields[] = 'cadastur = ?';
        $params[] = sanitize_text((string)$data['cadastur'], 60);
    }
    if (array_key_exists('pix_holder_name', $data)) {
        $fields[] = 'pix_holder_name = ?';
        $params[] = sanitize_text((string)$data['pix_holder_name'], 120);
    }

    $pixChanged = false;
    if (array_key_exists('pix_key', $data)) {
        $rawPix = trim((string)$data['pix_key']);
        if ($rawPix === '') {
            $fields[] = 'pix_key = NULL';
            $fields[] = 'pix_key_type = NULL';
            $fields[] = 'pix_verified_at = NULL';
            $fields[] = 'pix_verified_by = NULL';
            $pixChanged = true;
        } else {
            $norm = gcv_pix_key_normalize($rawPix);
            if (!$norm['ok']) {
                json_response(false, null, $norm['error'] ?? 'Chave PIX inválida', 422);
            }
            // Unicidade: uma chave PIX só pode pertencer a um guia
            $dup = db()->prepare(
                'SELECT user_id FROM gcv_guides WHERE pix_key = ? AND user_id <> ? LIMIT 1'
            );
            $dup->execute([$norm['key'], $userId]);
            if ($dup->fetch()) {
                json_response(false, null, 'Esta chave PIX já está cadastrada em outro guia', 409);
            }
            $fields[] = 'pix_key = ?';
            $params[] = $norm['key'];
            $fields[] = 'pix_key_type = ?';
            $params[] = $norm['type'];
            // Nova chave exige re-verificação admin
            $fields[] = 'pix_verified_at = NULL';
            $fields[] = 'pix_verified_by = NULL';
            $pixChanged = true;
        }
    }

    $verify = !empty($data['verify_pix']);
    if ($verify) {
        $check = db()->prepare('SELECT pix_key, pix_key_type FROM gcv_guides WHERE user_id = ?');
        $check->execute([$userId]);
        $cur = $check->fetch();
        if (empty($cur['pix_key'])) {
            json_response(false, null, 'Cadastre a chave PIX antes de verificar', 422);
        }
        if (($guide['status'] ?? '') !== 'active') {
            json_response(false, null, 'Só é possível verificar PIX de guia ativo', 422);
        }
        $fields[] = 'pix_verified_at = NOW()';
        $fields[] = 'pix_verified_by = ?';
        $params[] = (int)$admin['id'];
    }

    if (empty($fields)) {
        json_response(false, null, 'Nenhum campo para atualizar', 422);
    }

    $params[] = $userId;
    db()->prepare('UPDATE gcv_guides SET ' . implode(', ', $fields) . ' WHERE user_id = ?')->execute($params);

    gcv_payout_audit(
        null,
        (int)$admin['id'],
        $verify ? 'guide_pix_verified' : ($pixChanged ? 'guide_pix_updated' : 'guide_updated'),
        'guide_user_id=' . $userId
    );

    $out = db()->prepare(
        'SELECT u.id AS user_id, u.name, u.email, u.status,
                g.phone, g.cadastur, g.pix_key, g.pix_key_type, g.pix_holder_name,
                g.pix_verified_at, g.pix_verified_by
         FROM gcv_users u
         JOIN gcv_guides g ON g.user_id = u.id
         WHERE u.id = ?'
    );
    $out->execute([$userId]);
    $row = $out->fetch() ?: [];
    $row['pix_ready'] = !empty($row['pix_key'])
        && !empty($row['pix_verified_at'])
        && ($row['status'] ?? '') === 'active';

    json_response(true, ['guide' => $row, 'message' => 'Guia atualizado']);
}

json_response(false, null, 'Método não permitido', 405);

function gcv_admin_mask_pix(string $key): string
{
    $len = mb_strlen($key);
    if ($len <= 6) {
        return str_repeat('*', $len);
    }
    return mb_substr($key, 0, 3) . str_repeat('*', max(3, $len - 6)) . mb_substr($key, -3);
}
