<?php

declare(strict_types=1);

/**
 * Preço por forma de pagamento — única fonte de verdade (o navegador só mostra).
 *
 *   pix      → valor do tarifário (base)
 *   card_br  → base + PAY_CARD_BR_PCT (padrão 15%), Mercado Pago, até PAY_MP_MAX_INSTALLMENTS (4x) sem juros
 *   card_intl→ base + PAY_CARD_INTL_PCT (padrão 20%), Stripe em USD:
 *              USD = (base × 1,20) ÷ PTAX venda × (1 + PAY_FX_SPREAD_PCT) (padrão 4%)
 *
 * Valores em centavos (int). Sempre arredonda para cima no centavo.
 */

require_once __DIR__ . '/../db.php';

const GCV_PAY_METHODS = ['pix', 'card_br', 'card_intl'];

function gcv_pay_env_float(string $key, float $default): float
{
    $v = $_ENV[$key] ?? getenv($key);
    if (!is_string($v) || trim($v) === '' || !is_numeric(str_replace(',', '.', trim($v)))) {
        return $default;
    }
    return (float) str_replace(',', '.', trim($v));
}

/** @return array{card_br_pct:float,card_intl_pct:float,fx_spread_pct:float,mp_max_installments:int,intl_currency:string} */
function gcv_pay_config(): array
{
    $maxInst = (int) gcv_pay_env_float('PAY_MP_MAX_INSTALLMENTS', 4);
    $cur = strtolower(trim((string) ($_ENV['PAY_INTL_CURRENCY'] ?? getenv('PAY_INTL_CURRENCY') ?: 'usd')));
    return [
        'card_br_pct' => max(0.0, gcv_pay_env_float('PAY_CARD_BR_PCT', 15.0)),
        'card_intl_pct' => max(0.0, gcv_pay_env_float('PAY_CARD_INTL_PCT', 20.0)),
        'fx_spread_pct' => max(0.0, gcv_pay_env_float('PAY_FX_SPREAD_PCT', 4.0)),
        'mp_max_installments' => max(1, min(12, $maxInst)),
        'intl_currency' => in_array($cur, ['usd', 'brl'], true) ? $cur : 'usd',
    ];
}

function gcv_pay_normalize_method(string $method): string
{
    $m = strtolower(trim($method));
    $alias = ['card' => 'card_br', 'mercadopago' => 'card_br', 'mp' => 'card_br', 'stripe' => 'card_intl', 'intl' => 'card_intl'];
    $m = $alias[$m] ?? $m;
    return in_array($m, GCV_PAY_METHODS, true) ? $m : '';
}

/** Acréscimo em centavos, arredondado para cima. */
function gcv_pay_apply_pct(int $baseCents, float $pct): int
{
    if ($pct <= 0) {
        return $baseCents;
    }
    // inteiro em base 10000 para evitar erro de ponto flutuante (15% → 11500)
    $factor = (int) round((100 + $pct) * 100);
    return intdiv($baseCents * $factor + 9999, 10000);
}

/**
 * Cotação PTAX (venda) do dólar — Banco Central. Cache diário em storage/fx.
 * Fim de semana/feriado: usa o último dia útil (até 7 dias atrás).
 *
 * @return array{rate:float,date:string,source:string}|null
 */
function gcv_pay_usd_brl_rate(): ?array
{
    $override = gcv_pay_env_float('PAY_USD_BRL_RATE_OVERRIDE', 0);
    if ($override > 0) {
        return ['rate' => $override, 'date' => gmdate('Y-m-d'), 'source' => 'override'];
    }

    $dir = dirname(__DIR__, 2) . '/storage/fx';
    $file = $dir . '/usd_brl.json';
    $today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');

    $cached = null;
    if (is_readable($file)) {
        $cached = json_decode((string) file_get_contents($file), true);
        if (is_array($cached) && ($cached['fetched_on'] ?? '') === $today && (float) ($cached['rate'] ?? 0) > 0) {
            return ['rate' => (float) $cached['rate'], 'date' => (string) $cached['date'], 'source' => 'ptax'];
        }
    }

    $fresh = gcv_pay_fetch_ptax();
    if ($fresh) {
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        @file_put_contents($file, json_encode($fresh + ['fetched_on' => $today]), LOCK_EX);
        return $fresh;
    }

    // Banco Central fora do ar: usa a última cotação salva (até 5 dias).
    if (is_array($cached) && (float) ($cached['rate'] ?? 0) > 0) {
        $age = (strtotime($today) - strtotime((string) ($cached['date'] ?? '1970-01-01'))) / 86400;
        if ($age <= 5) {
            return ['rate' => (float) $cached['rate'], 'date' => (string) $cached['date'], 'source' => 'ptax_cache'];
        }
    }
    return null;
}

/** @return array{rate:float,date:string,source:string}|null */
function gcv_pay_fetch_ptax(): ?array
{
    if (!function_exists('curl_init')) {
        return null;
    }
    $tz = new DateTimeZone('America/Sao_Paulo');
    for ($i = 0; $i < 7; $i++) {
        $d = (new DateTimeImmutable('now', $tz))->modify("-{$i} day");
        $url = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/'
            . "CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='" . $d->format('m-d-Y') . "'&\$format=json";
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8]);
        $raw = curl_exec($ch);
        $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($http !== 200 || !is_string($raw)) {
            continue;
        }
        $json = json_decode($raw, true);
        $rows = is_array($json['value'] ?? null) ? $json['value'] : [];
        if ($rows) {
            $last = end($rows);
            $rate = (float) ($last['cotacaoVenda'] ?? 0);
            if ($rate > 1 && $rate < 50) {
                return ['rate' => $rate, 'date' => $d->format('Y-m-d'), 'source' => 'ptax'];
            }
        }
    }
    return null;
}

/**
 * Cotação de uma forma de pagamento para um valor base (Pix) em centavos.
 *
 * @return array<string,mixed> ok=false se não der para cotar (ex.: sem câmbio)
 */
function gcv_pay_quote(int $baseCents, string $method): array
{
    $method = gcv_pay_normalize_method($method);
    if ($method === '' || $baseCents < 100) {
        return ['ok' => false, 'error' => 'invalid_quote'];
    }
    $cfg = gcv_pay_config();

    if ($method === 'pix') {
        return [
            'ok' => true, 'method' => 'pix', 'gateway' => 'sicoob',
            'base_cents' => $baseCents, 'surcharge_pct' => 0.0, 'surcharge_cents' => 0,
            'total_brl_cents' => $baseCents, 'currency' => 'brl', 'charge_minor' => $baseCents,
            'max_installments' => 1,
        ];
    }

    if ($method === 'card_br') {
        $total = gcv_pay_apply_pct($baseCents, $cfg['card_br_pct']);
        return [
            'ok' => true, 'method' => 'card_br', 'gateway' => 'mercadopago',
            'base_cents' => $baseCents, 'surcharge_pct' => $cfg['card_br_pct'],
            'surcharge_cents' => $total - $baseCents,
            'total_brl_cents' => $total, 'currency' => 'brl', 'charge_minor' => $total,
            'max_installments' => $cfg['mp_max_installments'],
            'installment_cents' => intdiv($total + $cfg['mp_max_installments'] - 1, $cfg['mp_max_installments']),
        ];
    }

    // card_intl (Stripe)
    $totalBrl = gcv_pay_apply_pct($baseCents, $cfg['card_intl_pct']);
    $out = [
        'ok' => true, 'method' => 'card_intl', 'gateway' => 'stripe',
        'base_cents' => $baseCents, 'surcharge_pct' => $cfg['card_intl_pct'],
        'surcharge_cents' => $totalBrl - $baseCents,
        'total_brl_cents' => $totalBrl, 'max_installments' => 1,
    ];
    if ($cfg['intl_currency'] === 'brl') {
        return $out + ['currency' => 'brl', 'charge_minor' => $totalBrl];
    }
    $fx = gcv_pay_usd_brl_rate();
    if (!$fx) {
        return ['ok' => false, 'error' => 'fx_unavailable'];
    }
    // USD com spread: (BRL ÷ PTAX) × (1 + spread), arredondado para cima no centavo de dólar
    $usd = (int) ceil(round(($totalBrl / $fx['rate']) * (1 + $cfg['fx_spread_pct'] / 100), 4));
    return $out + [
        'currency' => 'usd',
        'charge_minor' => max(50, $usd),
        'fx_rate' => $fx['rate'],
        'fx_date' => $fx['date'],
        'fx_source' => $fx['source'],
        'fx_spread_pct' => $cfg['fx_spread_pct'],
    ];
}

/** @return array<string,array<string,mixed>> todas as formas */
function gcv_pay_quote_all(int $baseCents): array
{
    $out = [];
    foreach (GCV_PAY_METHODS as $m) {
        $out[$m] = gcv_pay_quote($baseCents, $m);
    }
    return $out;
}
