<?php
declare(strict_types=1);

/**
 * Veículo do guia (modelo da tabela FIPE + ano). Opcional no perfil.
 * Os dois campos entram juntos: ou o par completo, ou nenhum.
 */

function gcv_guide_vehicle_fold(string $value): string
{
    $value = mb_strtolower(trim($value));
    $value = strtr($value, [
        'á' => 'a', 'à' => 'a', 'ã' => 'a', 'â' => 'a', 'ä' => 'a',
        'é' => 'e', 'ê' => 'e', 'ë' => 'e',
        'í' => 'i', 'ï' => 'i',
        'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
        'ú' => 'u', 'ü' => 'u',
        'ç' => 'c',
    ]);
    $value = preg_replace('/\s+/', ' ', $value) ?? $value;
    return $value;
}

/** @return array<string,string> chave normalizada => nome canônico */
function gcv_guide_vehicle_catalog_map(): array
{
    static $map = null;
    if ($map !== null) {
        return $map;
    }
    $map = [];
    $path = dirname(__DIR__, 2) . '/assets/data/veiculos-fipe.json';
    if (!is_file($path)) {
        return $map;
    }
    $list = json_decode((string)file_get_contents($path), true);
    if (!is_array($list)) {
        return $map;
    }
    foreach ($list as $name) {
        if (!is_string($name)) {
            continue;
        }
        $name = trim($name);
        if ($name === '') {
            continue;
        }
        $map[gcv_guide_vehicle_fold($name)] = $name;
    }
    return $map;
}

function gcv_guide_vehicle_canonical(string $model): ?string
{
    $key = gcv_guide_vehicle_fold($model);
    if ($key === '') {
        return null;
    }
    $map = gcv_guide_vehicle_catalog_map();
    return $map[$key] ?? null;
}

/**
 * @param mixed $yearRaw
 * @return array{model:?string,year:?int}
 */
function gcv_guide_vehicle_parse(string $modelRaw, $yearRaw): array
{
    $modelRaw = trim($modelRaw);
    $yearText = trim((string)$yearRaw);
    $yearEmpty = $yearText === '' || $yearText === '0';
    if ($modelRaw === '' && $yearEmpty) {
        return ['model' => null, 'year' => null];
    }
    if ($modelRaw === '') {
        throw new InvalidArgumentException('Informe o modelo do veículo.');
    }
    if ($yearEmpty || !preg_match('/^\d{4}$/', $yearText)) {
        throw new InvalidArgumentException('Informe o ano do veículo.');
    }
    $year = (int)$yearText;
    $max = (int)date('Y') + 1;
    if ($year < 1960 || $year > $max) {
        throw new InvalidArgumentException('Ano do veículo inválido.');
    }
    if (gcv_guide_vehicle_catalog_map() === []) {
        throw new InvalidArgumentException('A lista de veículos não está disponível. Tente de novo em instantes.');
    }
    $canonical = gcv_guide_vehicle_canonical($modelRaw);
    if ($canonical === null) {
        throw new InvalidArgumentException('Escolha o modelo na lista de veículos.');
    }
    return ['model' => $canonical, 'year' => $year];
}
