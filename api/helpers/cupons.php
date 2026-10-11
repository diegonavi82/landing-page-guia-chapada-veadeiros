<?php

declare(strict_types=1);

/**
 * Cupons do carrinho de passeios.
 *
 * Tipos:
 * - total:  R$ ou % sobre o total do carrinho
 * - pessoa: R$ ou % por pessoa (o % incide no total, que é a soma das pessoas)
 * - grupo:  só vale com mais pessoas do que o mínimo; o desconto pode ser no total ou por pessoa
 *
 * O desconto nunca deixa o pagamento abaixo de R$ 1,00.
 */

require_once __DIR__ . '/db.php';

/** @return list<array<string,mixed>> */
function gcv_cupons_listar(PDO $pdo): array
{
    $raw = gcv_cupons_ler_json($pdo);
    $out = [];
    foreach ($raw as $row) {
        if (!is_array($row)) {
            continue;
        }
        $norm = gcv_cupom_normalizar($row);
        if ($norm['codigo'] === '') {
            continue;
        }
        $out[] = $norm;
    }
    return $out;
}

/** @param list<array<string,mixed>> $rows */
function gcv_cupons_gravar(PDO $pdo, array $rows): void
{
    $payload = [];
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $norm = gcv_cupom_normalizar($row);
        if ($norm['codigo'] === '') {
            continue;
        }
        $payload[] = $norm;
    }
    $json = json_encode(array_values($payload), JSON_UNESCAPED_UNICODE);
    $check = $pdo->prepare('SELECT id FROM gcv_settings WHERE key_name = ? LIMIT 1');
    $check->execute(['cupons']);
    if ($check->fetch()) {
        $pdo->prepare('UPDATE gcv_settings SET value = ? WHERE key_name = ?')->execute([$json, 'cupons']);
    } else {
        $pdo->prepare('INSERT INTO gcv_settings (key_name, value, label, type) VALUES (?,?,?,?)')->execute([
            'cupons',
            $json,
            'Cupons de desconto dos passeios',
            'json',
        ]);
    }
}

/**
 * @param array<string,mixed> $row
 * @return array{id:string,codigo:string,ativo:bool,tipo:string,modo:string,valor:int,minimo_pessoas:int,alcance:string}
 */
function gcv_cupom_normalizar(array $row): array
{
    $tipo = (string) ($row['tipo'] ?? 'total');
    if (!in_array($tipo, ['total', 'pessoa', 'grupo'], true)) {
        $tipo = 'total';
    }
    $modo = (string) ($row['modo'] ?? 'fixo');
    if (!in_array($modo, ['fixo', 'percentual'], true)) {
        $modo = 'fixo';
    }
    $alcance = (string) ($row['alcance'] ?? ($tipo === 'pessoa' ? 'pessoa' : 'total'));
    if (!in_array($alcance, ['total', 'pessoa'], true)) {
        $alcance = 'total';
    }
    $codigo = strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', (string) ($row['codigo'] ?? '')));
    $valor = (int) ($row['valor'] ?? 0);
    if ($modo === 'percentual') {
        $valor = max(1, min(100, $valor));
    } else {
        $valor = max(1, $valor);
    }
    $min = max(0, (int) ($row['minimo_pessoas'] ?? 0));
    if ($tipo === 'grupo') {
        $min = max(1, $min);
    } else {
        $min = 0;
        $alcance = $tipo === 'pessoa' ? 'pessoa' : 'total';
    }

    return [
        'id' => trim((string) ($row['id'] ?? '')),
        'codigo' => $codigo,
        'ativo' => !array_key_exists('ativo', $row) || (bool) $row['ativo'],
        'tipo' => $tipo,
        'modo' => $modo,
        'valor' => $valor,
        'minimo_pessoas' => $min,
        'alcance' => $alcance,
    ];
}

/**
 * @return array{ok:bool,desconto_cents?:int,error?:string,minimo_pessoas?:int,cupom?:array<string,mixed>}
 */
function gcv_cupom_aplicar_codigo(string $codigo, int $pessoas, int $totalCents, string $locale = 'pt'): array
{
    $codigo = strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $codigo));
    if ($codigo === '') {
        return ['ok' => false, 'error' => 'empty_code', 'message' => gcv_cupom_msg('empty_code', $locale, 0)];
    }
    try {
        $lista = gcv_cupons_listar(db());
    } catch (Throwable $e) {
        error_log('gcv_cupom_aplicar_codigo: ' . $e->getMessage());
        return ['ok' => false, 'error' => 'unavailable', 'message' => gcv_cupom_msg('unavailable', $locale, 0)];
    }
    $found = null;
    foreach ($lista as $cupom) {
        if ($cupom['codigo'] === $codigo) {
            $found = $cupom;
            break;
        }
    }
    if ($found === null) {
        return ['ok' => false, 'error' => 'not_found', 'message' => gcv_cupom_msg('not_found', $locale, 0)];
    }
    $calc = gcv_cupom_desconto_cents($found, $pessoas, $totalCents);
    if (empty($calc['ok'])) {
        $err = (string) ($calc['error'] ?? 'invalid');
        $min = (int) ($calc['minimo_pessoas'] ?? $found['minimo_pessoas']);
        return ['ok' => false, 'error' => $err, 'minimo_pessoas' => $min, 'message' => gcv_cupom_msg($err, $locale, $min)];
    }
    $off = gcv_cupom_teto_desconto($totalCents, (int) $calc['desconto_cents']);
    if ($off < 1) {
        return ['ok' => false, 'error' => 'zero', 'message' => gcv_cupom_msg('zero', $locale, 0)];
    }

    return [
        'ok' => true,
        'desconto_cents' => $off,
        'cupom' => $found,
    ];
}

/**
 * @param array{ativo?:bool,tipo?:string,modo?:string,valor?:int,minimo_pessoas?:int,alcance?:string} $cupom
 * @return array{ok:bool,desconto_cents?:int,error?:string,minimo_pessoas?:int}
 */
function gcv_cupom_desconto_cents(array $cupom, int $pessoas, int $totalCents): array
{
    if (empty($cupom['ativo'])) {
        return ['ok' => false, 'error' => 'inactive'];
    }
    $pessoas = max(0, $pessoas);
    $totalCents = max(0, $totalCents);
    $tipo = (string) ($cupom['tipo'] ?? 'total');
    $modo = (string) ($cupom['modo'] ?? 'fixo');
    $valor = (int) ($cupom['valor'] ?? 0);
    $alcance = (string) ($cupom['alcance'] ?? 'total');
    if ($tipo === 'grupo') {
        $min = (int) ($cupom['minimo_pessoas'] ?? 0);
        if ($pessoas <= $min) {
            return ['ok' => false, 'error' => 'min_people', 'minimo_pessoas' => $min];
        }
        $tipo = $alcance === 'pessoa' ? 'pessoa' : 'total';
    }
    if ($totalCents < 100) {
        return ['ok' => false, 'error' => 'zero'];
    }
    if ($tipo === 'pessoa' && $modo === 'fixo') {
        $off = $valor * max(1, $pessoas);
    } elseif ($modo === 'percentual') {
        $off = (int) round($totalCents * min(100, max(0, $valor)) / 100);
    } else {
        $off = $valor;
    }
    $off = max(0, min($totalCents, $off));
    if ($off < 1) {
        return ['ok' => false, 'error' => 'zero'];
    }

    return ['ok' => true, 'desconto_cents' => $off];
}

function gcv_cupom_teto_desconto(int $totalCents, int $off): int
{
    $due = $totalCents - $off;
    if ($due < 100) {
        $off = $totalCents - 100;
    }

    return max(0, $off);
}

/**
 * Recalcula o valor cobrado (centavos) quando o checkout manda um cupom.
 *
 * @param array<string,mixed> $data
 * @return array{aplicado:bool,invalido?:bool,esperado_cents:int,desconto_cents:int,codigo?:string,message?:string}
 */
function gcv_cupom_sobre_carrinho(array $data, int $grossCents): array
{
    $codigo = strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', (string) ($data['cupom'] ?? '')));
    if ($codigo === '' || $grossCents < 1) {
        return ['aplicado' => false, 'esperado_cents' => $grossCents, 'desconto_cents' => 0];
    }
    $locale = in_array($data['locale'] ?? 'pt', ['pt', 'en', 'es'], true) ? (string) $data['locale'] : 'pt';
    $pessoas = 0;
    foreach (is_array($data['trips'] ?? null) ? $data['trips'] : [] as $trip) {
        if (!is_array($trip)) {
            continue;
        }
        $pessoas += max(1, (int) ($trip['pessoas'] ?? $trip['qty'] ?? 1));
    }
    if ($pessoas < 1) {
        $pessoas = 1;
    }
    $calc = gcv_cupom_aplicar_codigo($codigo, $pessoas, $grossCents, $locale);
    if (empty($calc['ok'])) {
        return [
            'aplicado' => false,
            'invalido' => true,
            'esperado_cents' => $grossCents,
            'desconto_cents' => 0,
            'message' => (string) ($calc['message'] ?? ''),
        ];
    }
    $off = (int) $calc['desconto_cents'];

    return [
        'aplicado' => true,
        'esperado_cents' => max(100, $grossCents - $off),
        'desconto_cents' => $off,
        'codigo' => $codigo,
    ];
}

function gcv_cupom_msg(string $error, string $locale, int $min): string
{
    $locale = in_array($locale, ['pt', 'en', 'es'], true) ? $locale : 'pt';
    $msgs = [
        'pt' => [
            'empty_code' => 'Informe o código do cupom.',
            'not_found' => 'Cupom não encontrado.',
            'inactive' => 'Este cupom está desativado.',
            'min_people' => 'Este cupom vale quando o carrinho tem mais de ' . $min . ' pessoas.',
            'zero' => 'Este cupom não gera desconto neste carrinho.',
            'unavailable' => 'Não foi possível conferir o cupom agora.',
        ],
        'en' => [
            'empty_code' => 'Enter the coupon code.',
            'not_found' => 'Coupon not found.',
            'inactive' => 'This coupon is turned off.',
            'min_people' => 'This coupon applies when the cart has more than ' . $min . ' people.',
            'zero' => 'This coupon does not discount this cart.',
            'unavailable' => 'Could not check the coupon right now.',
        ],
        'es' => [
            'empty_code' => 'Escribe el código del cupón.',
            'not_found' => 'Cupón no encontrado.',
            'inactive' => 'Este cupón está desactivado.',
            'min_people' => 'Este cupón vale cuando el carrito tiene más de ' . $min . ' personas.',
            'zero' => 'Este cupón no genera descuento en este carrito.',
            'unavailable' => 'No se pudo comprobar el cupón ahora.',
        ],
    ];

    return $msgs[$locale][$error] ?? $msgs['pt']['not_found'];
}

/** @return list<array<string,mixed>> */
function gcv_cupons_ler_json(PDO $pdo): array
{
    try {
        $stmt = $pdo->prepare('SELECT value FROM gcv_settings WHERE key_name = ? LIMIT 1');
        $stmt->execute(['cupons']);
        $raw = json_decode((string) $stmt->fetchColumn(), true);
    } catch (Throwable $e) {
        return [];
    }

    return is_array($raw) ? $raw : [];
}
