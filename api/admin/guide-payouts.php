<?php

declare(strict_types=1);

/**
 * Admin — pagamentos PIX a guias.
 *
 * REGRAS DE SEGURANÇA:
 * 1. Somente require_admin()
 * 2. Destino SOMENTE chave PIX cadastrada + verificada + guia active
 * 3. Snapshot da chave no momento do pagamento (não aceita chave livre no body)
 * 4. Confirmação em 2 passos (criar draft → confirmar/executar)
 * 5. Idempotência + rate limit + auditoria
 * 6. Valor mínimo R$ 1 / máximo configurável
 */

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/pix_key.php';
require_once __DIR__ . '/../helpers/guide_payout_schema.php';
require_once __DIR__ . '/../helpers/rate_limiter.php';
require_once __DIR__ . '/../helpers/sicoob_pix_pay.php';

header('Content-Type: application/json; charset=utf-8');

$admin = require_admin();
gcv_ensure_guide_payout_schema();

const GCV_PAYOUT_MAX_CENTS = 5000000; // R$ 50.000,00

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $status = trim((string)($_GET['status'] ?? ''));
    $sql =
        'SELECT p.*, u.name AS guide_name, u.email AS guide_email,
                a.name AS created_by_name
         FROM gcv_guide_payouts p
         JOIN gcv_users u ON u.id = p.guide_user_id
         JOIN gcv_users a ON a.id = p.created_by';
    $params = [];
    if ($status !== '' && in_array($status, ['draft', 'queued', 'processing', 'paid', 'failed', 'cancelled'], true)) {
        $sql .= ' WHERE p.status = ?';
        $params[] = $status;
    }
    $sql .= ' ORDER BY p.created_at DESC LIMIT 100';
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Guias elegíveis para pagamento
    $eligible = db()->query(
        'SELECT u.id AS user_id, u.name, u.email, g.pix_key, g.pix_key_type, g.pix_holder_name
         FROM gcv_users u
         JOIN gcv_guides g ON g.user_id = u.id
         WHERE u.role = \'guide\' AND u.status = \'active\'
           AND g.pix_key IS NOT NULL AND g.pix_key <> \'\'
           AND g.pix_verified_at IS NOT NULL
         ORDER BY u.name ASC'
    )->fetchAll();

    json_response(true, [
        'payouts' => $rows,
        'eligible_guides' => $eligible,
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

check_rate_limit('admin_guide_payouts', 20, 15);

$data = body_json();
$action = trim((string)($data['action'] ?? 'create'));

if ($action === 'create') {
    $guideUserId = (int)($data['guide_user_id'] ?? 0);
    $amountReais = (float)($data['amount'] ?? 0);
    $description = sanitize_text((string)($data['description'] ?? ''), 200);

    if ($guideUserId <= 0) {
        json_response(false, null, 'guide_user_id obrigatório', 422);
    }
    if (!is_finite($amountReais) || $amountReais < 1) {
        json_response(false, null, 'Valor mínimo: R$ 1,00', 422);
    }
    $amountCents = (int)round($amountReais * 100);
    if ($amountCents > GCV_PAYOUT_MAX_CENTS) {
        json_response(false, null, 'Valor máximo: R$ 50.000,00', 422);
    }

    // REGRA CENTRAL: só guia ativo com PIX verificado
    $guide = gcv_payout_load_eligible_guide($guideUserId);
    if (!$guide) {
        json_response(
            false,
            null,
            'Pagamento bloqueado: guia precisa estar ATIVO com chave PIX cadastrada e VERIFICADA pelo admin. Chaves avulsas não são aceitas.',
            403
        );
    }

    // Rejeita qualquer tentativa de enviar chave no body
    if (isset($data['pix_key']) || isset($data['chave']) || isset($data['pixKey'])) {
        gcv_payout_audit(null, (int)$admin['id'], 'payout_rejected_free_key', 'guide_user_id=' . $guideUserId);
        json_response(false, null, 'Não é permitido informar chave PIX manualmente. Use apenas guias cadastrados.', 403);
    }

    $idem = bin2hex(random_bytes(16));
    db()->prepare(
        'INSERT INTO gcv_guide_payouts
         (guide_user_id, amount_cents, pix_key_snapshot, pix_key_type, description, status, idempotency_key, created_by)
         VALUES (?,?,?,?,?,\'draft\',?,?)'
    )->execute([
        $guideUserId,
        $amountCents,
        $guide['pix_key'],
        $guide['pix_key_type'],
        $description !== '' ? $description : ('Pagamento guia ' . $guide['name']),
        $idem,
        (int)$admin['id'],
    ]);
    $payoutId = (int)db()->lastInsertId();
    gcv_payout_audit($payoutId, (int)$admin['id'], 'payout_created', 'amount_cents=' . $amountCents);

    json_response(true, [
        'payout_id' => $payoutId,
        'status' => 'draft',
        'message' => 'Rascunho criado. Confirme o pagamento para enviar o PIX.',
        'guide_name' => $guide['name'],
        'pix_key' => $guide['pix_key'],
        'amount_cents' => $amountCents,
    ]);
}

if ($action === 'confirm') {
    $payoutId = (int)($data['payout_id'] ?? 0);
    $confirmText = trim((string)($data['confirm_text'] ?? ''));
    if ($payoutId <= 0) {
        json_response(false, null, 'payout_id obrigatório', 422);
    }
    // Confirmação explícita (anti-clique acidental)
    if (strcasecmp($confirmText, 'PAGAR') !== 0) {
        json_response(false, null, 'Digite PAGAR para confirmar o envio do PIX', 422);
    }

    $pdo = db();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare('SELECT * FROM gcv_guide_payouts WHERE id = ? FOR UPDATE');
        $stmt->execute([$payoutId]);
        $payout = $stmt->fetch();
        if (!$payout) {
            $pdo->rollBack();
            json_response(false, null, 'Pagamento não encontrado', 404);
        }
        if (!in_array($payout['status'], ['draft', 'failed'], true)) {
            $pdo->rollBack();
            json_response(false, null, 'Status não permite confirmação: ' . $payout['status'], 409);
        }

        // Revalida whitelist no momento do pagamento
        $guide = gcv_payout_load_eligible_guide((int)$payout['guide_user_id']);
        if (!$guide) {
            $pdo->rollBack();
            json_response(false, null, 'Guia não está mais elegível (ativo + PIX verificado)', 403);
        }
        if (!gcv_pix_keys_equal((string)$payout['pix_key_snapshot'], (string)$guide['pix_key'])) {
            $pdo->rollBack();
            json_response(
                false,
                null,
                'A chave PIX do guia mudou desde o rascunho. Cancele e crie um novo pagamento.',
                409
            );
        }

        $pdo->prepare(
            'UPDATE gcv_guide_payouts SET status = \'processing\', confirmed_by = ?, confirmed_at = NOW(),
             pix_key_snapshot = ?, pix_key_type = ?, error_message = NULL WHERE id = ?'
        )->execute([
            (int)$admin['id'],
            $guide['pix_key'],
            $guide['pix_key_type'],
            $payoutId,
        ]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_response(false, null, 'Erro ao confirmar: ' . $e->getMessage(), 500);
    }

    // Recarrega após commit (estado processing)
    $reload = db()->prepare('SELECT * FROM gcv_guide_payouts WHERE id = ?');
    $reload->execute([$payoutId]);
    $payout = $reload->fetch();
    if (!$payout) {
        json_response(false, null, 'Pagamento sumiu após confirmação', 500);
    }
    $guide = gcv_payout_load_eligible_guide((int)$payout['guide_user_id']);
    if (!$guide) {
        db()->prepare(
            'UPDATE gcv_guide_payouts SET status = \'failed\', error_message = ? WHERE id = ?'
        )->execute(['Guia deixou de ser elegível durante o envio', $payoutId]);
        json_response(false, null, 'Guia não elegível no momento do envio', 403);
    }

    gcv_payout_audit($payoutId, (int)$admin['id'], 'payout_confirm_start', null);

    $result = gcv_sicoob_send_pix_payment(
        (string)$guide['pix_key'],
        (string)$guide['pix_key_type'],
        (int)$payout['amount_cents'],
        (string)$payout['description'],
        (string)$payout['idempotency_key']
    );

    if ($result['ok']) {
        db()->prepare(
            'UPDATE gcv_guide_payouts SET status = \'paid\', paid_at = NOW(),
             sicoob_end_to_end = ?, sicoob_response = ?, error_message = NULL WHERE id = ?'
        )->execute([
            $result['endToEndId'] ?? null,
            json_encode($result['raw'] ?? [], JSON_UNESCAPED_UNICODE),
            $payoutId,
        ]);
        gcv_payout_audit($payoutId, (int)$admin['id'], 'payout_paid', (string)($result['endToEndId'] ?? ''));
        json_response(true, [
            'payout_id' => $payoutId,
            'status' => 'paid',
            'endToEndId' => $result['endToEndId'] ?? null,
            'message' => 'PIX enviado com sucesso',
        ]);
    }

    db()->prepare(
        'UPDATE gcv_guide_payouts SET status = \'failed\', error_message = ?, sicoob_response = ? WHERE id = ?'
    )->execute([
        mb_substr((string)($result['error'] ?? 'Falha desconhecida'), 0, 500),
        json_encode($result['raw'] ?? [], JSON_UNESCAPED_UNICODE),
        $payoutId,
    ]);
    gcv_payout_audit($payoutId, (int)$admin['id'], 'payout_failed', (string)($result['error'] ?? ''));
    json_response(false, [
        'payout_id' => $payoutId,
        'status' => 'failed',
    ], (string)($result['error'] ?? 'Falha ao enviar PIX'), 502);
}

if ($action === 'cancel') {
    $payoutId = (int)($data['payout_id'] ?? 0);
    if ($payoutId <= 0) {
        json_response(false, null, 'payout_id obrigatório', 422);
    }
    $stmt = db()->prepare('SELECT id, status FROM gcv_guide_payouts WHERE id = ?');
    $stmt->execute([$payoutId]);
    $payout = $stmt->fetch();
    if (!$payout) {
        json_response(false, null, 'Não encontrado', 404);
    }
    if (!in_array($payout['status'], ['draft', 'failed'], true)) {
        json_response(false, null, 'Só é possível cancelar rascunho ou falha', 409);
    }
    db()->prepare('UPDATE gcv_guide_payouts SET status = \'cancelled\' WHERE id = ?')->execute([$payoutId]);
    gcv_payout_audit($payoutId, (int)$admin['id'], 'payout_cancelled', null);
    json_response(true, ['payout_id' => $payoutId, 'status' => 'cancelled']);
}

json_response(false, null, 'Ação inválida. Use create | confirm | cancel', 422);

/** @return array<string, mixed>|null */
function gcv_payout_load_eligible_guide(int $userId): ?array
{
    $stmt = db()->prepare(
        'SELECT u.id, u.name, u.email, u.status,
                g.pix_key, g.pix_key_type, g.pix_holder_name, g.pix_verified_at
         FROM gcv_users u
         JOIN gcv_guides g ON g.user_id = u.id
         WHERE u.id = ? AND u.role = \'guide\' AND u.status = \'active\'
           AND g.pix_key IS NOT NULL AND TRIM(g.pix_key) <> \'\'
           AND g.pix_verified_at IS NOT NULL
         LIMIT 1'
    );
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row ?: null;
}
