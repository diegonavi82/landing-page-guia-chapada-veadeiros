<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../marketplace_schema.php';
require_once __DIR__ . '/../settings.php';
require_once __DIR__ . '/constants.php';
require_once __DIR__ . '/audit_service.php';
require_once __DIR__ . '/../sicoob_pix_pay.php';
require_once __DIR__ . '/../mailer.php';
require_once __DIR__ . '/../purchase_notify.php';

/**
 * Repasse ao guia: manual (admin) + automático via PIX Sicoob
 * após as 16h20 (horário de Brasília) do dia do passeio.
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

    if ($status === GcvPayoutStatus::PAID) {
        try {
            require_once dirname(__DIR__) . '/notify_ops.php';
            gcv_ops_notify_guide_payout($sale, true, '', $e2e);
        } catch (Throwable $e) {
            error_log('notify manual payout wa: ' . $e->getMessage());
        }
    }

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
 * Chave conferida pelo admin (gcv_guides.pix_verified_at) ou perfil financeiro ativo.
 *
 * @param array<string,mixed>|null $fin
 */
function gcv_guide_pix_is_verified(int $guideUserId, ?array $fin = null): bool
{
    if ($guideUserId <= 0) {
        return false;
    }
    $fin = $fin ?? gcv_payout_load_guide_financial($guideUserId);
    if ($fin) {
        $st = strtolower(trim((string)($fin['status'] ?? '')));
        if ($st === 'active' || !empty($fin['verified_at'])) {
            return true;
        }
    }
    try {
        $stmt = db()->prepare(
            'SELECT pix_verified_at FROM gcv_guides WHERE user_id = ? LIMIT 1'
        );
        $stmt->execute([$guideUserId]);
        $at = $stmt->fetchColumn();
        return $at !== false && $at !== null && $at !== '';
    } catch (Throwable $e) {
        return false;
    }
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
    } elseif (!gcv_guide_pix_is_verified($guideId, $fin)) {
        $reasons[] = 'pix_not_verified';
    }

    $excId = (int)($sale['excursion_id'] ?? 0);
    $excursion = null;
    if ($excId > 0) {
        $ex = db()->prepare('SELECT id, status, date_iso, departure_time, deleted_at FROM gcv_excursions WHERE id = ?');
        $ex->execute([$excId]);
        $excursion = $ex->fetch(PDO::FETCH_ASSOC);
        if (!$excursion || !empty($excursion['deleted_at'])) {
            $reasons[] = 'excursion_inactive';
        } elseif (in_array($excursion['status'] ?? '', ['cancelled', 'rejected'], true)) {
            $reasons[] = 'excursion_cancelled';
        }
    }

    $scheduled = $sale['scheduled_payout_at'] ?? null;
    $tz = new DateTimeZone('America/Sao_Paulo');
    $now = new DateTimeImmutable('now', $tz);
    $payAt = null;
    if ($scheduled) {
        try {
            $payAt = new DateTimeImmutable((string)$scheduled, $tz);
        } catch (Throwable $e) {
            $payAt = null;
        }
    }
    if (!$payAt) {
        $dateIso = '';
        if (!empty($sale['excursion_starts_at'])) {
            $dateIso = substr((string)$sale['excursion_starts_at'], 0, 10);
        } elseif (is_array($excursion) && !empty($excursion['date_iso'])) {
            $dateIso = (string)$excursion['date_iso'];
        }
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateIso)) {
            $hm = gcv_payout_after_hm();
            $payAt = new DateTimeImmutable($dateIso . ' ' . sprintf('%02d:%02d:00', $hm[0], $hm[1]), $tz);
        }
    }
    if ($payAt && $now < $payAt) {
        $reasons[] = 'payout_before_time';
    }

    // Reserva ativa (não cancelada/reembolsada)
    if (($sale['sale_status'] ?? '') === GcvSaleStatus::CANCELLED) {
        $reasons[] = 'reservation_inactive';
    }

    return [
        'ok' => $reasons === [],
        'reasons' => $reasons,
        'scheduled_payout_at' => $payAt ? $payAt->format('Y-m-d H:i:s') : $scheduled,
    ];
}

function gcv_payout_system_actor_id(): int
{
    try {
        $id = (int)db()->query("SELECT id FROM gcv_users WHERE role = 'admin' ORDER BY id ASC LIMIT 1")->fetchColumn();
        return $id > 0 ? $id : 0;
    } catch (Throwable $e) {
        return 0;
    }
}

/**
 * Envia o PIX de uma venda elegível para a chave cadastrada do guia.
 *
 * @return array<string,mixed>
 */
function gcv_payout_auto_execute(int $saleId): array
{
    gcv_marketplace_ensure_schema();
    $elig = gcv_payout_auto_eligibility($saleId);
    if (!$elig['ok']) {
        return [
            'ok' => false,
            'executed' => false,
            'sale_id' => $saleId,
            'reasons' => $elig['reasons'],
            'message' => 'Venda ainda não elegível para PIX automático',
        ];
    }

    $pdo = db();
    $saleStmt = $pdo->prepare('SELECT * FROM gcv_sales WHERE id = ? AND deleted_at IS NULL');
    $saleStmt->execute([$saleId]);
    $sale = $saleStmt->fetch(PDO::FETCH_ASSOC);
    if (!$sale) {
        return ['ok' => false, 'executed' => false, 'sale_id' => $saleId, 'error' => 'sale_not_found'];
    }

    $att = strtolower(trim((string)($sale['attendance_status'] ?? 'pending')));
    if ($att === '' || $att === 'pending') {
        try {
            require_once dirname(__DIR__) . '/notify_ops.php';
            gcv_ops_apply_noshow($sale);
        } catch (Throwable $e) {
            error_log('payout noshow mark: ' . $e->getMessage());
        }
    }

    $guideUserId = (int)($sale['guide_user_id'] ?? 0);
    $fin = gcv_payout_load_guide_financial($guideUserId);
    if (!$fin) {
        gcv_payout_notify_failure($sale, 'missing_pix');
        return ['ok' => false, 'executed' => false, 'sale_id' => $saleId, 'error' => 'missing_pix'];
    }

    $amountCents = (int)($sale['guide_amount_cents'] ?? 0);
    if ($amountCents < 100) {
        gcv_payout_notify_failure($sale, 'amount_too_small');
        return ['ok' => false, 'executed' => false, 'sale_id' => $saleId, 'error' => 'amount_too_small'];
    }

    $idem = 'auto-sale-' . $saleId;
    $dup = $pdo->prepare(
        'SELECT * FROM gcv_sale_payouts WHERE idempotency_key = ? AND deleted_at IS NULL LIMIT 1'
    );
    $dup->execute([$idem]);
    $existing = $dup->fetch(PDO::FETCH_ASSOC);
    if ($existing) {
        if (($existing['status'] ?? '') === GcvPayoutStatus::PAID) {
            $pdo->prepare('UPDATE gcv_sales SET payout_status = ?, updated_at = NOW() WHERE id = ?')
                ->execute([GcvPayoutStatus::PAID, $saleId]);
            return [
                'ok' => true,
                'executed' => false,
                'sale_id' => $saleId,
                'already_paid' => true,
                'payout_id' => (int)$existing['id'],
                'endToEndId' => $existing['end_to_end_id'] ?? null,
            ];
        }
    }

    if (!gcv_sicoob_is_configured()) {
        gcv_payout_notify_failure($sale, 'sicoob_not_configured');
        return [
            'ok' => false,
            'executed' => false,
            'sale_id' => $saleId,
            'error' => 'sicoob_not_configured',
            'message' => 'Sicoob não configurado para envio de PIX',
        ];
    }

    $pixKey = trim((string)$fin['pix_key']);
    $pixType = strtolower(trim((string)($fin['pix_key_type'] ?? 'cpf')));
    $desc = 'Repasse GCV venda #' . $saleId;
    $rid = trim((string)($sale['reservation_id'] ?? ''));
    if ($rid !== '') {
        $desc .= ' ' . $rid;
    }

    $result = gcv_sicoob_send_pix_payment($pixKey, $pixType, $amountCents, $desc, $idem);
    $now = new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo'));
    $actorId = gcv_payout_system_actor_id();
    if ($actorId <= 0) {
        $actorId = $guideUserId;
    }

    if (empty($result['ok'])) {
        $err = (string)($result['error'] ?? 'pix_send_failed');
        error_log('gcv_payout_auto_execute fail sale=' . $saleId . ' ' . $err);
        gcv_payout_notify_failure($sale, $err);
        return [
            'ok' => false,
            'executed' => false,
            'sale_id' => $saleId,
            'error' => $err,
            'http' => $result['http'] ?? null,
        ];
    }

    $e2e = $result['endToEndId'] ?? null;
    $pdo->beginTransaction();
    try {
        $ins = $pdo->prepare(
            'INSERT INTO gcv_sale_payouts (
              sale_id, guide_user_id, amount_cents, paid_at, paid_date, paid_time,
              pix_key, pix_key_type, txid, end_to_end_id, receipt_url, notes, status,
              idempotency_key, responsible_user_id, auto_eligible, scheduled_payout_at,
              executed_via, sicoob_response
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $ins->execute([
            $saleId,
            $guideUserId,
            $amountCents,
            $now->format('Y-m-d H:i:s'),
            $now->format('Y-m-d'),
            $now->format('H:i:s'),
            $pixKey,
            $pixType,
            null,
            $e2e,
            null,
            'PIX automático Sicoob',
            GcvPayoutStatus::PAID,
            $idem,
            $actorId,
            1,
            $sale['scheduled_payout_at'] ?? null,
            'sicoob_api',
            json_encode($result['raw'] ?? [], JSON_UNESCAPED_UNICODE),
        ]);
        $payoutId = (int)$pdo->lastInsertId();
        $pdo->prepare('UPDATE gcv_sales SET payout_status = ?, updated_at = NOW() WHERE id = ?')
            ->execute([GcvPayoutStatus::PAID, $saleId]);
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('gcv_payout_auto_execute db: ' . $e->getMessage());
        return ['ok' => false, 'executed' => false, 'sale_id' => $saleId, 'error' => 'db_error'];
    }

    try {
        gcv_audit_log('sale_payout', $payoutId, 'auto_pix', $actorId, null, null, null, GcvCreatedBy::API, [
            'sale_id' => $saleId,
            'amount_cents' => $amountCents,
            'end_to_end_id' => $e2e,
        ]);
    } catch (Throwable $e) {
        // auditoria não bloqueia o PIX já enviado
    }

    try {
        $g = db()->prepare('SELECT email, name FROM gcv_users WHERE id = ? LIMIT 1');
        $g->execute([$guideUserId]);
        $guide = $g->fetch(PDO::FETCH_ASSOC) ?: [];
        $to = strtolower(trim((string)($guide['email'] ?? '')));
        if ($to !== '' && filter_var($to, FILTER_VALIDATE_EMAIL)) {
            mail_payment_released(
                $to,
                (string)($guide['name'] ?? $sale['guide_name'] ?? 'Guia'),
                (string)($sale['excursion_title'] ?? 'Passeio'),
                $amountCents
            );
        }
    } catch (Throwable $e) {
        error_log('mail_payment_released: ' . $e->getMessage());
    }

    try {
        require_once dirname(__DIR__) . '/notify_ops.php';
        gcv_ops_notify_guide_payout($sale, true, '', is_string($e2e) ? $e2e : null);
    } catch (Throwable $e) {
        error_log('notify payout ok wa: ' . $e->getMessage());
    }

    return [
        'ok' => true,
        'executed' => true,
        'sale_id' => $saleId,
        'payout_id' => $payoutId,
        'amount_cents' => $amountCents,
        'endToEndId' => $e2e,
        'message' => 'PIX enviado ao guia',
    ];
}

function gcv_payout_after_hm(): array
{
    $hour = (int)setting('payout_after_hour', '16');
    $min = (int)setting('payout_after_minute', '20');
    if ($hour < 0 || $hour > 23) {
        $hour = 16;
    }
    if ($min < 0 || $min > 59) {
        $min = 20;
    }
    return [$hour, $min];
}

function gcv_payout_after_hour(): int
{
    return gcv_payout_after_hm()[0];
}

function gcv_payout_after_label(): string
{
    [$hour, $min] = gcv_payout_after_hm();
    if ($min === 0) {
        return $hour . 'h';
    }
    return $hour . 'h' . str_pad((string)$min, 2, '0', STR_PAD_LEFT);
}

function gcv_payout_after_sql_time(): string
{
    [$hour, $min] = gcv_payout_after_hm();
    return sprintf('%02d:%02d:00', $hour, $min);
}

/**
 * @param array<string,mixed> $sale
 */
function gcv_payout_notify_failure(array $sale, string $error): void
{
    $saleId = (int)($sale['id'] ?? 0);
    if ($saleId <= 0) {
        return;
    }
    try {
        $chk = db()->prepare('SELECT payout_fail_notified_at FROM gcv_sales WHERE id = ? LIMIT 1');
        $chk->execute([$saleId]);
        $already = $chk->fetchColumn();
        if ($already) {
            return;
        }
    } catch (Throwable $e) {
        // coluna pode não existir ainda — segue o e-mail
    }
    try {
        mail_payout_pix_failed_admin(
            (string)($sale['excursion_title'] ?? ('Venda #' . $saleId)),
            $saleId,
            (string)($sale['guide_name'] ?? ''),
            (int)($sale['guide_amount_cents'] ?? 0),
            $error
        );
        db()->prepare('UPDATE gcv_sales SET payout_fail_notified_at = NOW() WHERE id = ?')->execute([$saleId]);
        try {
            require_once dirname(__DIR__) . '/notify_ops.php';
            gcv_ops_notify_guide_payout($sale, false, $error);
        } catch (Throwable $e) {
            error_log('notify payout fail wa: ' . $e->getMessage());
        }
    } catch (Throwable $e) {
        error_log('gcv_payout_notify_failure: ' . $e->getMessage());
    }
}

/**
 * @return array{processed:int,paid:int,skipped:int,failed:int,results:list<array<string,mixed>>}
 */
function gcv_payout_process_due(?int $guideUserId = null, int $limit = 15): array
{
    gcv_marketplace_ensure_schema();
    $limit = max(1, min(40, $limit));
    $sql =
        "SELECT id FROM gcv_sales
         WHERE deleted_at IS NULL
           AND sale_status = 'PAID'
           AND payout_status = 'PAYOUT_PENDING'";
    $params = [];
    if ($guideUserId !== null && $guideUserId > 0) {
        $sql .= ' AND guide_user_id = ?';
        $params[] = $guideUserId;
    }
    $sql .= ' ORDER BY scheduled_payout_at ASC, id ASC LIMIT ' . $limit;
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    $ids = $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];

    $results = [];
    $paid = 0;
    $skipped = 0;
    $failed = 0;
    foreach ($ids as $id) {
        $row = gcv_payout_auto_execute((int)$id);
        $results[] = $row;
        if (!empty($row['ok']) && !empty($row['executed'])) {
            $paid++;
        } elseif (!empty($row['ok'])) {
            $skipped++;
        } elseif (!empty($row['reasons'])) {
            $skipped++;
        } else {
            $failed++;
        }
    }

    return [
        'processed' => count($results),
        'paid' => $paid,
        'skipped' => $skipped,
        'failed' => $failed,
        'results' => $results,
    ];
}

/** @deprecated use gcv_payout_auto_execute */
function gcv_payout_auto_execute_stub(int $saleId): array
{
    return gcv_payout_auto_execute($saleId);
}

function gcv_payout_compute_scheduled_at(string $excursionStartsAt): string
{
    $tz = new DateTimeZone('America/Sao_Paulo');
    $dt = new DateTimeImmutable($excursionStartsAt, $tz);
    [$hour, $min] = gcv_payout_after_hm();
    return $dt->setTime($hour, $min, 0)->format('Y-m-d H:i:s');
}
