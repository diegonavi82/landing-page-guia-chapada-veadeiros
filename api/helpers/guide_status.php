<?php
declare(strict_types=1);

/**
 * Status da conta do guia: pending / active / inactive / suspended / cancelled.
 * Recusar = só cadastro novo (pending → suspended).
 * Cancelar = perfil já aprovado (→ cancelled).
 * Inativo = 90 dias sem publicar, ou ação manual do admin.
 */

function gcv_guide_account_statuses(): array
{
    return ['pending', 'active', 'inactive', 'suspended', 'cancelled'];
}

function gcv_guide_was_approved(array $row): bool
{
    if (!empty($row['approved_at'])) {
        return true;
    }
    return in_array((string)($row['status'] ?? ''), ['active', 'inactive', 'cancelled'], true);
}

function gcv_guide_account_label(string $status, bool $wasApproved = false): string
{
    if ($status === 'active') {
        return 'ATIVO';
    }
    if ($status === 'inactive') {
        return 'INATIVO';
    }
    if ($status === 'cancelled' || ($status === 'suspended' && $wasApproved)) {
        return 'CANCELADO';
    }
    if ($status === 'suspended') {
        return 'RECUSADO';
    }
    if ($status === 'pending') {
        return 'PENDENTE';
    }
    return strtoupper($status);
}

/**
 * Inativa guias ativos sem publicação (ou aprovação) há 90 dias.
 */
function gcv_guides_apply_inactivity(?PDO $pdo = null): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        $pdo = $pdo ?: db();
        $pdo->exec(
            "UPDATE gcv_users u
             INNER JOIN gcv_guides g ON g.user_id = u.id
             LEFT JOIN (
                SELECT guide_user_id, MAX(COALESCE(approved_at, created_at)) AS last_pub
                FROM gcv_excursions
                WHERE deleted_at IS NULL
                  AND guide_user_id IS NOT NULL
                  AND status IN ('published','soldout','pending_approval')
                GROUP BY guide_user_id
             ) x ON x.guide_user_id = u.id
             SET u.status = 'inactive'
             WHERE u.status = 'active'
               AND COALESCE(x.last_pub, g.approved_at) IS NOT NULL
               AND COALESCE(x.last_pub, g.approved_at) < DATE_SUB(NOW(), INTERVAL 90 DAY)"
        );
    } catch (Throwable $e) {
        error_log('gcv_guides_apply_inactivity: ' . $e->getMessage());
    }
}
