<?php

declare(strict_types=1);

/**
 * Registro de transações de pagamento (histórico + taxas + liquidação).
 *
 * Uma linha por reserva × plataforma (gcv_payment_transactions):
 *   bruto (o que o cliente pagou, em BRL), acréscimo da forma de pagamento,
 *   taxa da plataforma (real, vinda da API sempre que possível), líquido,
 *   quando fica disponível e se já chegou na conta Sicoob.
 *
 * Repasses plataforma → Sicoob ficam em gcv_gateway_settlements.
 * Repasses Sicoob → guia continuam em gcv_sale_payouts (payout_service).
 */

require_once __DIR__ . '/../db.php';

function gcv_ledger_ensure_schema(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    $file = dirname(__DIR__, 2) . '/database/migration_payment_ledger.sql';
    $raw = is_file($file) ? (string) file_get_contents($file) : '';
    foreach (preg_split('/;\s*\n/', $raw) ?: [] as $stmt) {
        // tira comentários de linha antes de checar se é CREATE TABLE
        $stmt = trim((string) preg_replace('/^\s*--.*$/m', '', $stmt));
        if ($stmt === '' || !preg_match('/^CREATE\s+TABLE/i', $stmt)) {
            continue;
        }
        try {
            db()->exec($stmt);
        } catch (Throwable $e) {
            error_log('ledger schema: ' . $e->getMessage());
        }
    }
}

/** Data/hora UTC ISO ou timestamp → DATETIME (America/Sao_Paulo). */
function gcv_ledger_dt($value): ?string
{
    if ($value === null || $value === '' || $value === 0) {
        return null;
    }
    try {
        $dt = is_int($value) || ctype_digit((string) $value)
            ? (new DateTimeImmutable('@' . (int) $value))
            : new DateTimeImmutable((string) $value);
        return $dt->setTimezone(new DateTimeZone('America/Sao_Paulo'))->format('Y-m-d H:i:s');
    } catch (Throwable $e) {
        return null;
    }
}

/**
 * Cria/atualiza a linha (reservation_id + gateway). Campos null não apagam o que já existe.
 *
 * @param array<string,mixed> $row
 */
function gcv_ledger_upsert(array $row): ?int
{
    gcv_ledger_ensure_schema();
    $allowed = [
        'reservation_id', 'sale_id', 'gateway', 'method', 'external_id', 'checkout_ref', 'status',
        'installments', 'currency', 'charge_minor', 'fx_rate', 'base_cents', 'surcharge_cents',
        'gross_cents', 'fee_cents', 'net_cents', 'fee_source', 'fee_detail', 'refunded_cents',
        'price_review', 'paid_at', 'available_at', 'settlement_status', 'settlement_id', 'settled_at', 'raw_json',
    ];
    $data = [];
    foreach ($allowed as $k) {
        if (array_key_exists($k, $row) && $row[$k] !== null) {
            $v = $row[$k];
            if (in_array($k, ['fee_detail', 'raw_json'], true) && !is_string($v)) {
                $v = json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
            if ($k === 'currency') {
                $v = strtoupper((string) $v);
            }
            $data[$k] = $v;
        }
    }
    if (empty($data['reservation_id']) || empty($data['gateway'])) {
        return null;
    }
    if (empty($data['method'])) {
        $data['method'] = $data['gateway'] === 'mercadopago' ? 'card_br' : ($data['gateway'] === 'stripe' ? 'card_intl' : 'pix');
    }
    $cols = array_keys($data);
    $updates = [];
    foreach ($cols as $c) {
        if ($c === 'reservation_id' || $c === 'gateway') {
            continue;
        }
        $updates[] = "{$c} = VALUES({$c})";
    }
    $sql = 'INSERT INTO gcv_payment_transactions (' . implode(',', $cols) . ') VALUES ('
        . implode(',', array_fill(0, count($cols), '?')) . ')'
        . ($updates ? ' ON DUPLICATE KEY UPDATE ' . implode(', ', $updates) . ', id = LAST_INSERT_ID(id)' : '');
    try {
        $stmt = db()->prepare($sql);
        $stmt->execute(array_values($data));
        return (int) db()->lastInsertId();
    } catch (Throwable $e) {
        error_log('gcv_ledger_upsert: ' . $e->getMessage());
        return null;
    }
}

/** @return array<string,mixed>|null */
function gcv_ledger_find(string $gateway, string $reservationId): ?array
{
    gcv_ledger_ensure_schema();
    $stmt = db()->prepare('SELECT * FROM gcv_payment_transactions WHERE gateway = ? AND reservation_id = ? LIMIT 1');
    $stmt->execute([$gateway, $reservationId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

/** @return array<string,mixed>|null */
function gcv_ledger_find_external(string $gateway, string $externalId): ?array
{
    gcv_ledger_ensure_schema();
    $stmt = db()->prepare('SELECT * FROM gcv_payment_transactions WHERE gateway = ? AND external_id = ? LIMIT 1');
    $stmt->execute([$gateway, $externalId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

/** Liga a transação à venda (gcv_sales) criada no gcv_pix_mark_paid. */
function gcv_ledger_link_sale(string $reservationId): void
{
    try {
        gcv_ledger_ensure_schema();
        db()->prepare(
            'UPDATE gcv_payment_transactions t
             JOIN gcv_sales s ON s.reservation_id = t.reservation_id AND s.deleted_at IS NULL
             SET t.sale_id = s.id
             WHERE t.reservation_id = ? AND t.sale_id IS NULL'
        )->execute([$reservationId]);
    } catch (Throwable $e) {
        error_log('gcv_ledger_link_sale: ' . $e->getMessage());
    }
}

/**
 * Pix recebido direto no Sicoob (ou OpenPix). Já está na conta: settlement IN_SICOOB.
 * Taxa: PAY_PIX_FEE_PCT (estimativa, padrão 0) — ajuste conforme a tarifa do seu plano Sicoob.
 *
 * @param array<string,mixed> $reservation
 */
function gcv_ledger_record_pix(array $reservation, string $source): void
{
    $rid = strtoupper((string) ($reservation['reservation_id'] ?? ''));
    $gross = (int) ($reservation['amount_cents'] ?? round(((float) ($reservation['amount'] ?? 0)) * 100));
    if ($rid === '' || $gross <= 0) {
        return;
    }
    $src = strtolower($source);
    $gateway = str_contains($src, 'openpix') ? 'openpix' : (str_contains($src, 'manual') ? 'manual' : 'sicoob');
    $pct = (float) str_replace(',', '.', (string) ($_ENV['PAY_PIX_FEE_PCT'] ?? getenv('PAY_PIX_FEE_PCT') ?: '0'));
    $fee = $pct > 0 ? (int) ceil($gross * $pct / 100) : 0;
    $paidAt = gcv_ledger_dt($reservation['paid_at'] ?? gmdate('c')) ?? date('Y-m-d H:i:s');
    gcv_ledger_upsert([
        'reservation_id' => $rid,
        'gateway' => $gateway,
        'method' => 'pix',
        'external_id' => (string) ($reservation['end_to_end_id'] ?? $reservation['e2eid'] ?? $reservation['txid'] ?? '') ?: null,
        'status' => 'PAID',
        'currency' => 'BRL',
        'charge_minor' => $gross,
        'base_cents' => $gross,
        'surcharge_cents' => 0,
        'gross_cents' => $gross,
        'fee_cents' => $fee,
        'net_cents' => $gross - $fee,
        'fee_source' => 'estimate',
        'paid_at' => $paidAt,
        'available_at' => $paidAt,
        'settlement_status' => 'IN_SICOOB',
        'settled_at' => $paidAt,
    ]);
    gcv_ledger_link_sale($rid);
}

/**
 * @param array<string,mixed> $f filtros: from, to (Y-m-d), gateway, method, status, settlement_status, q
 * @return array{where:string, params:list<mixed>}
 */
function gcv_ledger_where(array $f): array
{
    $w = ['1=1'];
    $p = [];
    if (!empty($f['from']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $f['from'])) {
        $w[] = 'COALESCE(t.paid_at, t.created_at) >= ?';
        $p[] = $f['from'] . ' 00:00:00';
    }
    if (!empty($f['to']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $f['to'])) {
        $w[] = 'COALESCE(t.paid_at, t.created_at) <= ?';
        $p[] = $f['to'] . ' 23:59:59';
    }
    foreach (['gateway', 'method', 'status', 'settlement_status'] as $k) {
        if (!empty($f[$k]) && preg_match('/^[A-Za-z_]{2,30}$/', (string) $f[$k])) {
            $w[] = "t.{$k} = ?";
            $p[] = (string) $f[$k];
        }
    }
    if (!empty($f['q'])) {
        $w[] = '(t.reservation_id LIKE ? OR t.external_id LIKE ? OR s.tourist_name LIKE ? OR s.tourist_email LIKE ?)';
        $q = '%' . substr((string) $f['q'], 0, 80) . '%';
        array_push($p, $q, $q, $q, $q);
    }
    return ['where' => implode(' AND ', $w), 'params' => $p];
}

/**
 * Histórico com venda e repasse ao guia.
 *
 * @param array<string,mixed> $f
 * @return list<array<string,mixed>>
 */
function gcv_ledger_list(array $f, int $limit = 200, int $offset = 0): array
{
    gcv_ledger_ensure_schema();
    $x = gcv_ledger_where($f);
    $limit = max(1, min(2000, $limit));
    $offset = max(0, $offset);
    $sql = "SELECT t.*, s.tourist_name, s.tourist_email, s.excursion_title, s.guide_name,
                   s.guide_amount_cents, s.platform_revenue_cents, s.payout_status, s.excursion_starts_at,
                   (SELECT p.paid_at FROM gcv_sale_payouts p
                     WHERE p.sale_id = s.id AND p.deleted_at IS NULL AND p.status = 'PAYOUT_PAID'
                     ORDER BY p.id DESC LIMIT 1) AS guide_paid_at,
                   st.external_id AS settlement_ref, st.status AS settlement_state, st.arrived_at AS settlement_arrived_at
            FROM gcv_payment_transactions t
            LEFT JOIN gcv_sales s ON s.id = t.sale_id
            LEFT JOIN gcv_gateway_settlements st ON st.id = t.settlement_id
            WHERE {$x['where']}
            ORDER BY COALESCE(t.paid_at, t.created_at) DESC, t.id DESC
            LIMIT {$limit} OFFSET {$offset}";
    $stmt = db()->prepare($sql);
    $stmt->execute($x['params']);
    return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

/**
 * Totais do período: bruto, acréscimos, taxas, líquido, por plataforma e
 * quanto ainda está nas plataformas (a caminho do Sicoob).
 *
 * @param array<string,mixed> $f
 * @return array<string,mixed>
 */
function gcv_ledger_summary(array $f): array
{
    gcv_ledger_ensure_schema();
    $x = gcv_ledger_where($f);
    $paid = "t.status IN ('PAID','PARTIALLY_REFUNDED')";
    $sql = "SELECT t.gateway,
                   COUNT(*) AS count,
                   COALESCE(SUM(t.gross_cents),0) AS gross_cents,
                   COALESCE(SUM(t.surcharge_cents),0) AS surcharge_cents,
                   COALESCE(SUM(t.fee_cents),0) AS fee_cents,
                   COALESCE(SUM(t.net_cents),0) AS net_cents,
                   COALESCE(SUM(t.refunded_cents),0) AS refunded_cents,
                   COALESCE(SUM(CASE WHEN t.settlement_status <> 'IN_SICOOB' THEN t.net_cents ELSE 0 END),0) AS pending_settlement_cents,
                   COALESCE(SUM(CASE WHEN t.settlement_status = 'AVAILABLE' THEN t.net_cents ELSE 0 END),0) AS available_cents
            FROM gcv_payment_transactions t
            LEFT JOIN gcv_sales s ON s.id = t.sale_id
            WHERE {$x['where']} AND {$paid}
            GROUP BY t.gateway";
    $stmt = db()->prepare($sql);
    $stmt->execute($x['params']);
    $by = [];
    $tot = ['count' => 0, 'gross_cents' => 0, 'surcharge_cents' => 0, 'fee_cents' => 0, 'net_cents' => 0,
        'refunded_cents' => 0, 'pending_settlement_cents' => 0, 'available_cents' => 0];
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $g = (string) $r['gateway'];
        unset($r['gateway']);
        $r = array_map('intval', $r);
        $by[$g] = $r;
        foreach ($tot as $k => $_) {
            $tot[$k] += $r[$k];
        }
    }
    // Repasses aos guias no período (Sicoob → guia)
    $guide = ['paid_cents' => 0, 'pending_cents' => 0];
    try {
        $g = db()->prepare(
            "SELECT
               COALESCE(SUM(CASE WHEN s.payout_status = 'PAYOUT_PAID' THEN s.guide_amount_cents ELSE 0 END),0) AS paid_cents,
               COALESCE(SUM(CASE WHEN s.payout_status <> 'PAYOUT_PAID' THEN s.guide_amount_cents ELSE 0 END),0) AS pending_cents
             FROM gcv_payment_transactions t
             JOIN gcv_sales s ON s.id = t.sale_id
             WHERE {$x['where']} AND {$paid}"
        );
        $g->execute($x['params']);
        $guide = array_map('intval', $g->fetch(PDO::FETCH_ASSOC) ?: $guide);
    } catch (Throwable $e) {
        error_log('ledger summary guide: ' . $e->getMessage());
    }
    return ['totals' => $tot, 'by_gateway' => $by, 'guide_payouts' => $guide];
}

/**
 * Cria/atualiza um repasse plataforma → Sicoob.
 *
 * @param array<string,mixed> $row
 */
function gcv_ledger_upsert_settlement(array $row): ?int
{
    gcv_ledger_ensure_schema();
    $gateway = (string) ($row['gateway'] ?? '');
    $ext = (string) ($row['external_id'] ?? '');
    if (!in_array($gateway, ['mercadopago', 'stripe'], true) || $ext === '') {
        return null;
    }
    $raw = isset($row['raw_json']) && !is_string($row['raw_json'])
        ? json_encode($row['raw_json'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        : ($row['raw_json'] ?? null);
    try {
        $stmt = db()->prepare(
            'INSERT INTO gcv_gateway_settlements
               (gateway, external_id, amount_cents, status, expected_at, arrived_at, sicoob_confirmed, sicoob_ref, notes, raw_json)
             VALUES (?,?,?,?,?,?,?,?,?,?)
             ON DUPLICATE KEY UPDATE
               amount_cents = VALUES(amount_cents),
               status = VALUES(status),
               expected_at = COALESCE(VALUES(expected_at), expected_at),
               arrived_at = COALESCE(VALUES(arrived_at), arrived_at),
               sicoob_confirmed = GREATEST(sicoob_confirmed, VALUES(sicoob_confirmed)),
               sicoob_ref = COALESCE(VALUES(sicoob_ref), sicoob_ref),
               notes = COALESCE(VALUES(notes), notes),
               raw_json = COALESCE(VALUES(raw_json), raw_json),
               id = LAST_INSERT_ID(id)'
        );
        $stmt->execute([
            $gateway, $ext, (int) ($row['amount_cents'] ?? 0), (string) ($row['status'] ?? 'PENDING'),
            $row['expected_at'] ?? null, $row['arrived_at'] ?? null, (int) ($row['sicoob_confirmed'] ?? 0),
            $row['sicoob_ref'] ?? null, $row['notes'] ?? null, $raw,
        ]);
        return (int) db()->lastInsertId();
    } catch (Throwable $e) {
        error_log('gcv_ledger_upsert_settlement: ' . $e->getMessage());
        return null;
    }
}

/**
 * Marca transações como ligadas a um repasse.
 *
 * @param list<int> $ids  ids de gcv_payment_transactions
 */
function gcv_ledger_attach_settlement(array $ids, int $settlementId, string $settlementStatus, ?string $settledAt = null): void
{
    $ids = array_values(array_filter(array_map('intval', $ids), static fn ($v) => $v > 0));
    if (!$ids || $settlementId <= 0) {
        return;
    }
    $in = implode(',', array_fill(0, count($ids), '?'));
    $sql = "UPDATE gcv_payment_transactions
            SET settlement_id = ?, settlement_status = ?, settled_at = COALESCE(?, settled_at)
            WHERE id IN ({$in})";
    db()->prepare($sql)->execute(array_merge([$settlementId, $settlementStatus, $settledAt], $ids));
}

/**
 * Estorno/contestação: marca a venda (o repasse automático ao guia só sai com venda PAID)
 * e avisa o admin uma vez por mudança de status.
 */
function gcv_ledger_flag_sale_dispute(string $reservationId, string $status): void
{
    $saleStatus = $status === 'REFUNDED' ? 'REFUNDED' : 'DISPUTED';
    try {
        $cur = db()->prepare('SELECT sale_status, payout_status, guide_name, excursion_title FROM gcv_sales WHERE reservation_id = ? AND deleted_at IS NULL LIMIT 1');
        $cur->execute([$reservationId]);
        $sale = $cur->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($sale && ($sale['sale_status'] ?? '') === $saleStatus) {
            return; // já marcado e avisado
        }
        db()->prepare(
            "UPDATE gcv_sales SET sale_status = ?, payout_status = CASE WHEN payout_status = 'PAYOUT_PAID' THEN payout_status ELSE 'PAYOUT_REVIEW' END
             WHERE reservation_id = ? AND deleted_at IS NULL"
        )->execute([$saleStatus, $reservationId]);

        $label = $status === 'CHARGEBACK' ? 'Contestação (chargeback)' : 'Estorno';
        $guidePaid = $sale && ($sale['payout_status'] ?? '') === 'PAYOUT_PAID';
        gcv_ledger_alert_admin(
            $label . ' — reserva ' . $reservationId,
            '<p><strong>' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</strong> na reserva <strong>'
            . htmlspecialchars($reservationId, ENT_QUOTES, 'UTF-8') . '</strong>'
            . ($sale ? ' (' . htmlspecialchars((string) $sale['excursion_title'], ENT_QUOTES, 'UTF-8') . ')' : '') . '.</p>'
            . '<p>' . ($guidePaid
                ? 'O guia já recebeu o repasse. O valor sai do saldo da plataforma.'
                : 'O repasse ao guia foi segurado (status Revisão) até você decidir.') . '</p>'
            . ($status === 'CHARGEBACK'
                ? '<p>Para contestar: envie à plataforma o voucher, o aceite da política de cancelamento e o registro de check-in por QR do dia do passeio.</p>'
                : '')
        );
    } catch (Throwable $e) {
        error_log('ledger flag dispute: ' . $e->getMessage());
    }
}

/** E-mail para os admins (PURCHASE_NOTIFY_EMAILS). Nunca derruba o fluxo. */
function gcv_ledger_alert_admin(string $subject, string $html): void
{
    try {
        require_once __DIR__ . '/../mailer.php';
        require_once __DIR__ . '/../purchase_notify.php';
        // mailer.php define $gcvMailerReady no escopo de quem o incluiu; aqui (dentro de
        // função) isso não vira global, então garante o autoload e a flag global.
        if (empty($GLOBALS['gcvMailerReady'])) {
            $autoload = dirname(__DIR__, 2) . '/vendor/autoload.php';
            if (is_readable($autoload)) {
                require_once $autoload;
                $GLOBALS['gcvMailerReady'] = true;
            }
        }
        foreach (gcv_admin_notify_emails() as $to) {
            send_mail((string) $to, '[Financeiro] ' . $subject, $html);
        }
    } catch (Throwable $e) {
        error_log('ledger alert: ' . $e->getMessage());
    }
}

/**
 * Transferência Mercado Pago → Sicoob: cria o repasse e liga as vendas do MP já
 * liberadas (mais antigas primeiro) até completar o valor.
 *
 * @return array{ok:bool, settlement_id?:int, attached?:int, attached_cents?:int, leftover_cents?:int}
 */
function gcv_ledger_register_mp_transfer(int $amountCents, ?string $arrivedAt, string $ref, string $notes = ''): array
{
    gcv_ledger_ensure_schema();
    if ($amountCents <= 0) {
        return ['ok' => false];
    }
    $arrivedAt = $arrivedAt ?: (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d H:i:s');
    $ext = $ref !== '' ? substr($ref, 0, 80) : ('mp-' . date('YmdHis', strtotime($arrivedAt)) . '-' . $amountCents);
    $sid = gcv_ledger_upsert_settlement([
        'gateway' => 'mercadopago',
        'external_id' => $ext,
        'amount_cents' => $amountCents,
        'status' => 'PAID',
        'expected_at' => substr($arrivedAt, 0, 10),
        'arrived_at' => $arrivedAt,
        'sicoob_confirmed' => 1,
        'sicoob_ref' => $ref !== '' ? substr($ref, 0, 80) : null,
        'notes' => $notes !== '' ? substr($notes, 0, 500) : null,
    ]);
    if (!$sid) {
        return ['ok' => false];
    }
    $rows = db()->query(
        "SELECT id, net_cents FROM gcv_payment_transactions
         WHERE gateway = 'mercadopago' AND status IN ('PAID','PARTIALLY_REFUNDED')
           AND settlement_status IN ('IN_GATEWAY','AVAILABLE')
           AND (available_at IS NULL OR available_at <= NOW())
         ORDER BY COALESCE(available_at, paid_at, created_at) ASC, id ASC"
    )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    $ids = [];
    $sum = 0;
    $tolerance = 100; // R$ 1,00
    foreach ($rows as $r) {
        $net = (int) ($r['net_cents'] ?? 0);
        if ($net <= 0 || $sum + $net > $amountCents + $tolerance) {
            continue;
        }
        $ids[] = (int) $r['id'];
        $sum += $net;
    }
    gcv_ledger_attach_settlement($ids, $sid, 'IN_SICOOB', $arrivedAt);
    return ['ok' => true, 'settlement_id' => $sid, 'attached' => count($ids), 'attached_cents' => $sum, 'leftover_cents' => $amountCents - $sum];
}

/** Saldo do Mercado Pago já liberado e ainda não transferido ao Sicoob. */
function gcv_ledger_mp_available(): array
{
    gcv_ledger_ensure_schema();
    db()->exec(
        "UPDATE gcv_payment_transactions SET settlement_status = 'AVAILABLE'
         WHERE gateway = 'mercadopago' AND status IN ('PAID','PARTIALLY_REFUNDED')
           AND settlement_status = 'IN_GATEWAY' AND available_at IS NOT NULL AND available_at <= NOW()"
    );
    $row = db()->query(
        "SELECT COUNT(*) AS n, COALESCE(SUM(net_cents),0) AS cents FROM gcv_payment_transactions
         WHERE gateway = 'mercadopago' AND status IN ('PAID','PARTIALLY_REFUNDED') AND settlement_status = 'AVAILABLE'"
    )->fetch(PDO::FETCH_ASSOC) ?: ['n' => 0, 'cents' => 0];
    return ['count' => (int) $row['n'], 'cents' => (int) $row['cents']];
}

/**
 * Pix que chegou no Sicoob e não é de nenhuma reserva: se veio da própria empresa
 * (mesmo CNPJ — transferência do Mercado Pago), registra como repasse MP → Sicoob.
 *
 * @param array<string,mixed> $data payload do webhook Sicoob
 */
function gcv_ledger_match_incoming_transfer(array $data): bool
{
    $own = preg_replace('/\D+/', '', (string) ($_ENV['PAY_OWN_CNPJ'] ?? getenv('PAY_OWN_CNPJ') ?: '24354289000105')) ?? '';
    $items = isset($data['pix']) && is_array($data['pix']) ? $data['pix'] : [$data];
    $matched = false;
    foreach ($items as $it) {
        if (!is_array($it)) {
            continue;
        }
        $payer = is_array($it['pagador'] ?? null) ? $it['pagador'] : (is_array($it['devedor'] ?? null) ? $it['devedor'] : []);
        $doc = preg_replace('/\D+/', '', (string) ($payer['cnpj'] ?? $payer['cpf'] ?? '')) ?? '';
        $name = strtoupper((string) ($payer['nome'] ?? ''));
        $fromOwn = $own !== '' && $doc === $own;
        $fromMp = str_contains($name, 'MERCADO PAGO') || str_contains($name, 'MERCADOPAGO');
        if (!$fromOwn && !$fromMp) {
            continue;
        }
        if (gcv_ledger_mp_available()['cents'] <= 0) {
            continue; // nada do MP esperando — não é repasse do MP
        }
        $cents = (int) round(((float) str_replace(',', '.', (string) ($it['valor'] ?? '0'))) * 100);
        if ($cents <= 0) {
            continue;
        }
        $e2e = trim((string) ($it['endToEndId'] ?? ''));
        if ($e2e !== '') {
            $dup = db()->prepare("SELECT id FROM gcv_gateway_settlements WHERE gateway = 'mercadopago' AND external_id = ? LIMIT 1");
            $dup->execute([substr($e2e, 0, 80)]);
            if ($dup->fetchColumn()) {
                continue; // já registrado (webhook + conciliação podem ver o mesmo Pix)
            }
        }
        $at = gcv_ledger_dt($it['horario'] ?? null);
        $out = gcv_ledger_register_mp_transfer($cents, $at, $e2e, 'Detectado automaticamente no Pix Sicoob');
        $matched = $matched || !empty($out['ok']);
    }
    return $matched;
}
