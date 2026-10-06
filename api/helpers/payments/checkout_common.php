<?php

declare(strict_types=1);

/**
 * Partes comuns do checkout com cartão (Mercado Pago e Stripe):
 * valida o corpo, confere o valor base no servidor, calcula o preço da forma
 * de pagamento e monta o registro da reserva (storage/pix_reservations).
 */

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../pix_reservation_store.php';
require_once __DIR__ . '/pricing.php';
require_once __DIR__ . '/base_amount.php';

function gcv_checkout_fail(int $code, string $message, string $error = ''): void
{
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

function gcv_checkout_origin(): string
{
    $app = trim((string) ($_ENV['APP_URL'] ?? getenv('APP_URL') ?: ''));
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https');
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
    if ($host === '' && $app !== '') {
        return rtrim($app, '/');
    }
    return ($https ? 'https' : 'http') . '://' . ($host !== '' ? $host : 'localhost');
}

function gcv_checkout_safe_return_path(string $path): string
{
    $path = trim($path);
    if ($path === '' || !str_starts_with($path, '/') || str_starts_with($path, '//') || str_contains($path, '..')) {
        return '/';
    }
    return substr($path, 0, 300);
}

function gcv_checkout_confirm_path(string $locale): string
{
    return $locale === 'en' ? '/en/confirmacao.html' : ($locale === 'es' ? '/es/confirmacao.html' : '/confirmacao.html');
}

/** Rótulo do valor cobrado para recibo/e-mails. */
function gcv_checkout_charged_label(string $currency, int $minor, int $installments = 1): string
{
    $cur = strtolower($currency);
    $num = $cur === 'usd'
        ? 'US$ ' . number_format($minor / 100, 2, '.', ',')
        : 'R$ ' . number_format($minor / 100, 2, ',', '.');
    if ($installments > 1) {
        $num .= ' (' . $installments . 'x)';
    }
    return $num;
}

/**
 * Lê e valida o corpo do checkout. Encerra com erro JSON se inválido.
 *
 * @return array{data:array<string,mixed>, reservation_id:string, email:string, name:string, locale:string, return_path:string, phone:string, base:array<string,mixed>, existing:?array}
 */
function gcv_checkout_read_request(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        gcv_checkout_fail(400, 'Invalid JSON');
    }
    $reservationId = gcv_pix_safe_id((string) ($data['reservation_id'] ?? ''));
    if (!preg_match('/^GCV-[A-Z0-9]{6}$/', $reservationId)) {
        gcv_checkout_fail(422, 'Invalid reservation_id');
    }
    $email = strtolower(trim((string) ($data['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        gcv_checkout_fail(422, 'Invalid email');
    }
    $name = trim((string) ($data['name'] ?? ''));
    if ($name === '') {
        gcv_checkout_fail(422, 'Invalid name');
    }
    $locale = in_array($data['locale'] ?? 'pt', ['pt', 'en', 'es'], true) ? (string) $data['locale'] : 'pt';

    $base = gcv_pay_resolve_base_amount($data);
    if (empty($base['ok'])) {
        $err = (string) ($base['error'] ?? 'invalid_amount');
        $msg = $err === 'price_changed' || $err === 'amount_mismatch'
            ? 'O preço deste passeio mudou. Atualize a página e tente de novo.'
            : 'Valor inválido.';
        gcv_checkout_fail(409, $msg, $err);
    }

    $existing = gcv_pix_read_reservation($reservationId);
    if ($existing && in_array(gcv_pix_effective_status($existing), ['PAID', 'AUTHORIZED', 'CARD_SAVED'], true)) {
        gcv_checkout_fail(409, 'Reservation already paid');
    }

    $phone = trim((string) ($data['phone'] ?? ''));
    $digits = preg_replace('/\D+/', '', $phone) ?? '';
    if (strlen($digits) < 10 || strlen($digits) > 15) {
        $phone = '';
    }

    return [
        'data' => $data,
        'reservation_id' => $reservationId,
        'email' => $email,
        'name' => function_exists('mb_substr') ? mb_substr($name, 0, 160) : substr($name, 0, 160),
        'locale' => $locale,
        'return_path' => gcv_checkout_safe_return_path((string) ($data['return_path'] ?? '/')),
        'phone' => $phone,
        'base' => $base,
        'existing' => $existing,
    ];
}

/**
 * Registro da reserva para pagamento com cartão.
 * amount = valor base (Pix/tarifário) → venda e repasse ao guia não mudam;
 * o que o cliente paga a mais fica em charged_* e no registro de transações.
 *
 * @param array<string,mixed> $req   saída de gcv_checkout_read_request
 * @param array<string,mixed> $quote saída de gcv_pay_quote
 * @return array<string,mixed>
 */
function gcv_checkout_build_record(array $req, array $quote, string $gateway): array
{
    $data = $req['data'];
    $baseCents = (int) $quote['base_cents'];
    $rec = [
        'reservation_id' => $req['reservation_id'],
        'status' => 'PENDING',
        'amount' => round($baseCents / 100, 2),
        'amount_cents' => $baseCents,
        'txid' => '',
        'brcode' => '',
        'pix_mode' => $gateway,
        'payment_method' => 'card',
        'payment_option' => $quote['method'],
        'gateway' => $gateway,
        'charged_currency' => strtoupper((string) $quote['currency']),
        'charged_minor' => (int) $quote['charge_minor'],
        'charged_brl_cents' => (int) $quote['total_brl_cents'],
        'surcharge_cents' => (int) $quote['surcharge_cents'],
        'surcharge_pct' => (float) $quote['surcharge_pct'],
        'charged_label' => gcv_checkout_charged_label((string) $quote['currency'], (int) $quote['charge_minor']),
        'price_review' => !empty($req['base']['price_review']) || empty($req['base']['verified']),
        'locale' => $req['locale'],
        'trips' => is_array($data['trips'] ?? null) ? $data['trips'] : [],
        'created_at' => gmdate('c'),
        'expires_at' => gmdate('c', time() + 86400),
        'paid_at' => null,
        'paid_source' => null,
        'email' => $req['email'],
        'name' => $req['name'],
        'customer_name' => $req['name'],
        'ip' => substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45),
        'return_path' => $req['return_path'],
    ];
    if (isset($quote['fx_rate'])) {
        $rec['fx_rate'] = (float) $quote['fx_rate'];
        $rec['fx_date'] = (string) ($quote['fx_date'] ?? '');
        $rec['fx_spread_pct'] = (float) ($quote['fx_spread_pct'] ?? 0);
    }
    if ($req['phone'] !== '') {
        $rec['phone'] = $req['phone'];
    }
    $ie = $data['incl_excl'] ?? $data['inclExcl'] ?? null;
    if (is_array($ie)) {
        $rec['incl_excl'] = $ie;
    }
    if (is_array($data['packages'] ?? null) && $data['packages']) {
        $rec['packages'] = $data['packages'];
    }
    return $rec;
}
