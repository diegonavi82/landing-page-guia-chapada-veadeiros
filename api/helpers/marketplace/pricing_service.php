<?php
declare(strict_types=1);

/**
 * Cálculo de preço marketplace (centralizado no backend).
 *
 * Regra de arredondamento comercial:
 * 1) guideNet + comissão
 * 2) eliminar centavos (ceil para inteiro de reais)
 * 3) menor inteiro ≥ valor que seja divisível por 5 OU por 8
 *
 * Exemplos: 212,28→215 | 232,00→232 | 238,20→240
 */

function gcv_guide_net_setting_reais(string $key, int $fallback): int
{
    $fallback = max(1, $fallback);
    try {
        $settingsFile = dirname(__DIR__) . '/settings.php';
        if (is_file($settingsFile)) {
            require_once $settingsFile;
        }
        if (!function_exists('setting')) {
            return $fallback;
        }
        $n = (int)round((float)setting($key, (string)$fallback));
        return $n >= 1 ? $n : $fallback;
    } catch (Throwable $e) {
        return $fallback;
    }
}

/** Mínimo do valor a receber por pessoa (guia), em centavos. */
function gcv_guide_net_min_cents(): int
{
    return gcv_guide_net_setting_reais('guide_net_min_reais', 50) * 100;
}

/** Máximo padrão do valor a receber por pessoa (guia), em centavos. */
function gcv_guide_net_max_default_cents(): int
{
    $min = (int)(gcv_guide_net_min_cents() / 100);
    $max = gcv_guide_net_setting_reais('guide_net_max_reais', 160);
    if ($max < $min) {
        $max = $min;
    }
    return $max * 100;
}

/** Máximo na Cachoeira do Dragão, em centavos. */
function gcv_guide_net_max_dragao_cents(): int
{
    $base = (int)(gcv_guide_net_max_default_cents() / 100);
    $dragao = gcv_guide_net_setting_reais('guide_net_max_dragao_reais', 190);
    if ($dragao < $base) {
        $dragao = $base;
    }
    return $dragao * 100;
}

function gcv_attraction_is_dragao(?int $attractionId = null, ?string $slug = null, ?string $title = null): bool
{
    $blob = strtolower(trim((string)$slug . ' ' . (string)$title));
    $blob = strtr($blob, [
        'á' => 'a', 'à' => 'a', 'ã' => 'a', 'â' => 'a',
        'é' => 'e', 'ê' => 'e', 'í' => 'i',
        'ó' => 'o', 'ô' => 'o', 'õ' => 'o',
        'ú' => 'u', 'ç' => 'c',
    ]);
    if ($blob !== '' && str_contains($blob, 'dragao')) {
        return true;
    }
    if ($attractionId && $attractionId > 0) {
        try {
            if (!function_exists('db')) {
                return false;
            }
            $st = db()->prepare('SELECT slug, title_pt FROM gcv_attractions WHERE id = ? LIMIT 1');
            $st->execute([$attractionId]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if ($row) {
                return gcv_attraction_is_dragao(null, (string)($row['slug'] ?? ''), (string)($row['title_pt'] ?? ''));
            }
        } catch (Throwable $e) {
            return false;
        }
    }
    return false;
}

/** Máximo com transporte incluso, em centavos. */
function gcv_guide_net_max_transport_cents(): int
{
    $base = (int)(gcv_guide_net_max_default_cents() / 100);
    $transport = gcv_guide_net_setting_reais('guide_net_max_transport_reais', 550);
    if ($transport < $base) {
        $transport = $base;
    }
    return $transport * 100;
}

/** Máximo do valor a receber por pessoa (guia), em centavos. */
function gcv_guide_net_max_cents(
    ?int $attractionId = null,
    ?string $attractionSlug = null,
    ?string $attractionTitle = null,
    bool $includeTransport = false
): int {
    $max = gcv_attraction_is_dragao($attractionId, $attractionSlug, $attractionTitle)
        ? gcv_guide_net_max_dragao_cents()
        : gcv_guide_net_max_default_cents();
    if ($includeTransport) {
        $withTransport = gcv_guide_net_max_transport_cents();
        if ($withTransport > $max) {
            $max = $withTransport;
        }
    }
    return $max;
}

/**
 * Valida faixa do valor a receber na publicação (não no preview ao digitar).
 */
function gcv_guide_net_range_error(
    int $cents,
    ?int $attractionId = null,
    ?string $attractionSlug = null,
    bool $includeTransport = false
): ?string {
    $min = gcv_guide_net_min_cents();
    if ($cents < $min) {
        return 'Valor a receber por pessoa: mínimo R$ ' . number_format($min / 100, 2, ',', '.');
    }
    $max = gcv_guide_net_max_cents($attractionId, $attractionSlug, null, $includeTransport);
    if ($cents > $max) {
        $reais = number_format($max / 100, 2, ',', '.');
        if ($includeTransport) {
            return 'Valor a receber por pessoa: máximo R$ ' . $reais . ' (com transporte incluso)';
        }
        if (gcv_attraction_is_dragao($attractionId, $attractionSlug)) {
            return 'Valor a receber por pessoa: máximo R$ ' . $reais . ' (Cachoeira do Dragão)';
        }
        return 'Valor a receber por pessoa: máximo R$ ' . $reais;
    }
    return null;
}

/**
 * @return array{
 *   guide_net_cents:int,
 *   commission_pct:float,
 *   commission_rule_id:?int,
 *   commission_scope:string,
 *   commission_cents:int,
 *   price_before_round_cents:int,
 *   rounding_diff_cents:int,
 *   final_price_cents:int,
 *   final_price_reais:int
 * }
 */
function gcv_pricing_from_guide_net(
    int $guideNetCents,
    ?int $excursionId = null,
    ?int $guideUserId = null,
    ?string $categoryKey = null,
    ?int $cityId = null
): array {
    require_once __DIR__ . '/commission_service.php';

    if ($guideNetCents < 100) {
        throw new InvalidArgumentException('Valor líquido do guia deve ser ≥ R$ 1,00');
    }

    $rule = gcv_commission_resolve($excursionId, $guideUserId, $categoryKey, $cityId);
    $pct = (float)$rule['pct'];
    if ($pct < 0 || $pct >= 100) {
        throw new InvalidArgumentException('Percentual de comissão inválido na regra ativa');
    }

    // preço = guideNet / (1 - pct/100)
    $divisor = 1 - ($pct / 100.0);
    if ($divisor <= 0) {
        throw new InvalidArgumentException('Comissão inviável para cálculo de preço');
    }

    $priceBeforeRound = (int)round($guideNetCents / $divisor);
    $commissionCents = max(0, $priceBeforeRound - $guideNetCents);

    $finalReais = gcv_pricing_commercial_round_reais($priceBeforeRound / 100.0);
    $finalCents = $finalReais * 100;
    $roundingDiff = max(0, $finalCents - $priceBeforeRound);

    return [
        'guide_net_cents' => $guideNetCents,
        'commission_pct' => $pct,
        'commission_rule_id' => $rule['rule_id'],
        'commission_scope' => $rule['scope_type'],
        'commission_cents' => $commissionCents + $roundingDiff,
        'price_before_round_cents' => $priceBeforeRound,
        'rounding_diff_cents' => $roundingDiff,
        'final_price_cents' => $finalCents,
        'final_price_reais' => $finalReais,
    ];
}

/**
 * Arredonda SEMPRE para cima ao primeiro inteiro ≥ valor
 * que seja divisível por 5 ou por 8.
 * Centavos são eliminados (ceil para reais inteiros primeiro).
 */
function gcv_pricing_commercial_round_reais(float $amountReais): int
{
    if (!is_finite($amountReais) || $amountReais < 0) {
        throw new InvalidArgumentException('Valor inválido para arredondamento');
    }
    // eliminar centavos → ceil para inteiro
    $n = (int)ceil($amountReais - 1e-9);
    if ($n <= 0) {
        $n = 0;
    }
    while ($n % 5 !== 0 && $n % 8 !== 0) {
        $n++;
        if ($n > 100000000) {
            throw new RuntimeException('Falha no arredondamento comercial');
        }
    }
    return $n;
}

/**
 * Preview sem persistir (para UI do guia consultar preço estimado).
 *
 * @return array<string,mixed>
 */
function gcv_pricing_preview_guide_net(
    int $guideNetCents,
    ?int $guideUserId = null,
    ?string $categoryKey = null,
    ?int $cityId = null,
    ?int $excursionId = null
): array {
    return gcv_pricing_from_guide_net($guideNetCents, $excursionId, $guideUserId, $categoryKey, $cityId);
}

/**
 * Modo administrativo: admin define preço final e repasse previsto.
 *
 * @return array{
 *   final_price_cents:int,
 *   guide_payout_planned_cents:int,
 *   platform_margin_cents:int,
 *   commission_pct:float,
 *   commission_rule_id:?int
 * }
 */
function gcv_pricing_administrative(
    int $finalPriceCents,
    int $guidePayoutPlannedCents,
    ?int $guideUserId = null,
    ?string $categoryKey = null,
    ?int $cityId = null,
    ?int $excursionId = null
): array {
    require_once __DIR__ . '/commission_service.php';

    if ($finalPriceCents < 100) {
        throw new InvalidArgumentException('Preço final inválido');
    }
    if ($guidePayoutPlannedCents < 0 || $guidePayoutPlannedCents > $finalPriceCents) {
        throw new InvalidArgumentException('Repasse previsto ao guia inválido');
    }
    $rule = gcv_commission_resolve($excursionId, $guideUserId, $categoryKey, $cityId);
    $margin = $finalPriceCents - $guidePayoutPlannedCents;
    return [
        'final_price_cents' => $finalPriceCents,
        'guide_payout_planned_cents' => $guidePayoutPlannedCents,
        'platform_margin_cents' => $margin,
        'commission_pct' => (float)$rule['pct'],
        'commission_rule_id' => $rule['rule_id'],
    ];
}
