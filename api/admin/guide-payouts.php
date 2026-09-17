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
require_once __DIR__ . '/../helpers/marketplace/guide_financial_service.php';
require_once __DIR__ . '/../helpers/marketplace_schema.php';

header('Content-Type: application/json; charset=utf-8');

$admin = require_admin();
gcv_ensure_guide_payout_schema();
gcv_marketplace_ensure_schema();

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
        'SELECT u.id AS user_id, u.name, u.email, g.full_name, g.nickname,
                g.pix_key, g.pix_key_type, g.pix_holder_name
         FROM gcv_users u
         JOIN gcv_guides g ON g.user_id = u.id
         WHERE u.status = \'active\'
           AND g.pix_verified_at IS NOT NULL
           AND (u.role = \'guide\' OR EXISTS (
                SELECT 1 FROM gcv_user_roles r WHERE r.user_id = u.id AND r.role = \'guide\'
           ))
         ORDER BY COALESCE(NULLIF(g.full_name, \'\'), u.name) ASC'
    )->fetchAll();
    foreach ($eligible as &$gRow) {
        $fin = gcv_guide_financial_get((int)$gRow['user_id']);
        if ($fin && trim((string)($fin['pix_key'] ?? '')) !== '') {
            $gRow['pix_key'] = $fin['pix_key'];
            $gRow['pix_key_type'] = $fin['pix_key_type'] ?? $gRow['pix_key_type'];
            $gRow['pix_holder_name'] = $fin['pix_holder_name'] ?? $gRow['pix_holder_name'];
        }
        $full = trim((string)($gRow['full_name'] ?? ''));
        $gRow['name'] = $full !== '' ? $full : (string)($gRow['name'] ?? '');
    }
    unset($gRow);
    $eligible = array_values(array_filter($eligible, static function ($gRow) {
        return trim((string)($gRow['pix_key'] ?? '')) !== '';
    }));

    json_response(true, [
        'payouts' => $rows,
        'history' => gcv_admin_payout_history(),
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
        'SELECT u.id, u.name, u.email, u.status, g.full_name,
                g.pix_key, g.pix_key_type, g.pix_holder_name, g.pix_verified_at
         FROM gcv_users u
         JOIN gcv_guides g ON g.user_id = u.id
         WHERE u.id = ? AND u.status = \'active\'
           AND g.pix_verified_at IS NOT NULL
           AND (u.role = \'guide\' OR EXISTS (
                SELECT 1 FROM gcv_user_roles r WHERE r.user_id = u.id AND r.role = \'guide\'
           ))
         LIMIT 1'
    );
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $fin = gcv_guide_financial_get($userId);
    if ($fin && trim((string)($fin['pix_key'] ?? '')) !== '') {
        $row['pix_key'] = $fin['pix_key'];
        $row['pix_key_type'] = $fin['pix_key_type'] ?? $row['pix_key_type'];
        $row['pix_holder_name'] = $fin['pix_holder_name'] ?? $row['pix_holder_name'];
    }
    if (trim((string)($row['pix_key'] ?? '')) === '') {
        return null;
    }
    $full = trim((string)($row['full_name'] ?? ''));
    if ($full !== '') {
        $row['name'] = $full;
    }
    return $row;
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_admin_payout_history(): array
{
    $history = [];

    try {
        $manual = db()->query(
            'SELECT p.id, p.amount_cents, p.pix_key_snapshot AS pix_key, p.status,
                    p.paid_at, p.created_at, p.description,
                    COALESCE(NULLIF(g.full_name, \'\'), u.name) AS guide_name
             FROM gcv_guide_payouts p
             JOIN gcv_users u ON u.id = p.guide_user_id
             LEFT JOIN gcv_guides g ON g.user_id = p.guide_user_id
             WHERE p.status NOT IN (\'draft\', \'cancelled\')
             ORDER BY COALESCE(p.paid_at, p.created_at) DESC
             LIMIT 200'
        )->fetchAll() ?: [];
        foreach ($manual as $row) {
            $history[] = gcv_admin_payout_history_row($row, 'manual', 'Manual');
        }
    } catch (Throwable $e) {
        error_log('payout history manual: ' . $e->getMessage());
    }

    try {
        $plat = db()->query(
            'SELECT sp.id, sp.amount_cents, sp.pix_key, sp.status,
                    sp.paid_at, sp.created_at, sp.sale_id,
                    COALESCE(NULLIF(g.full_name, \'\'), u.name) AS guide_name
             FROM gcv_sale_payouts sp
             JOIN gcv_users u ON u.id = sp.guide_user_id
             LEFT JOIN gcv_guides g ON g.user_id = sp.guide_user_id
             WHERE sp.deleted_at IS NULL
             ORDER BY COALESCE(sp.paid_at, sp.created_at) DESC
             LIMIT 200'
        )->fetchAll() ?: [];
        foreach ($plat as $row) {
            $item = gcv_admin_payout_history_row($row, 'platform', 'Plataforma');
            if (!empty($row['sale_id'])) {
                $item['note'] = 'Venda #' . (int)$row['sale_id'];
            }
            $history[] = $item;
        }
    } catch (Throwable $e) {
        error_log('payout history platform: ' . $e->getMessage());
    }

    usort($history, static function ($a, $b) {
        return strcmp((string)($b['when'] ?? ''), (string)($a['when'] ?? ''));
    });
    return array_slice($history, 0, 200);
}

/**
 * @param array<string,mixed> $row
 * @return array<string,mixed>
 */
function gcv_admin_payout_history_row(array $row, string $origin, string $originLabel): array
{
    $status = (string)($row['status'] ?? '');
    return [
        'id' => $origin . '-' . (int)($row['id'] ?? 0),
        'origin' => $origin,
        'origin_label' => $originLabel,
        'guide_name' => (string)($row['guide_name'] ?? ''),
        'amount_cents' => (int)($row['amount_cents'] ?? 0),
        'pix_key' => (string)($row['pix_key'] ?? ''),
        'status' => $status,
        'status_label' => gcv_admin_payout_status_label($status),
        'when' => (string)($row['paid_at'] ?: $row['created_at'] ?: ''),
        'note' => (string)($row['description'] ?? ''),
    ];
}

function gcv_admin_payout_status_label(string $status): string
{
    $map = [
        'paid' => 'Pago',
        'PAYOUT_PAID' => 'Pago',
        'processing' => 'Enviando',
        'queued' => 'Na fila',
        'PAYOUT_PENDING' => 'Agendado',
        'PAYOUT_REVIEW' => 'Em análise',
        'failed' => 'Falhou',
        'PAYOUT_BLOCKED' => 'Bloqueado',
        'cancelled' => 'Cancelado',
        'draft' => 'Rascunho',
    ];
    return $map[$status] ?? $status;
}
