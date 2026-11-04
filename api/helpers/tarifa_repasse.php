<?php
declare(strict_types=1);

/**
 * Repasse do guia nas compras do site (catálogo e excursão do admin).
 * A excursão criada pelo guia não passa por aqui: continua líquido + comissão.
 *
 * Sem carro, a tarifa de guiagem manda.
 * Com carro, só a tarifa de translado manda.
 * A base é o PIX da tabela. O acréscimo de outro idioma é dividido ao meio.
 */

function gcv_tarifa_taxas_fixas(): array
{
    return [
        'taxa_privativo_pct' => 20,
        'taxa_excursao_4_reais' => 15,
        'taxa_excursao_5_reais' => 5,
        'taxa_excursao_reais' => 40,
    ];
}

function gcv_tarifa_taxa_int($value, int $min, int $max, int $fallback): int
{
    if ($value === null || $value === '') {
        return $fallback;
    }
    if (!is_numeric($value)) {
        return $fallback;
    }
    $n = (int)round((float)$value);
    if ($n < $min) {
        return $min;
    }
    if ($n > $max) {
        return $max;
    }
    return $n;
}

/** @return array{taxa_privativo_pct:int,taxa_excursao_4_reais:int,taxa_excursao_5_reais:int,taxa_excursao_reais:int} */
function gcv_tarifa_taxas_normalizar(?array $raw): array
{
    $fixas = gcv_tarifa_taxas_fixas();
    $raw = is_array($raw) ? $raw : [];
    return [
        'taxa_privativo_pct' => gcv_tarifa_taxa_int($raw['taxa_privativo_pct'] ?? null, 0, 99, $fixas['taxa_privativo_pct']),
        'taxa_excursao_4_reais' => gcv_tarifa_taxa_int($raw['taxa_excursao_4_reais'] ?? null, 0, 100000, $fixas['taxa_excursao_4_reais']),
        'taxa_excursao_5_reais' => gcv_tarifa_taxa_int($raw['taxa_excursao_5_reais'] ?? null, 0, 100000, $fixas['taxa_excursao_5_reais']),
        'taxa_excursao_reais' => gcv_tarifa_taxa_int($raw['taxa_excursao_reais'] ?? null, 0, 100000, $fixas['taxa_excursao_reais']),
    ];
}

function gcv_tarifa_taxas_globais_ensure(PDO $pdo): void
{
    $fixas = gcv_tarifa_taxas_fixas();
    $rows = [
        ['taxa_guia_privativo_pct', (string)$fixas['taxa_privativo_pct'], 'Modelo global: percentual do privativo sem carro', 'integer'],
        ['taxa_guia_excursao_4_reais', (string)$fixas['taxa_excursao_4_reais'], 'Modelo global: taxa em R$ da excursão sem carro, até 4 pessoas', 'integer'],
        ['taxa_guia_excursao_5_reais', (string)$fixas['taxa_excursao_5_reais'], 'Modelo global: taxa em R$ da excursão sem carro, da 5ª pessoa em diante', 'integer'],
        ['taxa_translado_privativo_pct', (string)$fixas['taxa_privativo_pct'], 'Modelo global: percentual do privativo com carro', 'integer'],
        ['taxa_translado_excursao_reais', (string)$fixas['taxa_excursao_reais'], 'Modelo global: taxa em R$ da excursão com carro, por pessoa', 'integer'],
    ];
    try {
        $check = $pdo->prepare('SELECT id FROM gcv_settings WHERE key_name = ? LIMIT 1');
        $ins = $pdo->prepare('INSERT INTO gcv_settings (key_name, value, label, type) VALUES (?,?,?,?)');
        foreach ($rows as [$key, $val, $text, $type]) {
            $check->execute([$key]);
            if (!$check->fetch()) {
                $ins->execute([$key, $val, $text, $type]);
            }
        }
    } catch (Throwable $e) {
        error_log('taxas globais: ' . $e->getMessage());
    }
}

function gcv_tarifa_setting_int(PDO $pdo, string $key, int $fallback): int
{
    try {
        $stmt = $pdo->prepare('SELECT value FROM gcv_settings WHERE key_name = ? LIMIT 1');
        $stmt->execute([$key]);
        $v = $stmt->fetchColumn();
        if ($v === false || $v === null || $v === '') {
            return $fallback;
        }
        return (int)$v;
    } catch (Throwable $e) {
        return $fallback;
    }
}

/** Modelo usado só para preencher tarifa nova. Não recalcula tarifa já gravada. */
function gcv_tarifa_taxas_globais_get(PDO $pdo): array
{
    gcv_tarifa_taxas_globais_ensure($pdo);
    $fixas = gcv_tarifa_taxas_fixas();
    return [
        'guia' => [
            'taxa_privativo_pct' => gcv_tarifa_taxa_int(gcv_tarifa_setting_int($pdo, 'taxa_guia_privativo_pct', $fixas['taxa_privativo_pct']), 0, 99, $fixas['taxa_privativo_pct']),
            'taxa_excursao_4_reais' => gcv_tarifa_taxa_int(gcv_tarifa_setting_int($pdo, 'taxa_guia_excursao_4_reais', $fixas['taxa_excursao_4_reais']), 0, 100000, $fixas['taxa_excursao_4_reais']),
            'taxa_excursao_5_reais' => gcv_tarifa_taxa_int(gcv_tarifa_setting_int($pdo, 'taxa_guia_excursao_5_reais', $fixas['taxa_excursao_5_reais']), 0, 100000, $fixas['taxa_excursao_5_reais']),
        ],
        'translado' => [
            'taxa_privativo_pct' => gcv_tarifa_taxa_int(gcv_tarifa_setting_int($pdo, 'taxa_translado_privativo_pct', $fixas['taxa_privativo_pct']), 0, 99, $fixas['taxa_privativo_pct']),
            'taxa_excursao_reais' => gcv_tarifa_taxa_int(gcv_tarifa_setting_int($pdo, 'taxa_translado_excursao_reais', $fixas['taxa_excursao_reais']), 0, 100000, $fixas['taxa_excursao_reais']),
        ],
    ];
}

function gcv_tarifa_taxas_globais_save(PDO $pdo, array $body): void
{
    gcv_tarifa_taxas_globais_ensure($pdo);
    $fixas = gcv_tarifa_taxas_fixas();
    $map = [
        'taxa_guia_privativo_pct' => gcv_tarifa_taxa_int($body['taxa_guia_privativo_pct'] ?? null, 0, 99, $fixas['taxa_privativo_pct']),
        'taxa_guia_excursao_4_reais' => gcv_tarifa_taxa_int($body['taxa_guia_excursao_4_reais'] ?? null, 0, 100000, $fixas['taxa_guia_excursao_4_reais']),
        'taxa_guia_excursao_5_reais' => gcv_tarifa_taxa_int($body['taxa_guia_excursao_5_reais'] ?? null, 0, 100000, $fixas['taxa_excursao_5_reais']),
        'taxa_translado_privativo_pct' => gcv_tarifa_taxa_int($body['taxa_translado_privativo_pct'] ?? null, 0, 99, $fixas['taxa_privativo_pct']),
        'taxa_translado_excursao_reais' => gcv_tarifa_taxa_int($body['taxa_translado_excursao_reais'] ?? null, 0, 100000, $fixas['taxa_excursao_reais']),
    ];
    $upd = $pdo->prepare('UPDATE gcv_settings SET value = ? WHERE key_name = ?');
    foreach ($map as $key => $val) {
        $upd->execute([(string)$val, $key]);
    }
}

/** @param array<string,mixed> $taxas */
function gcv_tarifa_validar_taxas(string $tipo, int $excursao, int $excursao5, array $taxas): void
{
    $pct = (int)($taxas['taxa_privativo_pct'] ?? 0);
    if ($pct < 0 || $pct >= 100) {
        throw new InvalidArgumentException('O percentual do privativo tem que ser menor que 100%.');
    }
    if ($tipo === 'guia') {
        $ate4 = (int)($taxas['taxa_excursao_4_reais'] ?? 0);
        $desde5 = (int)($taxas['taxa_excursao_5_reais'] ?? 0);
        if ($excursao > 0 && $ate4 >= $excursao) {
            throw new InvalidArgumentException('A taxa da excursão até 4 pessoas tem que ser menor que o preço do lugar.');
        }
        $preco5 = $excursao5 > 0 ? $excursao5 : $excursao;
        if ($preco5 > 0 && $desde5 >= $preco5) {
            throw new InvalidArgumentException('A taxa da 5ª pessoa tem que ser menor que o preço dessa faixa.');
        }
        return;
    }
    $porPessoa = (int)($taxas['taxa_excursao_reais'] ?? 0);
    if ($excursao > 0 && $porPessoa >= $excursao) {
        throw new InvalidArgumentException('A taxa da excursão com carro tem que ser menor que o preço do lugar.');
    }
}

/**
 * @param array{
 *   modalidade?:string,
 *   com_transporte?:bool,
 *   pessoas?:int,
 *   tabela_cents?:int,
 *   bilingue_extra_cents?:int,
 *   abre_catalogo?:bool,
 *   tarifa?:array<string,mixed>
 * } $in
 * @return array{guia_cents:int,plataforma_cents:int,taxa_cents:int}
 */
function gcv_tarifa_repasse_cents(array $in): array
{
    $modalidade = (string)($in['modalidade'] ?? 'excursao') === 'exclusivo' ? 'exclusivo' : 'excursao';
    $transporte = !empty($in['com_transporte']);
    $pessoas = max(0, (int)($in['pessoas'] ?? 0));
    $tabela = max(0, (int)($in['tabela_cents'] ?? 0));
    $extra = max(0, (int)($in['bilingue_extra_cents'] ?? 0));
    $abre = !empty($in['abre_catalogo']);
    $tarifa = is_array($in['tarifa'] ?? null) ? $in['tarifa'] : [];
    $guiaBi = intdiv($extra, 2);
    $platBi = $extra - $guiaBi;
    if ($pessoas < 1 || $tabela < 1) {
        return ['guia_cents' => $guiaBi, 'plataforma_cents' => $platBi, 'taxa_cents' => 0];
    }
    if ($transporte) {
        if ($modalidade === 'exclusivo') {
            $pct = (int)($tarifa['taxa_privativo_pct'] ?? 0);
            $fee = (int)round($tabela * $pct / 100);
        } else {
            $fee = $pessoas * (int)($tarifa['taxa_excursao_reais'] ?? 0) * 100;
        }
    } elseif ($modalidade === 'exclusivo') {
        $pct = (int)($tarifa['taxa_privativo_pct'] ?? 0);
        $fee = (int)round($tabela * $pct / 100);
    } elseif ($abre && $pessoas > 4) {
        $ate4 = (int)($tarifa['taxa_excursao_4_reais'] ?? 0) * 100;
        $desde5 = (int)($tarifa['taxa_excursao_5_reais'] ?? 0) * 100;
        $fee = 4 * $ate4 + ($pessoas - 4) * $desde5;
    } else {
        $fee = $pessoas * (int)($tarifa['taxa_excursao_4_reais'] ?? 0) * 100;
    }
    if ($fee > $tabela) {
        $fee = $tabela;
    }
    return [
        'guia_cents' => max(0, $tabela - $fee + $guiaBi),
        'plataforma_cents' => max(0, $fee + $platBi),
        'taxa_cents' => $fee,
    ];
}

function gcv_tarifa_transporte_carros_cheios(int $pessoas, int $porCarro = 4): bool
{
    $porCarro = max(1, $porCarro);
    return $pessoas >= $porCarro && $pessoas % $porCarro === 0;
}
