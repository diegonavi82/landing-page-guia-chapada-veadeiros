<?php
declare(strict_types=1);

/**
 * Teste local do arredondamento comercial (CLI):
 * php api/helpers/marketplace/_test_rounding.php
 */
require_once __DIR__ . '/pricing_service.php';

$cases = [
    [212.28, 215],
    [232.00, 232],
    [238.20, 240],
    [200.01, 200], // ceil → 201 → sobe até 208 (div 8) — wait check
];

// 200.01 → ceil = 201 → next divisible by 5 or 8: 201,202,203,204,205 → 205
$cases[3] = [200.01, 205];

$failed = 0;
foreach ($cases as [$in, $expected]) {
    $got = gcv_pricing_commercial_round_reais($in);
    $ok = $got === $expected;
    echo ($ok ? 'OK  ' : 'FAIL') . "  {$in} → {$got} (esperado {$expected})\n";
    if (!$ok) {
        $failed++;
    }
}

// guide net 15000 cents (R$150) com 10% → before round = 150/0.90 ≈ 166.667 → 16667 cents → round 168
try {
    // Sem DB: testa só a função de arredondamento do fluxo
    $before = (int)round(15000 / (1 - 0.10));
    $final = gcv_pricing_commercial_round_reais($before / 100.0);
    echo "Fluxo 10% sobre líquido 150: before={$before} cents, final={$final} reais\n";
    $beforeD = (int)round(19000 / (1 - 0.10));
    $finalD = gcv_pricing_commercial_round_reais($beforeD / 100.0);
    echo "Fluxo 10% sobre líquido 190 (Dragão): before={$beforeD} cents, final={$finalD} reais\n";
} catch (Throwable $e) {
    echo 'ERR ' . $e->getMessage() . "\n";
    $failed++;
}

exit($failed > 0 ? 1 : 0);
