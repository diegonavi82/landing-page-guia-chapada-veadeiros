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
