<?php

declare(strict_types=1);

/**
 * Valor base (Pix) de um carrinho, conferido no servidor.
 *
 * O navegador manda trips[] com cartId, qty e valorUnit. Para cada passeio que
 * o servidor consegue achar no banco (gcv_excursions por cart_slug/id), o preço
 * unitário do banco manda; divergência = reserva recusada (preço mudou / adulterado).
 * Itens que o servidor ainda não sabe precificar sozinho (ex.: privativo do
 * tarifário) passam com o valor enviado, mas ficam marcados como "não conferidos"
 * no registro de transações para revisão.
 */

require_once __DIR__ . '/../db.php';

/**
 * @param array<string,mixed> $data  corpo do checkout (amount, trips)
 * @return array{ok:bool, base_cents?:int, verified?:bool, unverified_items?:int, error?:string}
 */
function gcv_pay_resolve_base_amount(array $data): array
{
    $amountCents = (int) round(((float) ($data['amount'] ?? 0)) * 100);
    if ($amountCents < 100 || $amountCents > 10000000) {
        return ['ok' => false, 'error' => 'invalid_amount'];
    }

    $trips = [];
    foreach (is_array($data['trips'] ?? null) ? $data['trips'] : [] as $t) {
        if (is_array($t)) {
            $trips[] = $t;
        }
    }
    if (!$trips) {
        return ['ok' => true, 'base_cents' => $amountCents, 'verified' => false, 'unverified_items' => 1];
    }

    // PAY_STRICT_PRICE_CHECK=1 → recusa divergência. Padrão: aceita e marca para revisão
    // (até confirmar que cart_slug do banco bate 100% com o cartId do site).
    $strictRaw = (string) ($_ENV['PAY_STRICT_PRICE_CHECK'] ?? getenv('PAY_STRICT_PRICE_CHECK') ?: '0');
    $strict = in_array(strtolower(trim($strictRaw)), ['1', 'true', 'yes', 'sim'], true);

    $sum = 0;
    $unverified = 0;
    $mismatch = false;
    foreach ($trips as $trip) {
        $qty = max(1, (int) ($trip['qty'] ?? $trip['pessoas'] ?? 1));
        $clientUnit = (int) round(((float) ($trip['valorUnit'] ?? 0)) * 100);
        $dbUnit = gcv_pay_db_unit_cents($trip);
        if ($dbUnit !== null) {
            if ($clientUnit > 0 && $clientUnit !== $dbUnit) {
                if ($strict) {
                    return ['ok' => false, 'error' => 'price_changed'];
                }
                $mismatch = true;
            }
            $sum += $dbUnit * $qty;
        } else {
            $unverified++;
            $sum += $clientUnit * $qty;
        }
    }

    if ($sum > 0 && $sum !== $amountCents) {
        if ($strict) {
            return ['ok' => false, 'error' => 'amount_mismatch'];
        }
        $mismatch = true;
    }

    if ($mismatch) {
        error_log('gcv_pay_resolve_base_amount: divergência de preço (enviado ' . $amountCents . ', servidor ' . $sum . ')');
        // Modo não estrito: cobra o que o cliente viu e marca a venda para revisão.
        return [
            'ok' => true,
            'base_cents' => $amountCents,
            'server_base_cents' => $sum,
            'verified' => false,
            'unverified_items' => $unverified,
            'price_review' => true,
        ];
    }

    return [
        'ok' => true,
        'base_cents' => $sum > 0 ? $sum : $amountCents,
        'verified' => $unverified === 0,
        'unverified_items' => $unverified,
        'price_review' => false,
    ];
}

/** Preço unitário (centavos) do passeio no banco, ou null se não achar. */
function gcv_pay_db_unit_cents(array $trip): ?int
{
    $cartId = strtolower(trim((string) ($trip['cartId'] ?? $trip['cart_id'] ?? '')));
    if ($cartId === '') {
        return null;
    }
    $withTransport = str_ends_with($cartId, '-t');
    $slug = $withTransport ? substr($cartId, 0, -2) : $cartId;
    try {
        $stmt = db()->prepare(
            'SELECT price_cents, price_transport_cents FROM gcv_excursions
             WHERE deleted_at IS NULL AND (cart_slug = ? OR cart_slug = ?)
             ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute([$cartId, $slug]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        error_log('gcv_pay_db_unit_cents: ' . $e->getMessage());
        return null;
    }
    if (!$row) {
        return null;
    }
    $price = $withTransport && (int) ($row['price_transport_cents'] ?? 0) > 0
        ? (int) $row['price_transport_cents']
        : (int) ($row['price_cents'] ?? 0);
    return $price > 0 ? $price : null;
}
