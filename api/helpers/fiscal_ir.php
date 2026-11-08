<?php

declare(strict_types=1);

/**
 * Informe de rendimentos.
 * O Pix pago ao guia grava o CPF/CNPJ de quem recebeu. O ano-calendário
 * separa a parte da plataforma e a parte de cada prestador.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/marketplace_schema.php';

function gcv_fiscal_payer(): array
{
    return [
        'name' => 'GUIA CHAPADA VEADEIROS',
        'cnpj' => '24354289000105',
        'cnpj_label' => '24.354.289/0001-05',
        'email' => 'contato@guiachapadaveadeiros.com',
    ];
}

function gcv_fiscal_now(): DateTimeImmutable
{
    return new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo'));
}

function gcv_fiscal_now_year(): int
{
    return (int)gcv_fiscal_now()->format('Y');
}

function gcv_fiscal_digits(?string $value): string
{
    return preg_replace('/\D+/', '', (string)$value) ?? '';
}

function gcv_fiscal_cut(string $value, int $max): string
{
    $value = trim($value);
    if ($value === '') {
        return '';
    }
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $max);
    }
    return substr($value, 0, $max);
}

function gcv_fiscal_money(int $cents): string
{
    $neg = $cents < 0;
    $abs = number_format(abs($cents) / 100, 2, ',', '.');
    return ($neg ? '-R$ ' : 'R$ ') . $abs;
}

function gcv_fiscal_fmt_cpf(string $digits): string
{
    if (strlen($digits) !== 11) {
        return $digits;
    }
    return substr($digits, 0, 3) . '.' . substr($digits, 3, 3) . '.' . substr($digits, 6, 3) . '-' . substr($digits, 9, 2);
}

function gcv_fiscal_fmt_cnpj(string $digits): string
{
    if (strlen($digits) !== 14) {
        return $digits;
    }
    return substr($digits, 0, 2) . '.' . substr($digits, 2, 3) . '.' . substr($digits, 5, 3)
        . '/' . substr($digits, 8, 4) . '-' . substr($digits, 12, 2);
}

function gcv_fiscal_cpf_ok(string $cpf): bool
{
    if (strlen($cpf) !== 11 || preg_match('/^(\d)\1{10}$/', $cpf)) {
        return false;
    }
    for ($t = 9; $t < 11; $t++) {
        $sum = 0;
        for ($i = 0; $i < $t; $i++) {
            $sum += (int)$cpf[$i] * (($t + 1) - $i);
        }
        $digit = ((10 * $sum) % 11) % 10;
        if ((int)$cpf[$t] !== $digit) {
            return false;
        }
    }
    return true;
}

function gcv_fiscal_cnpj_ok(string $cnpj): bool
{
    if (strlen($cnpj) !== 14 || preg_match('/^(\d)\1{13}$/', $cnpj)) {
        return false;
    }
    $calc = static function (string $base, array $weights): int {
        $sum = 0;
        foreach ($weights as $i => $w) {
            $sum += (int)$base[$i] * $w;
        }
        $mod = $sum % 11;
        return $mod < 2 ? 0 : 11 - $mod;
    };
    $d1 = $calc($cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    $d2 = $calc($cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return (int)$cnpj[12] === $d1 && (int)$cnpj[13] === $d2;
}

function gcv_fiscal_doc_label(?string $cpf, ?string $cnpj, ?string $personType = null): string
{
    unset($personType);
    $cpf = gcv_fiscal_digits($cpf);
    $cnpj = gcv_fiscal_digits($cnpj);
    $parts = [];
    if (strlen($cpf) === 11) {
        $parts[] = gcv_fiscal_fmt_cpf($cpf);
    }
    if (strlen($cnpj) === 14) {
        $parts[] = gcv_fiscal_fmt_cnpj($cnpj);
    }
    return implode(' · ', $parts);
}

function gcv_fiscal_doc_key(?string $cpf, ?string $cnpj): string
{
    $cpf = gcv_fiscal_digits($cpf);
    $cnpj = gcv_fiscal_digits($cnpj);
    $cpf = strlen($cpf) === 11 ? $cpf : '';
    $cnpj = strlen($cnpj) === 14 ? $cnpj : '';
    if ($cpf === '' && $cnpj === '') {
        return 'sem-documento';
    }
    return 'cpf:' . $cpf . '|cnpj:' . $cnpj;
}

function gcv_fiscal_ensure_schema(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    if (function_exists('gcv_schema_should_run') && !gcv_schema_should_run('fiscal-ensure')) {
        $done = true;
        return;
    }
    gcv_marketplace_ensure_schema();
    $pdo = db();

    $add = static function (string $table, array $cols) use ($pdo): void {
        $existing = gcv_marketplace_column_map($pdo, $table);
        if ($existing === null) {
            return;
        }
        foreach ($cols as $name => $def) {
            if (isset($existing[strtolower($name)])) {
                continue;
            }
            try {
                $pdo->exec('ALTER TABLE `' . str_replace('`', '', $table) . "` ADD COLUMN `{$name}` {$def}");
            } catch (Throwable $e) {
                error_log('fiscal col ' . $table . '.' . $name . ': ' . $e->getMessage());
            }
        }
    };

    $add('gcv_sale_payouts', [
        'payee_cpf' => 'VARCHAR(11) NULL',
        'payee_cnpj' => 'VARCHAR(14) NULL',
        'payee_name' => 'VARCHAR(160) NULL',
        'payee_person_type' => "ENUM('PF','PJ') NULL",
    ]);
    $add('gcv_guide_payouts', [
        'payee_cpf' => 'VARCHAR(11) NULL',
        'payee_cnpj' => 'VARCHAR(14) NULL',
        'payee_name' => 'VARCHAR(160) NULL',
        'payee_person_type' => "ENUM('PF','PJ') NULL",
    ]);
    $add('gcv_sales', [
        'payout_payee_cpf' => 'VARCHAR(11) NULL',
        'payout_payee_cnpj' => 'VARCHAR(14) NULL',
        'payout_payee_name' => 'VARCHAR(160) NULL',
        'payout_payee_person_type' => "ENUM('PF','PJ') NULL",
        'payout_payee_locked_at' => 'DATETIME NULL',
    ]);

    try {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS gcv_fiscal_year_notices (
              id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              guide_user_id INT UNSIGNED NOT NULL,
              calendar_year SMALLINT NOT NULL,
              sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              UNIQUE KEY uq_fiscal_notice (guide_user_id, calendar_year)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        error_log('fiscal notices table: ' . $e->getMessage());
    }
    $done = true;
}

/**
 * CPF/CNPJ de quem recebeu o Pix, no momento do envio.
 * Chave CPF ou CNPJ prevalece. Nos outros tipos de chave, vale o documento do perfil.
 *
 * @param array<string,mixed>|null $fin
 * @return array{payee_cpf:?string,payee_cnpj:?string,payee_name:?string,payee_person_type:string}
 */
function gcv_fiscal_payee_snapshot(string $pixKey, string $pixType, ?array $fin): array
{
    $fin = $fin ?? [];
    $cpf = gcv_fiscal_digits((string)($fin['cpf'] ?? ''));
    $cnpj = gcv_fiscal_digits((string)($fin['cnpj'] ?? ''));
    $key = gcv_fiscal_digits($pixKey);
    $pixType = strtolower(trim($pixType));
    if ($pixType === 'cpf' && strlen($key) === 11) {
        $cpf = $key;
    }
    if ($pixType === 'cnpj' && strlen($key) === 14) {
        $cnpj = $key;
    }
    if (strlen($cpf) !== 11) {
        $cpf = '';
    }
    if (strlen($cnpj) !== 14) {
        $cnpj = '';
    }
    $person = strtoupper(trim((string)($fin['person_type'] ?? '')));
    if ($person !== 'PF' && $person !== 'PJ') {
        $person = ($cnpj !== '' && $cpf === '') ? 'PJ' : 'PF';
    }
    if ($person === 'PJ' && $cnpj === '' && $cpf !== '') {
        $person = 'PF';
    }
    $name = trim((string)($fin['legal_name'] ?? $fin['pix_holder_name'] ?? $fin['full_name'] ?? $fin['name'] ?? ''));
    return [
        'payee_cpf' => $cpf !== '' ? $cpf : null,
        'payee_cnpj' => $cnpj !== '' ? $cnpj : null,
        'payee_name' => $name !== '' ? gcv_fiscal_cut($name, 160) : null,
        'payee_person_type' => $person,
    ];
}

/**
 * @param array<string,mixed>|null $fin
 */
function gcv_fiscal_stamp_sale_payout(
    PDO $pdo,
    int $payoutId,
    int $saleId,
    string $pixKey,
    string $pixType,
    ?array $fin,
    string $paidAt
): void {
    if ($payoutId <= 0) {
        return;
    }
    $payee = gcv_fiscal_payee_snapshot($pixKey, $pixType, $fin);
    if ($payee['payee_cpf'] === null && $payee['payee_cnpj'] === null) {
        return;
    }
    $pdo->prepare(
        'UPDATE gcv_sale_payouts
         SET payee_cpf = ?, payee_cnpj = ?, payee_name = ?, payee_person_type = ?
         WHERE id = ? AND payee_cpf IS NULL AND payee_cnpj IS NULL'
    )->execute([
        $payee['payee_cpf'],
        $payee['payee_cnpj'],
        $payee['payee_name'],
        $payee['payee_person_type'],
        $payoutId,
    ]);
    if ($saleId <= 0 || ($payee['payee_cpf'] === null && $payee['payee_cnpj'] === null)) {
        return;
    }
    $when = trim($paidAt) !== '' ? $paidAt : gcv_fiscal_now()->format('Y-m-d H:i:s');
    $pdo->prepare(
        'UPDATE gcv_sales
         SET payout_payee_cpf = ?, payout_payee_cnpj = ?, payout_payee_name = ?,
             payout_payee_person_type = ?, payout_payee_locked_at = ?
         WHERE id = ? AND payout_payee_locked_at IS NULL'
    )->execute([
        $payee['payee_cpf'],
        $payee['payee_cnpj'],
        $payee['payee_name'],
        $payee['payee_person_type'],
        $when,
        $saleId,
    ]);
}

/**
 * @param array<string,mixed> $guide
 */
function gcv_fiscal_stamp_manual_payout(int $payoutId, array $guide): void
{
    if ($payoutId <= 0) {
        return;
    }
    gcv_fiscal_ensure_schema();
    $fin = null;
    if (!function_exists('gcv_guide_financial_get')) {
        require_once __DIR__ . '/marketplace/guide_financial_service.php';
    }
    try {
        $fin = gcv_guide_financial_get((int)($guide['id'] ?? $guide['guide_user_id'] ?? 0));
    } catch (Throwable $e) {
        $fin = null;
    }
    if (!$fin) {
        $fin = [
            'cpf' => $guide['cpf'] ?? null,
            'cnpj' => $guide['cnpj'] ?? null,
            'person_type' => $guide['person_type'] ?? 'PF',
            'legal_name' => $guide['name'] ?? $guide['full_name'] ?? null,
        ];
    }
    $payee = gcv_fiscal_payee_snapshot(
        (string)($guide['pix_key'] ?? ''),
        (string)($guide['pix_key_type'] ?? ''),
        $fin
    );
    if ($payee['payee_name'] === null && !empty($guide['name'])) {
        $payee['payee_name'] = gcv_fiscal_cut((string)$guide['name'], 160);
    }
    if ($payee['payee_cpf'] === null && $payee['payee_cnpj'] === null) {
        return;
    }
    db()->prepare(
        'UPDATE gcv_guide_payouts
         SET payee_cpf = ?, payee_cnpj = ?, payee_name = ?, payee_person_type = ?
         WHERE id = ? AND payee_cpf IS NULL AND payee_cnpj IS NULL'
    )->execute([
        $payee['payee_cpf'],
        $payee['payee_cnpj'],
        $payee['payee_name'],
        $payee['payee_person_type'],
        $payoutId,
    ]);
}

function gcv_fiscal_backfill(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    gcv_fiscal_ensure_schema();
    $pdo = db();

    try {
        $rows = $pdo->query(
            "SELECT p.id, p.sale_id, p.guide_user_id, p.pix_key, p.pix_key_type, p.paid_at,
                    s.guide_cpf, s.guide_cnpj, s.guide_name
             FROM gcv_sale_payouts p
             LEFT JOIN gcv_sales s ON s.id = p.sale_id
             WHERE p.deleted_at IS NULL
               AND p.status = 'PAYOUT_PAID'
               AND p.payee_cpf IS NULL AND p.payee_cnpj IS NULL
             LIMIT 400"
        )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        error_log('fiscal backfill sales: ' . $e->getMessage());
        $rows = [];
    }

    if (!function_exists('gcv_guide_financial_get')) {
        require_once __DIR__ . '/marketplace/guide_financial_service.php';
    }
    foreach ($rows as $row) {
        $fin = [
            'cpf' => $row['guide_cpf'] ?? null,
            'cnpj' => $row['guide_cnpj'] ?? null,
            'legal_name' => $row['guide_name'] ?? null,
            'person_type' => 'PF',
        ];
        if (gcv_fiscal_digits((string)$fin['cpf']) === '' && gcv_fiscal_digits((string)$fin['cnpj']) === '') {
            try {
                $profile = gcv_guide_financial_get((int)$row['guide_user_id']);
                if ($profile) {
                    $fin = $profile;
                }
            } catch (Throwable $e) {
                // segue com o que a venda tiver
            }
        }
        try {
            gcv_fiscal_stamp_sale_payout(
                $pdo,
                (int)$row['id'],
                (int)$row['sale_id'],
                (string)($row['pix_key'] ?? ''),
                (string)($row['pix_key_type'] ?? ''),
                $fin,
                (string)($row['paid_at'] ?? '')
            );
        } catch (Throwable $e) {
            error_log('fiscal backfill row: ' . $e->getMessage());
        }
    }

    try {
        $manual = $pdo->query(
            "SELECT id, guide_user_id, pix_key_snapshot, pix_key_type
             FROM gcv_guide_payouts
             WHERE status = 'paid' AND payee_cpf IS NULL AND payee_cnpj IS NULL
             LIMIT 400"
        )->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($manual as $row) {
            gcv_fiscal_stamp_manual_payout((int)$row['id'], [
                'id' => (int)$row['guide_user_id'],
                'pix_key' => (string)($row['pix_key_snapshot'] ?? ''),
                'pix_key_type' => (string)($row['pix_key_type'] ?? ''),
            ]);
        }
    } catch (Throwable $e) {
        error_log('fiscal backfill manual: ' . $e->getMessage());
    }

    try {
        $pdo->exec(
            "UPDATE gcv_sales s
             JOIN (
               SELECT sale_id, MAX(id) AS id
               FROM gcv_sale_payouts
               WHERE status = 'PAYOUT_PAID' AND deleted_at IS NULL
                 AND (payee_cpf IS NOT NULL OR payee_cnpj IS NOT NULL)
               GROUP BY sale_id
             ) last ON last.sale_id = s.id
             JOIN gcv_sale_payouts p ON p.id = last.id
             SET s.payout_payee_cpf = p.payee_cpf,
                 s.payout_payee_cnpj = p.payee_cnpj,
                 s.payout_payee_name = p.payee_name,
                 s.payout_payee_person_type = p.payee_person_type,
                 s.payout_payee_locked_at = COALESCE(p.paid_at, p.created_at)
             WHERE s.payout_payee_locked_at IS NULL"
        );
    } catch (Throwable $e) {
        error_log('fiscal lock sales: ' . $e->getMessage());
    }
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_fiscal_load_guides(): array
{
    gcv_fiscal_ensure_schema();
    $sqls = [
        "SELECT u.id, u.name, u.email, u.status, u.created_at,
                g.full_name, g.cpf AS g_cpf, g.cnpj AS g_cnpj, g.approved_at,
                g.pix_key AS g_pix, g.pix_key_type AS g_pix_type,
                gf.legal_name, gf.person_type, gf.cpf AS fin_cpf, gf.cnpj AS fin_cnpj,
                gf.pix_key AS fin_pix, gf.pix_key_type AS fin_pix_type
         FROM gcv_users u
         LEFT JOIN gcv_guides g ON g.user_id = u.id
         LEFT JOIN gcv_guide_financial gf ON gf.guide_user_id = u.id AND gf.deleted_at IS NULL
         WHERE u.role = 'guide' OR EXISTS (
            SELECT 1 FROM gcv_user_roles r WHERE r.user_id = u.id AND r.role = 'guide'
         )",
        "SELECT u.id, u.name, u.email, u.status, u.created_at,
                g.full_name, g.cpf AS g_cpf, NULL AS g_cnpj, g.approved_at,
                g.pix_key AS g_pix, g.pix_key_type AS g_pix_type,
                NULL AS legal_name, NULL AS person_type, NULL AS fin_cpf, NULL AS fin_cnpj,
                NULL AS fin_pix, NULL AS fin_pix_type
         FROM gcv_users u
         LEFT JOIN gcv_guides g ON g.user_id = u.id
         WHERE u.role = 'guide'",
    ];
    foreach ($sqls as $sql) {
        try {
            $rows = db()->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            if (is_array($rows)) {
                return $rows;
            }
        } catch (Throwable $e) {
            error_log('fiscal guides: ' . $e->getMessage());
        }
    }
    return [];
}

/**
 * @param array<string,mixed> $guide
 * @return array{payee_cpf:?string,payee_cnpj:?string,payee_name:?string,payee_person_type:string}
 */
function gcv_fiscal_profile_payee(array $guide): array
{
    $fin = [
        'cpf' => ($guide['fin_cpf'] ?? '') !== '' && $guide['fin_cpf'] !== null ? $guide['fin_cpf'] : ($guide['g_cpf'] ?? null),
        'cnpj' => ($guide['fin_cnpj'] ?? '') !== '' && $guide['fin_cnpj'] !== null ? $guide['fin_cnpj'] : ($guide['g_cnpj'] ?? null),
        'person_type' => $guide['person_type'] ?? 'PF',
        'legal_name' => $guide['legal_name'] ?? $guide['full_name'] ?? $guide['name'] ?? '',
    ];
    $pix = trim((string)($guide['fin_pix'] ?? ''));
    $pixType = (string)($guide['fin_pix_type'] ?? '');
    if ($pix === '') {
        $pix = trim((string)($guide['g_pix'] ?? ''));
        $pixType = (string)($guide['g_pix_type'] ?? '');
    }
    return gcv_fiscal_payee_snapshot($pix, $pixType, $fin);
}

function gcv_fiscal_guide_start_year(array $guide): int
{
    $raw = trim((string)($guide['approved_at'] ?? ''));
    if ($raw === '') {
        $raw = trim((string)($guide['created_at'] ?? ''));
    }
    $year = (int)substr($raw, 0, 4);
    $now = gcv_fiscal_now_year();
    if ($year < 2020 || $year > $now) {
        return $now;
    }
    return $year;
}

/**
 * @return array{0:string,1:string}
 */
function gcv_fiscal_year_span(int $year): array
{
    return [
        sprintf('%04d-01-01 00:00:00', $year),
        sprintf('%04d-01-01 00:00:00', $year + 1),
    ];
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_fiscal_paid_lines(int $year, ?int $guideUserId = null): array
{
    gcv_fiscal_backfill();
    [$from, $to] = gcv_fiscal_year_span($year);
    $pdo = db();
    $lines = [];

    $sql = "SELECT p.id, p.sale_id, p.guide_user_id, p.amount_cents, p.paid_at, p.end_to_end_id,
                   p.payee_cpf, p.payee_cnpj, p.payee_name, p.payee_person_type,
                   s.reservation_id, s.excursion_title, s.sold_price_cents, s.paid_at AS client_paid_at,
                   COALESCE(NULLIF(p.payee_name, ''), NULLIF(s.guide_name, ''), u.name) AS guide_label,
                   u.email AS guide_email
            FROM gcv_sale_payouts p
            LEFT JOIN gcv_sales s ON s.id = p.sale_id
            LEFT JOIN gcv_users u ON u.id = p.guide_user_id
            WHERE p.deleted_at IS NULL AND p.status = 'PAYOUT_PAID'
              AND p.paid_at >= ? AND p.paid_at < ?";
    $params = [$from, $to];
    if ($guideUserId !== null) {
        $sql .= ' AND p.guide_user_id = ?';
        $params[] = $guideUserId;
    }
    $sql .= ' ORDER BY p.paid_at ASC, p.id ASC';
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $sold = (int)($row['sold_price_cents'] ?? 0);
            $guide = (int)($row['amount_cents'] ?? 0);
            $lines[] = gcv_fiscal_line('sale', $row, $sold, $sold - $guide, $guide, 'Pix da venda');
        }
    } catch (Throwable $e) {
        error_log('fiscal paid sales: ' . $e->getMessage());
    }

    $sqlM = "SELECT p.id, p.guide_user_id, p.amount_cents, p.paid_at, p.sicoob_end_to_end AS end_to_end_id,
                    p.payee_cpf, p.payee_cnpj, p.payee_name, p.payee_person_type, p.description,
                    COALESCE(NULLIF(p.payee_name, ''), NULLIF(g.full_name, ''), u.name) AS guide_label,
                    u.email AS guide_email
             FROM gcv_guide_payouts p
             LEFT JOIN gcv_users u ON u.id = p.guide_user_id
             LEFT JOIN gcv_guides g ON g.user_id = p.guide_user_id
             WHERE p.status = 'paid' AND p.paid_at >= ? AND p.paid_at < ?";
    $paramsM = [$from, $to];
    if ($guideUserId !== null) {
        $sqlM .= ' AND p.guide_user_id = ?';
        $paramsM[] = $guideUserId;
    }
    $sqlM .= ' ORDER BY p.paid_at ASC, p.id ASC';
    try {
        $stmt = $pdo->prepare($sqlM);
        $stmt->execute($paramsM);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $guide = (int)($row['amount_cents'] ?? 0);
            $row['reservation_id'] = '';
            $row['excursion_title'] = (string)($row['description'] ?? 'Pagamento avulso');
            $row['client_paid_at'] = null;
            $row['sale_id'] = 0;
            $lines[] = gcv_fiscal_line('manual', $row, 0, 0, $guide, 'Pagamento avulso');
        }
    } catch (Throwable $e) {
        error_log('fiscal paid manual: ' . $e->getMessage());
    }

    usort($lines, static function (array $a, array $b): int {
        return strcmp((string)$a['paid_at'], (string)$b['paid_at']);
    });
    return $lines;
}

/**
 * @param array<string,mixed> $row
 * @return array<string,mixed>
 */
function gcv_fiscal_line(string $source, array $row, int $client, int $platform, int $guide, string $origin): array
{
    $cpf = gcv_fiscal_digits((string)($row['payee_cpf'] ?? ''));
    $cnpj = gcv_fiscal_digits((string)($row['payee_cnpj'] ?? ''));
    $person = strtoupper((string)($row['payee_person_type'] ?? 'PF')) === 'PJ' ? 'PJ' : 'PF';
    $docKey = gcv_fiscal_doc_key($cpf, $cnpj);
    return [
        'source' => $source,
        'payout_id' => (int)($row['id'] ?? 0),
        'sale_id' => (int)($row['sale_id'] ?? 0),
        'guide_user_id' => (int)($row['guide_user_id'] ?? 0),
        'guide_name' => (string)($row['guide_label'] ?? $row['payee_name'] ?? ''),
        'guide_email' => (string)($row['guide_email'] ?? ''),
        'paid_at' => (string)($row['paid_at'] ?? ''),
        'client_paid_at' => (string)($row['client_paid_at'] ?? ''),
        'reservation_id' => (string)($row['reservation_id'] ?? ''),
        'title' => (string)($row['excursion_title'] ?? ''),
        'client_cents' => $client,
        'platform_cents' => $platform,
        'guide_cents' => $guide,
        'cpf' => strlen($cpf) === 11 ? $cpf : '',
        'cnpj' => strlen($cnpj) === 14 ? $cnpj : '',
        'person_type' => $person,
        'document_label' => gcv_fiscal_doc_label($cpf, $cnpj, $person),
        'doc_key' => $docKey,
        'end_to_end' => (string)($row['end_to_end_id'] ?? ''),
        'origin_label' => $origin,
    ];
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_fiscal_pending_lines(int $year): array
{
    [$from, $to] = gcv_fiscal_year_span($year);
    try {
        $stmt = db()->prepare(
            "SELECT s.id, s.guide_user_id, s.guide_name, s.reservation_id, s.excursion_title,
                    s.sold_price_cents, s.guide_amount_cents, s.platform_revenue_cents,
                    s.scheduled_payout_at, s.excursion_starts_at, s.paid_at
             FROM gcv_sales s
             WHERE s.deleted_at IS NULL
               AND s.sale_status = 'PAID'
               AND s.payout_status IN ('PAYOUT_PENDING', 'PAYOUT_REVIEW')
               AND COALESCE(s.scheduled_payout_at, s.excursion_starts_at, s.paid_at) >= ?
               AND COALESCE(s.scheduled_payout_at, s.excursion_starts_at, s.paid_at) < ?
             ORDER BY COALESCE(s.scheduled_payout_at, s.excursion_starts_at, s.paid_at) ASC
             LIMIT 500"
        );
        $stmt->execute([$from, $to]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        error_log('fiscal pending: ' . $e->getMessage());
        return [];
    }

    $guides = [];
    foreach (gcv_fiscal_load_guides() as $g) {
        $guides[(int)$g['id']] = $g;
    }
    $out = [];
    foreach ($rows as $row) {
        $gid = (int)($row['guide_user_id'] ?? 0);
        $payee = isset($guides[$gid]) ? gcv_fiscal_profile_payee($guides[$gid]) : gcv_fiscal_payee_snapshot('', '', null);
        $when = (string)($row['scheduled_payout_at'] ?: $row['excursion_starts_at'] ?: $row['paid_at'] ?: '');
        $out[] = [
            'sale_id' => (int)$row['id'],
            'guide_user_id' => $gid,
            'guide_name' => (string)($payee['payee_name'] ?: $row['guide_name'] ?: ''),
            'reservation_id' => (string)($row['reservation_id'] ?? ''),
            'title' => (string)($row['excursion_title'] ?? ''),
            'when' => $when,
            'client_cents' => (int)($row['sold_price_cents'] ?? 0),
            'platform_cents' => (int)($row['platform_revenue_cents'] ?? 0),
            'guide_cents' => (int)($row['guide_amount_cents'] ?? 0),
            'cpf' => (string)($payee['payee_cpf'] ?? ''),
            'cnpj' => (string)($payee['payee_cnpj'] ?? ''),
            'document_label' => gcv_fiscal_doc_label($payee['payee_cpf'] ?? '', $payee['payee_cnpj'] ?? '', $payee['payee_person_type']),
            'document_note' => 'previsto',
        ];
    }
    return $out;
}

/**
 * @param list<array<string,mixed>> $lines
 * @return array<string,mixed>
 */
function gcv_fiscal_admin_year(int $year): array
{
    $year = max(2020, min(gcv_fiscal_now_year(), $year));
    $lines = gcv_fiscal_paid_lines($year);
    $pending = gcv_fiscal_pending_lines($year);
    $guides = gcv_fiscal_load_guides();

    $buckets = [];
    $touch = static function (string $key, int $gid, array $payee, string $name, string $email) use (&$buckets): array {
        if (!isset($buckets[$key])) {
            $buckets[$key] = [
                'key' => $key,
                'guide_user_id' => $gid,
                'name' => $name,
                'email' => $email,
                'cpf' => (string)($payee['payee_cpf'] ?? $payee['cpf'] ?? ''),
                'cnpj' => (string)($payee['payee_cnpj'] ?? $payee['cnpj'] ?? ''),
                'person_type' => (string)($payee['payee_person_type'] ?? $payee['person_type'] ?? 'PF'),
                'document_label' => '',
                'guide_cents' => 0,
                'platform_cents' => 0,
                'client_cents' => 0,
                'manual_cents' => 0,
                'deposits' => 0,
                'lines' => [],
                'zero' => true,
            ];
        }
        return $buckets[$key];
    };

    foreach ($lines as $line) {
        $gid = (int)$line['guide_user_id'];
        $key = $gid . ':' . $line['doc_key'];
        $bucket = $touch($key, $gid, $line, (string)$line['guide_name'], (string)$line['guide_email']);
        $bucket['guide_cents'] += (int)$line['guide_cents'];
        $bucket['platform_cents'] += (int)$line['platform_cents'];
        $bucket['client_cents'] += (int)$line['client_cents'];
        if ($line['source'] === 'manual') {
            $bucket['manual_cents'] += (int)$line['guide_cents'];
        }
        $bucket['deposits']++;
        $bucket['zero'] = false;
        $bucket['cpf'] = (string)$line['cpf'];
        $bucket['cnpj'] = (string)$line['cnpj'];
        $bucket['person_type'] = (string)$line['person_type'];
        $bucket['document_label'] = (string)$line['document_label'];
        if ($bucket['name'] === '' && $line['guide_name'] !== '') {
            $bucket['name'] = (string)$line['guide_name'];
        }
        $bucket['lines'][] = $line;
        $buckets[$key] = $bucket;
    }

    $seenGuide = [];
    foreach ($buckets as $bucket) {
        $seenGuide[(int)$bucket['guide_user_id']] = true;
    }

    foreach ($guides as $g) {
        $gid = (int)$g['id'];
        $status = (string)($g['status'] ?? '');
        if ($status === 'pending' && empty($seenGuide[$gid])) {
            continue;
        }
        if (gcv_fiscal_guide_start_year($g) > $year && empty($seenGuide[$gid])) {
            continue;
        }
        if (!empty($seenGuide[$gid])) {
            continue;
        }
        $payee = gcv_fiscal_profile_payee($g);
        $docKey = gcv_fiscal_doc_key($payee['payee_cpf'] ?? '', $payee['payee_cnpj'] ?? '');
        $name = (string)($payee['payee_name'] ?: $g['full_name'] ?: $g['name'] ?: '');
        $key = $gid . ':' . $docKey;
        $bucket = $touch($key, $gid, $payee, $name, (string)($g['email'] ?? ''));
        $bucket['document_label'] = gcv_fiscal_doc_label($payee['payee_cpf'] ?? '', $payee['payee_cnpj'] ?? '', $payee['payee_person_type']);
        $bucket['cpf'] = (string)($payee['payee_cpf'] ?? '');
        $bucket['cnpj'] = (string)($payee['payee_cnpj'] ?? '');
        $buckets[$key] = $bucket;
    }

    $providers = array_values($buckets);
    usort($providers, static function (array $a, array $b): int {
        if ((int)$a['guide_cents'] !== (int)$b['guide_cents']) {
            return (int)$b['guide_cents'] <=> (int)$a['guide_cents'];
        }
        return strcasecmp((string)$a['name'], (string)$b['name']);
    });

    $company = [
        'client_cents' => 0,
        'platform_cents' => 0,
        'guide_cents' => 0,
        'sale_guide_cents' => 0,
        'manual_cents' => 0,
        'deposits' => count($lines),
        'pending_client_cents' => 0,
        'pending_platform_cents' => 0,
        'pending_guide_cents' => 0,
        'pending_count' => count($pending),
    ];
    foreach ($lines as $line) {
        $company['client_cents'] += (int)$line['client_cents'];
        $company['platform_cents'] += (int)$line['platform_cents'];
        $company['guide_cents'] += (int)$line['guide_cents'];
        if ($line['source'] === 'manual') {
            $company['manual_cents'] += (int)$line['guide_cents'];
        } else {
            $company['sale_guide_cents'] += (int)$line['guide_cents'];
        }
    }
    foreach ($pending as $row) {
        $company['pending_client_cents'] += (int)$row['client_cents'];
        $company['pending_platform_cents'] += (int)$row['platform_cents'];
        $company['pending_guide_cents'] += (int)$row['guide_cents'];
    }

    [$minYear, $maxYear] = gcv_fiscal_year_bounds();
    $years = [];
    for ($y = $maxYear; $y >= $minYear; $y--) {
        $years[] = $y;
    }

    return [
        'year' => $year,
        'closed' => $year < gcv_fiscal_now_year(),
        'payer' => gcv_fiscal_payer(),
        'company' => $company,
        'providers' => $providers,
        'pending' => $pending,
        'years' => $years,
        'notices_sent' => gcv_fiscal_notices_sent($year),
    ];
}

/**
 * @return array{0:int,1:int}
 */
function gcv_fiscal_year_bounds(): array
{
    $now = gcv_fiscal_now_year();
    $min = $now;
    $queries = [
        "SELECT MIN(paid_at) FROM gcv_sale_payouts WHERE status = 'PAYOUT_PAID' AND deleted_at IS NULL AND paid_at IS NOT NULL",
        "SELECT MIN(paid_at) FROM gcv_guide_payouts WHERE status = 'paid' AND paid_at IS NOT NULL",
        "SELECT MIN(COALESCE(g.approved_at, u.created_at))
         FROM gcv_users u
         LEFT JOIN gcv_guides g ON g.user_id = u.id
         WHERE u.role = 'guide'",
    ];
    foreach ($queries as $sql) {
        try {
            $value = db()->query($sql)->fetchColumn();
            $year = (int)substr((string)$value, 0, 4);
            if ($year >= 2020 && $year < $min) {
                $min = $year;
            }
        } catch (Throwable $e) {
            // ignora fonte ausente
        }
    }
    return [$min, $now];
}

function gcv_fiscal_notices_sent(int $year): int
{
    try {
        $stmt = db()->prepare('SELECT COUNT(*) FROM gcv_fiscal_year_notices WHERE calendar_year = ?');
        $stmt->execute([$year]);
        return (int)$stmt->fetchColumn();
    } catch (Throwable $e) {
        return 0;
    }
}

/**
 * @return array<int,array{guide_cents:int,deposits:int}>
 */
function gcv_fiscal_guide_year_totals(int $guideUserId, int $start, int $end): array
{
    $out = [];
    for ($y = $start; $y <= $end; $y++) {
        $out[$y] = ['guide_cents' => 0, 'deposits' => 0];
    }
    [$from, $to] = gcv_fiscal_year_span($start);
    $to = sprintf('%04d-01-01 00:00:00', $end + 1);
    $queries = [
        "SELECT YEAR(paid_at) AS y, SUM(amount_cents) AS cents, COUNT(*) AS n
         FROM gcv_sale_payouts
         WHERE guide_user_id = ? AND status = 'PAYOUT_PAID' AND deleted_at IS NULL
           AND paid_at >= ? AND paid_at < ?
         GROUP BY YEAR(paid_at)",
        "SELECT YEAR(paid_at) AS y, SUM(amount_cents) AS cents, COUNT(*) AS n
         FROM gcv_guide_payouts
         WHERE guide_user_id = ? AND status = 'paid'
           AND paid_at >= ? AND paid_at < ?
         GROUP BY YEAR(paid_at)",
    ];
    foreach ($queries as $sql) {
        try {
            $stmt = db()->prepare($sql);
            $stmt->execute([$guideUserId, $from, $to]);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
                $y = (int)($row['y'] ?? 0);
                if (!isset($out[$y])) {
                    continue;
                }
                $out[$y]['guide_cents'] += (int)$row['cents'];
                $out[$y]['deposits'] += (int)$row['n'];
            }
        } catch (Throwable $e) {
            error_log('fiscal year totals: ' . $e->getMessage());
        }
    }
    return $out;
}

/**
 * @return array<string,mixed>
 */
function gcv_fiscal_guide_statement(int $guideUserId, ?int $year = null): array
{
    gcv_fiscal_backfill();
    $now = gcv_fiscal_now_year();
    $user = gcv_fiscal_one_guide($guideUserId);
    $start = $user ? gcv_fiscal_guide_start_year($user) : $now;
    try {
        $stmt = db()->prepare(
            "SELECT MIN(paid_at) FROM gcv_sale_payouts
             WHERE guide_user_id = ? AND status = 'PAYOUT_PAID' AND deleted_at IS NULL AND paid_at IS NOT NULL"
        );
        $stmt->execute([$guideUserId]);
        $minPaid = (int)substr((string)$stmt->fetchColumn(), 0, 4);
        if ($minPaid >= 2020 && $minPaid < $start) {
            $start = $minPaid;
        }
        $stmt = db()->prepare(
            "SELECT MIN(paid_at) FROM gcv_guide_payouts
             WHERE guide_user_id = ? AND status = 'paid' AND paid_at IS NOT NULL"
        );
        $stmt->execute([$guideUserId]);
        $minManual = (int)substr((string)$stmt->fetchColumn(), 0, 4);
        if ($minManual >= 2020 && $minManual < $start) {
            $start = $minManual;
        }
    } catch (Throwable $e) {
        // o intervalo segue o cadastro
    }
    if ($start > $now) {
        $start = $now;
    }

    $years = [];
    $totals = gcv_fiscal_guide_year_totals($guideUserId, $start, $now);
    for ($y = $now; $y >= $start; $y--) {
        $tot = $totals[$y] ?? ['guide_cents' => 0, 'deposits' => 0];
        $years[] = [
            'year' => $y,
            'closed' => $y < $now,
            'guide_cents' => (int)$tot['guide_cents'],
            'deposits' => (int)$tot['deposits'],
        ];
    }
    $chosen = $year ?? ($now - 1);
    if ($chosen < $start || $chosen > $now) {
        $chosen = $years[0]['year'] ?? $now;
        foreach ($years as $item) {
            if (!empty($item['closed'])) {
                $chosen = (int)$item['year'];
                break;
            }
        }
    }

    $lines = gcv_fiscal_paid_lines($chosen, $guideUserId);
    $guideCents = 0;
    $docs = [];
    foreach ($lines as $line) {
        $guideCents += (int)$line['guide_cents'];
        $label = (string)$line['document_label'];
        if ($label !== '') {
            $docs[$label] = true;
        }
    }
    $profile = $user ? gcv_fiscal_profile_payee($user) : gcv_fiscal_payee_snapshot('', '', null);
    $profileLabel = gcv_fiscal_doc_label($profile['payee_cpf'] ?? '', $profile['payee_cnpj'] ?? '', $profile['payee_person_type']);
    $name = (string)($profile['payee_name'] ?: ($user['full_name'] ?? $user['name'] ?? ''));

    return [
        'payer' => gcv_fiscal_payer(),
        'year' => $chosen,
        'closed' => $chosen < $now,
        'years' => $years,
        'guide' => [
            'user_id' => $guideUserId,
            'name' => $name,
            'cpf' => (string)($profile['payee_cpf'] ?? ''),
            'cnpj' => (string)($profile['payee_cnpj'] ?? ''),
            'person_type' => (string)$profile['payee_person_type'],
            'document_label' => $profileLabel,
        ],
        'documents' => array_keys($docs),
        'guide_cents' => $guideCents,
        'deposits' => count($lines),
        'lines' => $lines,
        'zero' => count($lines) === 0,
    ];
}

/**
 * @return array<string,mixed>|null
 */
function gcv_fiscal_one_guide(int $guideUserId): ?array
{
    foreach (gcv_fiscal_load_guides() as $guide) {
        if ((int)$guide['id'] === $guideUserId) {
            return $guide;
        }
    }
    try {
        $stmt = db()->prepare('SELECT id, name, email, status, created_at FROM gcv_users WHERE id = ? LIMIT 1');
        $stmt->execute([$guideUserId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    } catch (Throwable $e) {
        return null;
    }
}

/**
 * @param array<string,mixed> $input
 * @return array{payee_cpf:?string,payee_cnpj:?string,payee_name:?string,payee_person_type:string}
 */
function gcv_fiscal_parse_correction(array $input): array
{
    $cpf = gcv_fiscal_digits((string)($input['cpf'] ?? ''));
    $cnpj = gcv_fiscal_digits((string)($input['cnpj'] ?? ''));
    if ($cpf === '' && $cnpj === '') {
        throw new InvalidArgumentException('Informe o CPF ou o CNPJ de quem recebeu o Pix');
    }
    if ($cpf !== '' && !gcv_fiscal_cpf_ok($cpf)) {
        throw new InvalidArgumentException('CPF inválido');
    }
    if ($cnpj !== '' && !gcv_fiscal_cnpj_ok($cnpj)) {
        throw new InvalidArgumentException('CNPJ inválido');
    }
    $reason = trim((string)($input['reason'] ?? ''));
    if (strlen($reason) < 5) {
        throw new InvalidArgumentException('Escreva o motivo da correção');
    }
    $person = strtoupper(trim((string)($input['person_type'] ?? '')));
    if ($person !== 'PF' && $person !== 'PJ') {
        $person = $cnpj !== '' && $cpf === '' ? 'PJ' : 'PF';
    }
    return [
        'payee_cpf' => $cpf !== '' ? $cpf : null,
        'payee_cnpj' => $cnpj !== '' ? $cnpj : null,
        'payee_name' => null,
        'payee_person_type' => $person,
        'reason' => gcv_fiscal_cut($reason, 300),
    ];
}

function gcv_fiscal_correct(int $adminId, string $source, int $payoutId, array $input): void
{
    gcv_fiscal_ensure_schema();
    $fix = gcv_fiscal_parse_correction($input);
    $pdo = db();
    if ($source === 'manual') {
        $stmt = $pdo->prepare('SELECT * FROM gcv_guide_payouts WHERE id = ? AND status = \'paid\' LIMIT 1');
        $stmt->execute([$payoutId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            throw new RuntimeException('Pagamento avulso não encontrado');
        }
        $pdo->prepare(
            'UPDATE gcv_guide_payouts
             SET payee_cpf = ?, payee_cnpj = ?, payee_person_type = ?
             WHERE id = ?'
        )->execute([$fix['payee_cpf'], $fix['payee_cnpj'], $fix['payee_person_type'], $payoutId]);
        gcv_fiscal_audit($adminId, 'guide_payout', $payoutId, $row, $fix);
        return;
    }
    if ($source !== 'sale') {
        throw new InvalidArgumentException('Origem inválida');
    }
    $stmt = $pdo->prepare(
        "SELECT * FROM gcv_sale_payouts WHERE id = ? AND status = 'PAYOUT_PAID' AND deleted_at IS NULL LIMIT 1"
    );
    $stmt->execute([$payoutId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        throw new RuntimeException('Pix da venda não encontrado');
    }
    $pdo->prepare(
        'UPDATE gcv_sale_payouts
         SET payee_cpf = ?, payee_cnpj = ?, payee_person_type = ?
         WHERE id = ?'
    )->execute([$fix['payee_cpf'], $fix['payee_cnpj'], $fix['payee_person_type'], $payoutId]);
    $saleId = (int)($row['sale_id'] ?? 0);
    if ($saleId > 0) {
        $pdo->prepare(
            'UPDATE gcv_sales
             SET payout_payee_cpf = ?, payout_payee_cnpj = ?, payout_payee_person_type = ?,
                 payout_payee_locked_at = COALESCE(payout_payee_locked_at, NOW())
             WHERE id = ?'
        )->execute([$fix['payee_cpf'], $fix['payee_cnpj'], $fix['payee_person_type'], $saleId]);
    }
    gcv_fiscal_audit($adminId, 'sale_payout', $payoutId, $row, $fix);
}

/**
 * @param array<string,mixed> $before
 * @param array<string,mixed> $fix
 */
function gcv_fiscal_audit(int $adminId, string $entity, int $payoutId, array $before, array $fix): void
{
    if (!function_exists('gcv_audit_log')) {
        require_once __DIR__ . '/marketplace/audit_service.php';
    }
    if (!class_exists('GcvCreatedBy')) {
        require_once __DIR__ . '/marketplace/constants.php';
    }
    try {
        gcv_audit_log(
            $entity,
            $payoutId,
            'fiscal_correct_document',
            $adminId,
            'payee_document',
            json_encode([
                'cpf' => $before['payee_cpf'] ?? null,
                'cnpj' => $before['payee_cnpj'] ?? null,
            ], JSON_UNESCAPED_UNICODE),
            json_encode([
                'cpf' => $fix['payee_cpf'],
                'cnpj' => $fix['payee_cnpj'],
                'reason' => $fix['reason'] ?? '',
            ], JSON_UNESCAPED_UNICODE),
            GcvCreatedBy::ADMIN
        );
    } catch (Throwable $e) {
        error_log('fiscal audit: ' . $e->getMessage());
    }
}

/**
 * @return array{sent:int,skipped:int,failed:int,year:int,reason:string}
 */
function gcv_fiscal_send_year_notices(?int $year = null, bool $force = false, int $limit = 30): array
{
    gcv_fiscal_ensure_schema();
    $now = gcv_fiscal_now();
    $current = (int)$now->format('Y');
    $target = $year ?? ($current - 1);
    $empty = ['sent' => 0, 'skipped' => 0, 'failed' => 0, 'year' => $target, 'reason' => ''];
    if ($target >= $current || $target < 2020) {
        $empty['reason'] = 'ano_aberto';
        return $empty;
    }
    if (!$force) {
        $month = (int)$now->format('n');
        $day = (int)$now->format('j');
        if ($month !== 1 || $day > 20 || $target !== $current - 1) {
            $empty['reason'] = 'fora_da_virada';
            return $empty;
        }
    }
    $limit = max(1, min(200, $limit));
    $sent = 0;
    $skipped = 0;
    $failed = 0;
    $report = gcv_fiscal_admin_year($target);
    $byGuide = [];
    foreach ($report['providers'] as $provider) {
        $gid = (int)$provider['guide_user_id'];
        if ($gid <= 0) {
            continue;
        }
        if (!isset($byGuide[$gid])) {
            $byGuide[$gid] = [
                'name' => (string)$provider['name'],
                'email' => (string)$provider['email'],
                'cents' => 0,
                'docs' => [],
            ];
        }
        $byGuide[$gid]['cents'] += (int)$provider['guide_cents'];
        $label = (string)$provider['document_label'];
        if ($label !== '') {
            $byGuide[$gid]['docs'][$label] = true;
        }
        if ($byGuide[$gid]['name'] === '' && $provider['name'] !== '') {
            $byGuide[$gid]['name'] = (string)$provider['name'];
        }
    }

    if (!function_exists('gcv_inbox_push')) {
        require_once __DIR__ . '/inbox.php';
    }
    if (!function_exists('send_mail')) {
        require_once __DIR__ . '/mailer.php';
    }
    $payer = gcv_fiscal_payer();
    $pdo = db();
    $exists = $pdo->prepare('SELECT id FROM gcv_fiscal_year_notices WHERE guide_user_id = ? AND calendar_year = ? LIMIT 1');
    $ins = $pdo->prepare('INSERT INTO gcv_fiscal_year_notices (guide_user_id, calendar_year, sent_at) VALUES (?,?,NOW())');
    $del = $pdo->prepare('DELETE FROM gcv_fiscal_year_notices WHERE guide_user_id = ? AND calendar_year = ?');

    foreach ($byGuide as $gid => $info) {
        if ($sent + $failed >= $limit) {
            break;
        }
        $exists->execute([$gid, $target]);
        if ($exists->fetchColumn()) {
            $skipped++;
            continue;
        }
        try {
            $ins->execute([$gid, $target]);
        } catch (Throwable $e) {
            $skipped++;
            continue;
        }
        $docs = array_keys($info['docs']);
        $docLabel = $docs ? implode(', ', $docs) : 'documento ainda não cadastrado';
        $body = gcv_fiscal_notice_body((string)$info['name'], $target, (int)$info['cents'], $docLabel, $payer);
        $inboxOk = false;
        $mailOk = false;
        try {
            gcv_inbox_push($gid, $body, ['kind' => 'fiscal_ir']);
            $inboxOk = true;
        } catch (Throwable $e) {
            error_log('fiscal inbox: ' . $e->getMessage());
        }
        $email = strtolower(trim((string)$info['email']));
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            try {
                $html = '<p>' . nl2br(htmlspecialchars($body, ENT_QUOTES, 'UTF-8')) . '</p>';
                $mailOk = send_mail($email, 'Informe de rendimentos ' . $target, $html, (string)$info['name']);
            } catch (Throwable $e) {
                error_log('fiscal mail: ' . $e->getMessage());
            }
        }
        if (!$inboxOk && !$mailOk) {
            try {
                $del->execute([$gid, $target]);
            } catch (Throwable $e) {
                // tenta de novo no próximo cron
            }
            $failed++;
            continue;
        }
        $sent++;
    }

    return [
        'sent' => $sent,
        'skipped' => $skipped,
        'failed' => $failed,
        'year' => $target,
        'reason' => '',
    ];
}

/**
 * @param array{name:string,cnpj_label:string} $payer
 */
function gcv_fiscal_notice_body(string $name, int $year, int $cents, string $docLabel, array $payer): string
{
    $who = trim($name) !== '' ? trim($name) : 'guia';
    return "Informe de rendimentos {$year}\n\n"
        . "Olá, {$who}.\n\n"
        . $payer['name'] . ' (CNPJ ' . $payer['cnpj_label'] . ') registrou '
        . gcv_fiscal_money($cents) . " em depósitos para você no ano {$year}, no documento {$docLabel}.\n\n"
        . "O extrato lista o que a plataforma depositou na sua conta. "
        . "Abra o painel, em Financeiro, escolha o ano {$year} e imprima o informe para a declaração.\n"
        . 'https://www.guiachapadaveadeiros.com/dashboard/#financeiro';
}

/**
 * @param list<array<string,mixed>> $lines
 */
function gcv_fiscal_csv(int $year, array $lines, bool $withPlatform): string
{
    $esc = static function (string $value): string {
        $value = str_replace('"', '""', $value);
        if ($value !== '' && preg_match('/^[=+\-@]/', $value)) {
            $value = "'" . $value;
        }
        return '"' . $value . '"';
    };
    $money = static function (int $cents): string {
        return number_format($cents / 100, 2, ',', '');
    };
    $header = ['Ano', 'Prestador', 'CPF', 'CNPJ', 'Data do Pix', 'Origem', 'Reserva', 'Descrição', 'Guia'];
    if ($withPlatform) {
        $header = ['Ano', 'Prestador', 'CPF', 'CNPJ', 'Data do Pix', 'Origem', 'Reserva', 'Descrição', 'Cliente pagou', 'Plataforma', 'Guia', 'EndToEnd'];
    }
    $out = "\xEF\xBB\xBF" . implode(';', $header) . "\r\n";
    $sumGuide = 0;
    $sumPlatform = 0;
    $sumClient = 0;
    foreach ($lines as $line) {
        $sumGuide += (int)$line['guide_cents'];
        $sumPlatform += (int)$line['platform_cents'];
        $sumClient += (int)$line['client_cents'];
        $paid = (string)$line['paid_at'];
        if (preg_match('/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/', $paid, $m)) {
            $paid = $m[3] . '/' . $m[2] . '/' . $m[1] . ' ' . $m[4] . ':' . $m[5];
        }
        $cols = [
            (string)$year,
            (string)$line['guide_name'],
            (string)$line['cpf'],
            (string)$line['cnpj'],
            $paid,
            (string)$line['origin_label'],
            (string)$line['reservation_id'],
            (string)$line['title'],
        ];
        if ($withPlatform) {
            $cols[] = $money((int)$line['client_cents']);
            $cols[] = $money((int)$line['platform_cents']);
        }
        $cols[] = $money((int)$line['guide_cents']);
        if ($withPlatform) {
            $cols[] = (string)$line['end_to_end'];
        }
        $out .= implode(';', array_map($esc, $cols)) . "\r\n";
    }
    if ($withPlatform) {
        $out .= implode(';', array_map($esc, [
            (string)$year, 'TOTAL', '', '', '', '', '', '',
            $money($sumClient), $money($sumPlatform), $money($sumGuide), '',
        ])) . "\r\n";
    } else {
        $out .= implode(';', array_map($esc, [
            (string)$year, 'TOTAL', '', '', '', '', '', '', $money($sumGuide),
        ])) . "\r\n";
    }
    return $out;
}
