<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../marketplace_schema.php';
require_once __DIR__ . '/../settings.php';
require_once __DIR__ . '/constants.php';
require_once __DIR__ . '/audit_service.php';

/**
 * Repasse ao guia — versão atual: manual.
 * Arquitetura preparada para Sicoob automático (NÃO executar ainda).
 */

/**
 * @param array<string,mixed> $data
 * @return array<string,mixed>
 */
function gcv_payout_register_manual(array $data, int $adminId): array
{
    gcv_marketplace_ensure_schema();
    $saleId = (int)($data['sale_id'] ?? 0);
    if ($saleId <= 0) {
        throw new InvalidArgumentException('sale_id obrigatório');
    }

    $pdo = db();
    $saleStmt = $pdo->prepare('SELECT * FROM gcv_sales WHERE id = ? AND deleted_at IS NULL');
    $saleStmt->execute([$saleId]);
    $sale = $saleStmt->fetch(PDO::FETCH_ASSOC);
    if (!$sale) {
        throw new RuntimeException('Venda não encontrada');
    }
    if (($sale['sale_status'] ?? '') !== GcvSaleStatus::PAID) {
        throw new RuntimeException('Só é possível repassar vendas com pagamento confirmado');
    }
    if (($sale['payout_status'] ?? '') === GcvPayoutStatus::PAID) {
        throw new RuntimeException('Repasse já realizado para esta venda');
    }
    if (($sale['payout_status'] ?? '') === GcvPayoutStatus::BLOCKED) {
        throw new RuntimeException('Repasse bloqueado para esta venda');
    }

    $guideUserId = (int)($sale['guide_user_id'] ?? 0);
    $fin = gcv_payout_load_guide_financial($guideUserId);
    if (!$fin) {
        throw new RuntimeException('Guia sem perfil financeiro / chave PIX cadastrada. Repasse bloqueado.');
    }

    $amountCents = isset($data['amount_cents'])
        ? (int)$data['amount_cents']
        : (int)round(((float)($data['amount'] ?? 0)) * 100);
    if ($amountCents <= 0) {
        $amountCents = (int)$sale['guide_amount_cents'];
    }

    $paidAtRaw = trim((string)($data['paid_at'] ?? ''));
    if ($paidAtRaw === '' && !empty($data['date']) && !empty($data['time'])) {
        $paidAtRaw = trim((string)$data['date']) . ' ' . trim((string)$data['time']);
    }
    if ($paidAtRaw === '') {
        $paidAtRaw = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d H:i:s');
    }
    try {
        $paidDt = new DateTimeImmutable($paidAtRaw, new DateTimeZone('America/Sao_Paulo'));
    } catch (Throwable $e) {
        throw new InvalidArgumentException('Data/hora do repasse inválida');
    }

    $pixKey = trim((string)($data['pix_key'] ?? $fin['pix_key']));
    $pixType = strtolower(trim((string)($data['pix_key_type'] ?? $fin['pix_key_type'])));
    if ($pixKey === '' || !in_array($pixType, ['cpf', 'cnpj', 'email', 'phone', 'random'], true)) {
        throw new InvalidArgumentException('Chave PIX inválida');
    }

    $txid = trim((string)($data['txid'] ?? '')) ?: null;
    $e2e = trim((string)($data['end_to_end_id'] ?? $data['endToEndId'] ?? '')) ?: null;
    $receipt = trim((string)($data['receipt_url'] ?? $data['comprovante'] ?? '')) ?: null;
    $notes = trim((string)($data['notes'] ?? $data['observacao'] ?? '')) ?: null;
    $status = strtoupper(trim((string)($data['status'] ?? GcvPayoutStatus::PAID)));
    if (!in_array($status, GcvPayoutStatus::all(), true)) {
        $status = GcvPayoutStatus::PAID;
    }

    $idem = trim((string)($data['idempotency_key'] ?? ''));
    if ($idem === '') {
        $idem = 'manual-sale-' . $saleId . '-' . ($e2e ?: ($txid ?: $paidDt->format('YmdHis')));
    }

    // Proteção contra PIX duplicado
    if ($e2e) {
        $dup = $pdo->prepare(
            'SELECT id FROM gcv_sale_payouts WHERE end_to_end_id = ? AND deleted_at IS NULL LIMIT 1'
        );
        $dup->execute([$e2e]);
        if ($dup->fetch()) {
            throw new RuntimeException('EndToEndId já registrado (idempotência)');
        }
    }
    $dupIdem = $pdo->prepare(
        'SELECT * FROM gcv_sale_payouts WHERE idempotency_key = ? AND deleted_at IS NULL LIMIT 1'
    );
    $dupIdem->execute([$idem]);
    $existingPayout = $dupIdem->fetch(PDO::FETCH_ASSOC);
    if ($existingPayout) {
        return $existingPayout;
    }

    $pdo->beginTransaction();
    try {
        $ins = $pdo->prepare(
            'INSERT INTO gcv_sale_payouts (
              sale_id, guide_user_id, amount_cents, paid_at, paid_date, paid_time,
              pix_key, pix_key_type, txid, end_to_end_id, receipt_url, notes, status,
              idempotency_key, responsible_user_id, auto_eligible, scheduled_payout_at, executed_via
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,\'manual\')'
        );
        $ins->execute([
            $saleId,
            $guideUserId,
            $amountCents,
            $paidDt->format('Y-m-d H:i:s'),
            $paidDt->format('Y-m-d'),
            $paidDt->format('H:i:s'),
            $pixKey,
            $pixType,
            $txid,
            $e2e,
            $receipt,
            $notes,
            $status,
            $idem,
            $adminId,
            0,
            $sale['scheduled_payout_at'] ?? null,
        ]);
        $payoutId = (int)$pdo->lastInsertId();

        $pdo->prepare(
            'UPDATE gcv_sales SET payout_status = ?, updated_at = NOW() WHERE id = ?'
        )->execute([$status, $saleId]);

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        throw $e;
    }

    gcv_audit_log('sale_payout', $payoutId, 'register_manual', $adminId, null, null, [
        'sale_id' => $saleId,
        'amount_cents' => $amountCents,
        'status' => $status,
        'txid' => $txid,
        'end_to_end_id' => $e2e,
    ], GcvCreatedBy::ADMIN);

    $get = $pdo->prepare('SELECT * FROM gcv_sale_payouts WHERE id = ?');
    $get->execute([$payoutId]);
    return $get->fetch(PDO::FETCH_ASSOC) ?: [];
}

/** @return array<string,mixed>|null */
function gcv_payout_load_guide_financial(int $guideUserId): ?array
{
    if ($guideUserId <= 0) {
        return null;
    }
    gcv_marketplace_ensure_schema();

    $stmt = db()->prepare(
        'SELECT * FROM gcv_guide_financial
         WHERE guide_user_id = ? AND deleted_at IS NULL AND status IN (\'active\',\'pending_review\')
         LIMIT 1'
    );
    $stmt->execute([$guideUserId]);
    $fin = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($fin && trim((string)($fin['pix_key'] ?? '')) !== '') {
        return $fin;
    }

    // Fallback: perfil legado gcv_guides com PIX
    $g = db()->prepare(
        'SELECT user_id AS guide_user_id, COALESCE(full_name, pix_holder_name) AS legal_name,
                COALESCE(person_type, \'PF\') AS person_type, cpf, cnpj,
                pix_key, pix_key_type, COALESCE(pix_holder_name, full_name) AS pix_holder_name,
                bank_name, bank_agency, bank_account,
                CASE WHEN pix_verified_at IS NOT NULL THEN \'active\' ELSE \'pending_review\' END AS status
         FROM gcv_guides
         WHERE user_id = ? AND pix_key IS NOT NULL AND pix_key <> \'\'
         LIMIT 1'
    );
    $g->execute([$guideUserId]);
    $row = $g->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

/**
 * Validações para futuro repasse automático Sicoob (NÃO executa PIX).
 *
 * @return array{ok:bool,reasons:list<string>,scheduled_payout_at:?string}
 */
function gcv_payout_auto_eligibility(int $saleId): array
{
    gcv_marketplace_ensure_schema();
    $reasons = [];
    $stmt = db()->prepare('SELECT * FROM gcv_sales WHERE id = ? AND deleted_at IS NULL');
    $stmt->execute([$saleId]);
    $sale = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$sale) {
        return ['ok' => false, 'reasons' => ['sale_not_found'], 'scheduled_payout_at' => null];
    }

    if (($sale['sale_status'] ?? '') !== GcvSaleStatus::PAID) {
        $reasons[] = 'payment_not_confirmed';
    }
    if (in_array($sale['sale_status'] ?? '', [GcvSaleStatus::REFUNDED, GcvSaleStatus::DISPUTED, GcvSaleStatus::CANCELLED], true)) {
        $reasons[] = 'sale_blocked_status';
    }
    if (($sale['payout_status'] ?? '') === GcvPayoutStatus::PAID) {
        $reasons[] = 'payout_already_done';
    }
    if (($sale['payout_status'] ?? '') === GcvPayoutStatus::BLOCKED) {
        $reasons[] = 'payout_blocked';
    }

    $guideId = (int)($sale['guide_user_id'] ?? 0);
    $u = db()->prepare("SELECT id, status FROM gcv_users WHERE id = ?");
    $u->execute([$guideId]);
    $guideUser = $u->fetch(PDO::FETCH_ASSOC);
    if (!$guideUser || ($guideUser['status'] ?? '') !== 'active') {
        $reasons[] = 'guide_inactive';
    }

    $fin = gcv_payout_load_guide_financial($guideId);
    if (!$fin || trim((string)($fin['pix_key'] ?? '')) === '') {
        $reasons[] = 'invalid_pix_key';
    }

    $excId = (int)($sale['excursion_id'] ?? 0);
    if ($excId > 0) {
        $ex = db()->prepare('SELECT id, status, date_iso, departure_time, deleted_at FROM gcv_excursions WHERE id = ?');
        $ex->execute([$excId]);
        $excursion = $ex->fetch(PDO::FETCH_ASSOC);
        if (!$excursion || !empty($excursion['deleted_at'])) {
            $reasons[] = 'excursion_inactive';
        } elseif (in_array($excursion['status'] ?? '', ['cancelled', 'rejected'], true)) {
            $reasons[] = 'excursion_cancelled';
        } else {
            // excursão realizada = horário de início já passou
            $starts = ($sale['excursion_starts_at'] ?? null)
                ?: (($excursion['date_iso'] ?? '') . ' ' . ($excursion['departure_time'] ?? '00:00:00'));
            try {
                $startDt = new DateTimeImmutable((string)$starts, new DateTimeZone('America/Sao_Paulo'));
                $now = new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo'));
                if ($now < $startDt) {
                    $reasons[] = 'excursion_not_started';
                }
            } catch (Throwable $e) {
                $reasons[] = 'excursion_start_invalid';
            }
        }
    }

    $scheduled = $sale['scheduled_payout_at'] ?? null;
    if ($scheduled) {
        try {
            $schedDt = new DateTimeImmutable((string)$scheduled, new DateTimeZone('America/Sao_Paulo'));
            $now = new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo'));
            if ($now < $schedDt) {
                $reasons[] = 'payout_delay_not_elapsed';
            }
        } catch (Throwable $e) {
            // ignore
        }
    }

    // Reserva ativa (não cancelada/reembolsada)
    if (($sale['sale_status'] ?? '') === GcvSaleStatus::CANCELLED) {
        $reasons[] = 'reservation_inactive';
    }

    return [
        'ok' => $reasons === [],
        'reasons' => $reasons,
        'scheduled_payout_at' => $scheduled,
    ];
}

/**
 * Stub futuro — NÃO automatizar. Apenas documenta o ponto de extensão.
 *
 * @return array{executed:false,message:string,eligibility:array<string,mixed>}
 */
function gcv_payout_auto_execute_stub(int $saleId): array
{
    $elig = gcv_payout_auto_eligibility($saleId);
    return [
        'executed' => false,
        'message' => 'Repasse automático via API Sicoob ainda não habilitado. Use REGISTRAR REPASSE PIX manual.',
        'eligibility' => $elig,
    ];
}

function gcv_payout_compute_scheduled_at(string $excursionStartsAt): string
{
    $delay = (int)setting('payout_delay_hours', '6');
    if ($delay < 0) {
        $delay = 6;
    }
    $dt = new DateTimeImmutable($excursionStartsAt, new DateTimeZone('America/Sao_Paulo'));
    return $dt->modify('+' . $delay . ' hours')->format('Y-m-d H:i:s');
}
