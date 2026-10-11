<?php
declare(strict_types=1);

/**
 * Tarifário: tabela de preços por pessoa usada pelo site.
 *
 * Regras:
 * - Cada atrativo aponta para no máximo 1 tarifário (gcv_attractions.tarifario_id).
 * - Cada passeio com 2 ou 3 atrativos (gcv_passeio_relacionado) aponta para 1 tarifário próprio.
 * - Um tarifário pode ser usado por vários atrativos e passeios.
 * - Preço de passeio com mais de um atrativo nunca é a soma: vem só do tarifário dele.
 * - Sem tarifário, o atrativo ou o passeio não é vendido no site.
 *
 * Preços em centavos, por cidade de saída:
 *   exclusivo_pessoa_cents       privativo sem translado
 *   exclusivo_transporte_cents   privativo com translado
 *   excursao_pessoa_cents        excursão sem translado
 *   excursao_transporte_cents    excursão com translado
 *
 * Guia em outro idioma: um acréscimo só, no total da compra.
 * bilingue_tipo fixo = bilingue_valor em centavos. percentual = bilingue_valor inteiro (0–100).
 * Português soma zero. Vazio no fixo = R$ 40. Vazio no percentual = 0.
 */

const GCV_TARIFARIO_CIDADES = [
    'alto-paraiso' => 'Alto Paraíso de Goiás',
    'sao-jorge' => 'São Jorge',
    'cavalcante' => 'Cavalcante',
];

const GCV_TARIFARIO_CAMPOS = [
    'exclusivo_pessoa_cents',
    'exclusivo_transporte_cents',
    'excursao_pessoa_cents',
    'excursao_transporte_cents',
];

/**
 * Tarifas oficiais de produção, em reais por pessoa.
 * guia = sem translado. translado = com translado.
 * O mesmo par vale saindo de qualquer cidade.
 * Cada passeio usa uma de cada. Guia em outro idioma é um valor só, para todas.
 */
const GCV_TARIFAS_OFICIAIS = [
    'guia' => [
        ['codigo' => 'g70', 'excursao' => 70, 'privativo' => 90],
        ['codigo' => 'g80', 'excursao' => 80, 'privativo' => 100],
        ['codigo' => 'g88', 'excursao' => 88, 'privativo' => 108],
        ['codigo' => 'g100', 'excursao' => 100, 'privativo' => 120],
        ['codigo' => 'g120', 'excursao' => 120, 'privativo' => 150],
        ['codigo' => 'g150', 'excursao' => 150, 'privativo' => 200],
        ['codigo' => 'g200', 'excursao' => 200, 'privativo' => 250],
    ],
    'translado' => [
        ['codigo' => 't120', 'excursao' => 120, 'privativo' => 150],
        ['codigo' => 't150', 'excursao' => 150, 'privativo' => 200],
        ['codigo' => 't200', 'excursao' => 200, 'privativo' => 250],
        ['codigo' => 't250', 'excursao' => 250, 'privativo' => 300],
        ['codigo' => 't280', 'excursao' => 280, 'privativo' => 360],
        ['codigo' => 't300', 'excursao' => 300, 'privativo' => 400],
        ['codigo' => 't350', 'excursao' => 350, 'privativo' => 440],
        ['codigo' => 't400', 'excursao' => 400, 'privativo' => 520],
        ['codigo' => 't480', 'excursao' => 480, 'privativo' => 600],
        ['codigo' => 't560', 'excursao' => 560, 'privativo' => 640],
    ],
];

/** Um passeio entra em pelo menos uma categoria e pode estar em todas. */
const GCV_PASSEIO_CATEGORIAS = [
    'classicos' => 'Clássicos',
    'destaque' => 'Destaque',
    'lado-b' => 'Lado B',
    'familia' => 'Família',
    'aventura' => 'Aventura',
];

function gcv_tarifario_column_exists(PDO $pdo, string $table, string $column): bool
{
    try {
        $stmt = $pdo->query('SHOW COLUMNS FROM `' . $table . '`');
        foreach ($stmt->fetchAll() as $col) {
            if (strtolower((string)($col['Field'] ?? '')) === strtolower($column)) {
                return true;
            }
        }
    } catch (Throwable $e) {
        return false;
    }
    return false;
}

function gcv_tarifarios_ensure(PDO $pdo): void
{
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS gcv_tarifario (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(160) NOT NULL,
          quorum TINYINT UNSIGNED NOT NULL DEFAULT 4,
          precos_json TEXT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
    if (!gcv_tarifario_column_exists($pdo, 'gcv_attractions', 'tarifario_id')) {
        $pdo->exec('ALTER TABLE gcv_attractions ADD COLUMN tarifario_id INT UNSIGNED NULL, ADD INDEX idx_attr_tarifario (tarifario_id)');
    }
    if (!gcv_tarifario_column_exists($pdo, 'gcv_passeio_relacionado', 'tarifario_id')) {
        $pdo->exec('ALTER TABLE gcv_passeio_relacionado ADD COLUMN tarifario_id INT UNSIGNED NULL, ADD INDEX idx_rel_tarifario (tarifario_id)');
    }
    if (!gcv_tarifario_column_exists($pdo, 'gcv_attractions', 'duracao_json')) {
        $pdo->exec('ALTER TABLE gcv_attractions ADD COLUMN duracao_json TEXT NULL');
    }
    if (!gcv_tarifario_column_exists($pdo, 'gcv_passeio_relacionado', 'duracao_json')) {
        $pdo->exec('ALTER TABLE gcv_passeio_relacionado ADD COLUMN duracao_json TEXT NULL');
    }
    if (!gcv_tarifario_column_exists($pdo, 'gcv_attractions', 'tem_passeio')) {
        $pdo->exec('ALTER TABLE gcv_attractions ADD COLUMN tem_passeio TINYINT(1) NOT NULL DEFAULT 1');
    }
    if (!gcv_tarifario_column_exists($pdo, 'gcv_attractions', 'categorias')) {
        $pdo->exec('ALTER TABLE gcv_attractions ADD COLUMN categorias VARCHAR(180) NULL');
    }
    if (!gcv_tarifario_column_exists($pdo, 'gcv_passeio_relacionado', 'categorias')) {
        $pdo->exec('ALTER TABLE gcv_passeio_relacionado ADD COLUMN categorias VARCHAR(180) NULL');
    }
    if (!gcv_tarifario_column_exists($pdo, 'gcv_attractions', 'saidas_json')) {
        $pdo->exec('ALTER TABLE gcv_attractions ADD COLUMN saidas_json TEXT NULL');
    }
    if (!gcv_tarifario_column_exists($pdo, 'gcv_passeio_relacionado', 'saidas_json')) {
        $pdo->exec('ALTER TABLE gcv_passeio_relacionado ADD COLUMN saidas_json TEXT NULL');
    }
    if (!gcv_tarifario_column_exists($pdo, 'gcv_attractions', 'tarifa_guia')) {
        $pdo->exec('ALTER TABLE gcv_attractions ADD COLUMN tarifa_guia VARCHAR(24) NULL, ADD COLUMN tarifa_translado VARCHAR(24) NULL');
    }
    if (!gcv_tarifario_column_exists($pdo, 'gcv_passeio_relacionado', 'tarifa_guia')) {
        $pdo->exec('ALTER TABLE gcv_passeio_relacionado ADD COLUMN tarifa_guia VARCHAR(24) NULL, ADD COLUMN tarifa_translado VARCHAR(24) NULL');
    }
    gcv_passeio_max_atrativos_ensure($pdo);
    gcv_bilingue_universal_ensure($pdo);
    gcv_tarifarios_seed($pdo);
}

/** Configuração: quantos atrativos cabem num mesmo dia (1 = só atrativo avulso). */
function gcv_passeio_max_atrativos_ensure(PDO $pdo): void
{
    try {
        $check = $pdo->prepare('SELECT id FROM gcv_settings WHERE key_name = ? LIMIT 1');
        $check->execute(['passeio_max_atrativos']);
        if (!$check->fetch()) {
            $pdo->prepare('INSERT INTO gcv_settings (key_name, value, label, type) VALUES (?,?,?,?)')->execute([
                'passeio_max_atrativos',
                '3',
                'Número máximo de atrativos no mesmo passeio',
                'integer',
            ]);
        } else {
            $pdo->prepare('UPDATE gcv_settings SET label = ? WHERE key_name = ?')->execute([
                'Número máximo de atrativos no mesmo passeio',
                'passeio_max_atrativos',
            ]);
        }
    } catch (Throwable $e) {
        error_log('passeio_max_atrativos: ' . $e->getMessage());
    }
}

/** @param mixed $raw */
function gcv_passeio_categorias_parse($raw, int $count): array
{
    $allowed = array_keys(GCV_PASSEIO_CATEGORIAS);
    $list = [];
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            $list = $decoded;
        }
    } elseif (is_array($raw)) {
        $list = $raw;
    }
    $list = array_values(array_unique(array_intersect($allowed, array_map('strval', $list))));
    if (!$list) {
        $list = $count >= 2 ? ['destaque', 'classicos'] : ['classicos'];
    }
    return $list;
}

/** @param list<string> $cats */
function gcv_passeio_oferta_save(PDO $pdo, array $body): void
{
    $cats = gcv_passeio_categorias_parse($body['categorias'] ?? [], 1);
    $json = json_encode($cats, JSON_UNESCAPED_UNICODE);
    if (!empty($body['attraction_id'])) {
        $tem = array_key_exists('tem_passeio', $body) ? (!empty($body['tem_passeio']) ? 1 : 0) : null;
        if ($tem === null) {
            $pdo->prepare('UPDATE gcv_attractions SET categorias = ? WHERE id = ?')->execute([$json, (int)$body['attraction_id']]);
        } else {
            $pdo->prepare('UPDATE gcv_attractions SET tem_passeio = ?, categorias = ? WHERE id = ?')->execute([$tem, $json, (int)$body['attraction_id']]);
        }
        return;
    }
    if (!empty($body['passeio_id'])) {
        $pdo->prepare('UPDATE gcv_passeio_relacionado SET categorias = ? WHERE id = ?')->execute([$json, (int)$body['passeio_id']]);
        return;
    }
    throw new InvalidArgumentException('Informe o atrativo ou o passeio.');
}

/** Chave estável. As três cidades antigas do tarifário continuam com a mesma chave. */
function gcv_cidade_chave(string $name): string
{
    $n = mb_strtolower(trim($name));
    $n = strtr($n, [
        'á' => 'a', 'à' => 'a', 'ã' => 'a', 'â' => 'a', 'ä' => 'a',
        'é' => 'e', 'ê' => 'e', 'ë' => 'e',
        'í' => 'i', 'ï' => 'i',
        'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
        'ú' => 'u', 'ü' => 'u',
        'ç' => 'c',
    ]);
    $known = [
        'alto paraiso de goias' => 'alto-paraiso',
        'alto paraiso' => 'alto-paraiso',
        'sao jorge' => 'sao-jorge',
        'cavalcante' => 'cavalcante',
    ];
    if (isset($known[$n])) {
        return $known[$n];
    }
    $slug = preg_replace('/[^a-z0-9]+/', '-', $n) ?? '';
    $slug = trim($slug, '-');
    return $slug !== '' ? $slug : 'cidade';
}

function gcv_cidade_curta(string $nome): string
{
    $nome = trim($nome);
    $pos = mb_stripos($nome, ' de ');
    if ($pos !== false && $pos > 2) {
        return mb_substr($nome, 0, $pos);
    }
    return $nome;
}

/** Cidades cadastradas que podem ser saída de passeio. A cidade do atrativo não entra sozinha. */
function gcv_cidades_saida_mapa(PDO $pdo): array
{
    $map = GCV_TARIFARIO_CIDADES;
    try {
        $rows = $pdo->query("SELECT name FROM gcv_cities WHERE status = 'active' ORDER BY name ASC")->fetchAll();
        foreach ($rows as $row) {
            $name = trim((string)($row['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $map[gcv_cidade_chave($name)] = $name;
        }
    } catch (Throwable $e) {
        // sem tabela de cidades, ficam as três saídas clássicas
    }
    return $map;
}

/**
 * Chaves de saída gravadas no passeio.
 * null = legado: toda cidade do tarifário que tem pelo menos uma opção de preço.
 * [] = nenhuma saída: o passeio não entra no catálogo.
 *
 * @return list<string>
 */
function gcv_saidas_chaves($raw, ?array $tarifa, array $mapa): array
{
    $allowed = array_keys($mapa);
    if (is_string($raw)) {
        $decoded = $raw === '' ? [] : json_decode($raw, true);
        $list = [];
        if (is_array($decoded)) {
            foreach ($decoded as $key) {
                $key = (string)$key;
                if (in_array($key, $allowed, true)) {
                    $list[] = $key;
                }
            }
        }
        return array_values(array_unique($list));
    }
    $list = [];
    $cidades = is_array($tarifa['cidades'] ?? null) ? $tarifa['cidades'] : [];
    foreach ($allowed as $key) {
        $row = is_array($cidades[$key] ?? null) ? $cidades[$key] : [];
        foreach (GCV_TARIFARIO_CAMPOS as $campo) {
            if ((int)($row[$campo] ?? 0) > 0) {
                $list[] = $key;
                break;
            }
        }
    }
    return $list;
}

/**
 * Saídas que realmente vendem: marcadas e com pelo menos uma opção de preço.
 * Cada saída traz as quatro opções do tarifário (excursão/privativo × com/sem translado).
 *
 * @param list<string> $chaves
 * @return list<array<string,mixed>>
 */
function gcv_saidas_public(array $chaves, ?array $tarifa, $duracaoJson, int $fallbackMinutes, array $mapa): array
{
    $dur = gcv_duracao_cidades($duracaoJson, $fallbackMinutes);
    $out = [];
    foreach ($chaves as $key) {
        $row = is_array($tarifa['cidades'][$key] ?? null) ? $tarifa['cidades'][$key] : [];
        $item = [
            'key' => $key,
            'nome' => (string)($mapa[$key] ?? $key),
            'curta' => gcv_cidade_curta((string)($mapa[$key] ?? $key)),
            'minutes' => (int)($dur[$key] ?? max(0, $fallbackMinutes)),
        ];
        $vende = false;
        foreach (GCV_TARIFARIO_CAMPOS as $campo) {
            $cents = max(0, (int)($row[$campo] ?? 0));
            $item[$campo] = $cents;
            if ($cents > 0) {
                $vende = true;
            }
        }
        if ($vende) {
            $out[] = $item;
        }
    }
    return $out;
}

/** @param list<string> $chaves */
function gcv_saidas_save(PDO $pdo, string $kind, int $id, array $chaves): void
{
    $mapa = gcv_cidades_saida_mapa($pdo);
    $clean = [];
    foreach ($chaves as $key) {
        $key = (string)$key;
        if (isset($mapa[$key]) && !in_array($key, $clean, true)) {
            $clean[] = $key;
        }
    }
    $table = $kind === 'passeio' ? 'gcv_passeio_relacionado' : 'gcv_attractions';
    $pdo->prepare("UPDATE $table SET saidas_json = ? WHERE id = ?")->execute([json_encode(array_values($clean), JSON_UNESCAPED_UNICODE), $id]);
}

function gcv_passeio_max_atrativos(PDO $pdo): int
{
    $max = 3;
    try {
        $stmt = $pdo->prepare('SELECT value FROM gcv_settings WHERE key_name = ? LIMIT 1');
        $stmt->execute(['passeio_max_atrativos']);
        $raw = $stmt->fetchColumn();
        if ($raw !== false && $raw !== null && $raw !== '') {
            $max = (int)$raw;
        }
    } catch (Throwable $e) {
        // usa o padrão
    }
    return max(1, min(5, $max));
}

/** @return list<array{codigo:string,tipo:string,excursao:int,privativo:int,excursao_cents:int,privativo_cents:int,nome:string}> */
function gcv_tarifas_oficiais_catalogo(): array
{
    $out = [];
    foreach (GCV_TARIFAS_OFICIAIS as $tipo => $rows) {
        foreach ($rows as $row) {
            $out[] = gcv_tarifa_oficial_linha((string)$tipo, (string)$row['codigo'], (int)$row['excursao'], (int)$row['privativo']);
        }
    }
    return $out;
}

/** @return array{codigo:string,tipo:string,excursao:int,privativo:int,excursao_cents:int,privativo_cents:int,nome:string} */
function gcv_tarifa_oficial_linha(string $tipo, string $codigo, int $excursao, int $privativo): array
{
    $tipo = $tipo === 'translado' ? 'translado' : 'guia';
    $excursao = max(0, $excursao);
    $privativo = max(0, $privativo);
    return [
        'codigo' => $codigo,
        'tipo' => $tipo,
        'excursao' => $excursao,
        'privativo' => $privativo,
        'excursao_cents' => $excursao * 100,
        'privativo_cents' => $privativo * 100,
        'nome' => ($tipo === 'guia' ? 'Tarifa Guia' : 'Tarifa Translado') . ' · excursão ' . $excursao . ' / privativo ' . $privativo,
    ];
}

/** @return list<array{codigo:string,tipo:string,excursao:int,privativo:int,excursao_cents:int,privativo_cents:int,nome:string}> */
function gcv_tarifas_oficiais(): array
{
    $cache = &gcv_tarifas_oficiais_cache();
    if (is_array($cache)) {
        return $cache;
    }
    try {
        if (function_exists('db')) {
            $cache = gcv_tarifas_oficiais_ler(db());
            return $cache;
        }
    } catch (Throwable $e) {
        error_log('tarifas oficiais: ' . $e->getMessage());
    }
    $cache = gcv_tarifas_oficiais_catalogo();
    return $cache;
}

/** @return list<array{codigo:string,tipo:string,excursao:int,privativo:int,excursao_cents:int,privativo_cents:int,nome:string}>|null */
function &gcv_tarifas_oficiais_cache(): ?array
{
    static $rows = null;
    return $rows;
}

/** @return list<array{codigo:string,tipo:string,excursao:int,privativo:int,excursao_cents:int,privativo_cents:int,nome:string}> */
function gcv_tarifas_oficiais_ler(PDO $pdo): array
{
    try {
        $stmt = $pdo->prepare('SELECT value FROM gcv_settings WHERE key_name = ? LIMIT 1');
        $stmt->execute(['tarifas_oficiais']);
        $raw = json_decode((string)$stmt->fetchColumn(), true);
    } catch (Throwable $e) {
        return gcv_tarifas_oficiais_catalogo();
    }
    if (!is_array($raw) || !$raw) {
        return gcv_tarifas_oficiais_catalogo();
    }
    $out = [];
    foreach ($raw as $row) {
        if (!is_array($row)) {
            continue;
        }
        $tipo = (string)($row['tipo'] ?? '');
        $codigo = trim((string)($row['codigo'] ?? ''));
        $exc = (int)($row['excursao'] ?? 0);
        $pri = (int)($row['privativo'] ?? 0);
        if (($tipo !== 'guia' && $tipo !== 'translado') || $codigo === '' || $exc < 1 || $pri < 1) {
            continue;
        }
        $out[] = gcv_tarifa_oficial_linha($tipo, $codigo, $exc, $pri);
    }
    return $out ?: gcv_tarifas_oficiais_catalogo();
}

/** @param list<array<string,mixed>> $rows */
function gcv_tarifas_oficiais_gravar(PDO $pdo, array $rows): void
{
    $payload = [];
    foreach ($rows as $row) {
        $payload[] = [
            'codigo' => (string)$row['codigo'],
            'tipo' => (string)$row['tipo'],
            'excursao' => (int)$row['excursao'],
            'privativo' => (int)$row['privativo'],
        ];
    }
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
    $check = $pdo->prepare('SELECT id FROM gcv_settings WHERE key_name = ? LIMIT 1');
    $check->execute(['tarifas_oficiais']);
    if ($check->fetch()) {
        $pdo->prepare('UPDATE gcv_settings SET value = ? WHERE key_name = ?')->execute([$json, 'tarifas_oficiais']);
    } else {
        $pdo->prepare('INSERT INTO gcv_settings (key_name, value, label, type) VALUES (?,?,?,?)')->execute([
            'tarifas_oficiais',
            $json,
            'Tarifas oficiais de guia e de translado',
            'json',
        ]);
    }
    $cache = &gcv_tarifas_oficiais_cache();
    $cache = null;
}

function gcv_tarifa_oficial_uso(PDO $pdo, string $codigo): int
{
    $n = 0;
    foreach (['gcv_attractions', 'gcv_passeio_relacionado'] as $table) {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM {$table} WHERE tarifa_guia = ? OR tarifa_translado = ?");
        $stmt->execute([$codigo, $codigo]);
        $n += (int)$stmt->fetchColumn();
    }
    return $n;
}

function gcv_tarifa_oficial_criar(PDO $pdo, string $tipo, int $excursao, int $privativo): string
{
    if ($tipo !== 'guia' && $tipo !== 'translado') {
        throw new InvalidArgumentException('Escolha Tarifa Guia ou Tarifa Translado.');
    }
    if ($excursao < 1 || $excursao > 100000 || $privativo < 1 || $privativo > 100000) {
        throw new InvalidArgumentException('Informe a excursão e o privativo em reais.');
    }
    $rows = gcv_tarifas_oficiais_ler($pdo);
    foreach ($rows as $row) {
        if ($row['tipo'] === $tipo && $row['excursao'] === $excursao && $row['privativo'] === $privativo) {
            throw new InvalidArgumentException('Essa tarifa já existe.');
        }
    }
    $prefix = $tipo === 'guia' ? 'g' : 't';
    $codigo = $prefix . $excursao;
    $n = 2;
    $codes = array_column($rows, 'codigo');
    while (in_array($codigo, $codes, true)) {
        $codigo = $prefix . $excursao . '-' . $n;
        $n++;
    }
    $rows[] = gcv_tarifa_oficial_linha($tipo, $codigo, $excursao, $privativo);
    gcv_tarifas_oficiais_gravar($pdo, $rows);
    return $codigo;
}

/** @return array{codigo:string,tipo:string,excursao:int,privativo:int,excursao_cents:int,privativo_cents:int,nome:string}|null */
function gcv_tarifa_oficial_acima(array $rows, array $atual): ?array
{
    $acima = null;
    foreach ($rows as $row) {
        if ($row['codigo'] === $atual['codigo'] || $row['tipo'] !== $atual['tipo']) {
            continue;
        }
        if ((int)$row['excursao'] <= (int)$atual['excursao']) {
            continue;
        }
        if ($acima === null
            || (int)$row['excursao'] < (int)$acima['excursao']
            || ((int)$row['excursao'] === (int)$acima['excursao'] && (int)$row['privativo'] < (int)$acima['privativo'])
        ) {
            $acima = $row;
        }
    }
    return $acima;
}

/** @return array{moved:int,para:string,para_nome:string} */
function gcv_tarifa_oficial_excluir(PDO $pdo, string $codigo): array
{
    $codigo = trim($codigo);
    $rows = gcv_tarifas_oficiais_ler($pdo);
    $atual = null;
    foreach ($rows as $row) {
        if ($row['codigo'] === $codigo) {
            $atual = $row;
            break;
        }
    }
    if (!$atual) {
        throw new InvalidArgumentException('Tarifa não encontrada.');
    }
    $col = $atual['tipo'] === 'translado' ? 'tarifa_translado' : 'tarifa_guia';
    $uso = gcv_tarifa_oficial_uso($pdo, $codigo);
    $acima = gcv_tarifa_oficial_acima($rows, $atual);
    if ($uso > 0 && !$acima) {
        throw new InvalidArgumentException('Esta é a maior excursão desta lista. Os passeios que a usam não têm tarifa acima para receber.');
    }
    if ($uso > 0 && $acima) {
        foreach (['gcv_attractions', 'gcv_passeio_relacionado'] as $table) {
            $pdo->prepare("UPDATE {$table} SET {$col} = ? WHERE {$col} = ?")->execute([$acima['codigo'], $codigo]);
        }
    }
    $rows = array_values(array_filter($rows, static fn($row) => $row['codigo'] !== $codigo));
    gcv_tarifas_oficiais_gravar($pdo, $rows);
    return [
        'moved' => $uso,
        'para' => $acima['codigo'] ?? '',
        'para_nome' => $acima ? ('Excursão R$ ' . $acima['excursao'] . ' · Privativo R$ ' . $acima['privativo']) : '',
    ];
}

/** @return array{codigo:string,tipo:string,excursao:int,privativo:int,excursao_cents:int,privativo_cents:int,nome:string}|null */
function gcv_tarifa_oficial_item(string $codigo, ?string $tipo = null): ?array
{
    foreach (gcv_tarifas_oficiais() as $row) {
        if ($row['codigo'] !== $codigo) {
            continue;
        }
        if ($tipo !== null && $row['tipo'] !== $tipo) {
            return null;
        }
        return $row;
    }
    return null;
}

function gcv_bilingue_universal_ensure(PDO $pdo): void
{
    try {
        $check = $pdo->prepare('SELECT id FROM gcv_settings WHERE key_name = ? LIMIT 1');
        $check->execute(['passeio_bilingue']);
        if (!$check->fetch()) {
            $pdo->prepare('INSERT INTO gcv_settings (key_name, value, label, type) VALUES (?,?,?,?)')->execute([
                'passeio_bilingue',
                json_encode(['tipo' => 'fixo', 'valor' => 4000], JSON_UNESCAPED_UNICODE),
                'Guia em outro idioma, vale para todas as tarifas',
                'json',
            ]);
        }
    } catch (Throwable $e) {
        error_log('passeio_bilingue: ' . $e->getMessage());
    }
}

/** @return array{tipo:string,valor:int,cents:int} */
function gcv_bilingue_universal_get(PDO $pdo): array
{
    $fallback = ['tipo' => 'fixo', 'valor' => 4000, 'cents' => 4000];
    try {
        $stmt = $pdo->prepare('SELECT value FROM gcv_settings WHERE key_name = ? LIMIT 1');
        $stmt->execute(['passeio_bilingue']);
        $raw = json_decode((string)$stmt->fetchColumn(), true);
    } catch (Throwable $e) {
        return $fallback;
    }
    return gcv_bilingue_universal_norm(is_array($raw) ? $raw : []);
}

/** @param array<string,mixed> $raw @return array{tipo:string,valor:int,cents:int} */
function gcv_bilingue_universal_norm(array $raw): array
{
    if (($raw['tipo'] ?? '') === 'percentual') {
        $pct = max(0, min(100, (int)($raw['valor'] ?? 0)));
        return ['tipo' => 'percentual', 'valor' => $pct, 'cents' => 0];
    }
    $cents = array_key_exists('valor', $raw) && $raw['valor'] !== '' && $raw['valor'] !== null
        ? max(0, (int)$raw['valor'])
        : 4000;
    return ['tipo' => 'fixo', 'valor' => $cents, 'cents' => $cents];
}

function gcv_bilingue_universal_save(PDO $pdo, array $body): void
{
    gcv_bilingue_universal_ensure($pdo);
    $norm = gcv_bilingue_universal_norm([
        'tipo' => (string)($body['bilingue_tipo'] ?? 'fixo'),
        'valor' => $body['bilingue_valor'] ?? 4000,
    ]);
    $json = json_encode(['tipo' => $norm['tipo'], 'valor' => $norm['valor']], JSON_UNESCAPED_UNICODE);
    $pdo->prepare('UPDATE gcv_settings SET value = ? WHERE key_name = ?')->execute([$json, 'passeio_bilingue']);
}

/**
 * As duas oficiais juntas viram a tabela que o site já sabe ler.
 * Falta uma das duas: devolve null e o passeio segue na tabela antiga.
 *
 * @return array<string,mixed>|null
 */
function gcv_tarifa_oficial_montar(?string $guiaCodigo, ?string $transladoCodigo): ?array
{
    $guia = gcv_tarifa_oficial_item((string)$guiaCodigo, 'guia');
    $trans = gcv_tarifa_oficial_item((string)$transladoCodigo, 'translado');
    if (!$guia || !$trans) {
        return null;
    }
    $cidades = [];
    foreach (array_keys(GCV_TARIFARIO_CIDADES) as $key) {
        $cidades[$key] = [
            'excursao_pessoa_cents' => $guia['excursao_cents'],
            'exclusivo_pessoa_cents' => $guia['privativo_cents'],
            'excursao_transporte_cents' => $trans['excursao_cents'],
            'exclusivo_transporte_cents' => $trans['privativo_cents'],
        ];
    }
    $base = $cidades['alto-paraiso'];
    return [
        'id' => 0,
        'nome' => $guia['nome'] . ' + ' . $trans['nome'],
        'oficial' => true,
        'tarifa_guia' => $guia['codigo'],
        'tarifa_translado' => $trans['codigo'],
        'quorum' => 4,
        'exclusivo_pessoa_cents' => $base['exclusivo_pessoa_cents'],
        'excursao_pessoa_cents' => $base['excursao_pessoa_cents'],
        'exclusivo_transporte_cents' => $base['exclusivo_transporte_cents'],
        'excursao_transporte_cents' => $base['excursao_transporte_cents'],
        'cidades' => $cidades,
    ];
}

/** @param array<string,mixed>|null $tarifa */
function gcv_tarifa_aplicar_bilingue(?array $tarifa, array $bi): ?array
{
    if (!$tarifa) {
        return null;
    }
    $tarifa['bilingue_tipo'] = $bi['tipo'];
    $tarifa['bilingue_valor'] = $bi['valor'];
    $tarifa['bilingue_cents'] = $bi['cents'];
    return $tarifa;
}

/** @return array<string,mixed>|null */
function gcv_tarifa_resolver(PDO $pdo, ?string $guia, ?string $translado, ?int $tarifarioId): ?array
{
    $oficial = gcv_tarifa_oficial_montar($guia, $translado);
    $tarifa = $oficial ?: gcv_tarifario_public_by_id($pdo, $tarifarioId);
    return gcv_tarifa_aplicar_bilingue($tarifa, gcv_bilingue_universal_get($pdo));
}

function gcv_tarifa_oficial_vincular(PDO $pdo, array $body): void
{
    $guia = trim((string)($body['tarifa_guia'] ?? ''));
    $trans = trim((string)($body['tarifa_translado'] ?? ''));
    if ($guia !== '' && !gcv_tarifa_oficial_item($guia, 'guia')) {
        throw new InvalidArgumentException('Tarifa Guia não está na lista oficial.');
    }
    if ($trans !== '' && !gcv_tarifa_oficial_item($trans, 'translado')) {
        throw new InvalidArgumentException('Tarifa Translado não está na lista oficial.');
    }
    $guia = $guia !== '' ? $guia : null;
    $trans = $trans !== '' ? $trans : null;
    if (!empty($body['attraction_id'])) {
        $pdo->prepare('UPDATE gcv_attractions SET tarifa_guia = ?, tarifa_translado = ? WHERE id = ?')->execute([$guia, $trans, (int)$body['attraction_id']]);
        return;
    }
    if (!empty($body['passeio_id'])) {
        $pdo->prepare('UPDATE gcv_passeio_relacionado SET tarifa_guia = ?, tarifa_translado = ? WHERE id = ?')->execute([$guia, $trans, (int)$body['passeio_id']]);
        return;
    }
    throw new InvalidArgumentException('Informe o atrativo ou o passeio.');
}

/** Carga inicial: só roda com a tabela vazia. */
function gcv_tarifarios_seed(PDO $pdo): void
{
    $count = (int)$pdo->query('SELECT COUNT(*) FROM gcv_tarifario')->fetchColumn();
    if ($count > 0) {
        return;
    }
    // Espera os atrativos existirem, senão os vínculos da carga inicial se perdem.
    if ((int)$pdo->query('SELECT COUNT(*) FROM gcv_attractions')->fetchColumn() === 0) {
        return;
    }
    $path = dirname(__DIR__) . '/data/tarifarios-seed.json';
    if (!is_file($path)) {
        return;
    }
    $data = json_decode((string)file_get_contents($path), true);
    if (!is_array($data)) {
        return;
    }
    $bySlug = $pdo->prepare('SELECT id FROM gcv_attractions WHERE slug = ? LIMIT 1');
    foreach ($data['tarifarios'] ?? [] as $row) {
        if (!is_array($row)) {
            continue;
        }
        $id = gcv_tarifario_save($pdo, null, $row);
        foreach ($row['atrativos'] ?? [] as $slug) {
            $bySlug->execute([(string)$slug]);
            $found = $bySlug->fetch();
            if ($found) {
                gcv_tarifario_link_attraction($pdo, (int)$found['id'], $id);
            }
        }
        foreach ($row['combos'] ?? [] as $slugs) {
            $ids = [];
            foreach ((array)$slugs as $slug) {
                $bySlug->execute([(string)$slug]);
                $found = $bySlug->fetch();
                if (!$found) {
                    $ids = [];
                    break;
                }
                $ids[] = (int)$found['id'];
            }
            if (count($ids) < 2) {
                continue;
            }
            try {
                $tour = gcv_related_tour_save($pdo, $ids);
                if (!empty($tour['id'])) {
                    gcv_tarifario_link_tour($pdo, (int)$tour['id'], $id);
                }
            } catch (Throwable $e) {
                error_log('tarifario seed combo: ' . $e->getMessage());
            }
        }
    }
}

/**
 * Acréscimo único do guia em outro idioma.
 * fixo: valor em centavos. percentual: inteiro de 0 a 100.
 * Dado antigo só com bilingue_cents continua fixo.
 * Dado antigo por cidade: usa Alto Paraíso, senão a primeira cidade.
 *
 * @return array{tipo:string,valor:int,cents:int}
 */
function gcv_tarifario_bilingue(array $raw): array
{
    $tipoRaw = (string)($raw['bilingue_tipo'] ?? '');
    if ($tipoRaw === 'percentual' || $tipoRaw === 'fixo' || array_key_exists('bilingue_valor', $raw)) {
        if ($tipoRaw === 'percentual') {
            $pct = max(0, min(100, (int)($raw['bilingue_valor'] ?? 0)));
            return ['tipo' => 'percentual', 'valor' => $pct, 'cents' => 0];
        }
        if (array_key_exists('bilingue_valor', $raw) && $raw['bilingue_valor'] !== '' && $raw['bilingue_valor'] !== null) {
            $cents = max(0, (int)$raw['bilingue_valor']);
        } elseif (array_key_exists('bilingue_cents', $raw) && $raw['bilingue_cents'] !== '' && $raw['bilingue_cents'] !== null) {
            $cents = max(0, (int)$raw['bilingue_cents']);
        } else {
            $cents = 4000;
        }
        return ['tipo' => 'fixo', 'valor' => $cents, 'cents' => $cents];
    }
    if (array_key_exists('bilingue_cents', $raw) && $raw['bilingue_cents'] !== '' && $raw['bilingue_cents'] !== null) {
        $cents = max(0, (int)$raw['bilingue_cents']);
        return ['tipo' => 'fixo', 'valor' => $cents, 'cents' => $cents];
    }
    $src = is_array($raw['cidades'] ?? null) ? $raw['cidades'] : [];
    $seen = [];
    foreach (array_merge(['alto-paraiso'], array_keys($src)) as $key) {
        if (isset($seen[$key])) {
            continue;
        }
        $seen[$key] = true;
        $row = is_array($src[$key] ?? null) ? $src[$key] : [];
        if (($row['bilingue_tipo'] ?? '') === 'percentual') {
            $pct = max(0, min(100, (int)($row['bilingue_valor'] ?? 0)));
            return ['tipo' => 'percentual', 'valor' => $pct, 'cents' => 0];
        }
        if (array_key_exists('bilingue_valor', $row) && $row['bilingue_valor'] !== '' && $row['bilingue_valor'] !== null) {
            $cents = max(0, (int)$row['bilingue_valor']);
            return ['tipo' => 'fixo', 'valor' => $cents, 'cents' => $cents];
        }
    }
    return ['tipo' => 'fixo', 'valor' => 4000, 'cents' => 4000];
}

/** @return array{quorum:int,bilingue_tipo:string,bilingue_valor:int,bilingue_cents:int,cidades:array<string,array<string,int>>} */
function gcv_tarifario_normalize(array $raw): array
{
    $quorum = (int)($raw['quorum'] ?? 4);
    if ($quorum < 1 || $quorum > 20) {
        $quorum = 4;
    }
    $cidades = [];
    $src = is_array($raw['cidades'] ?? null) ? $raw['cidades'] : [];
    foreach (array_keys(GCV_TARIFARIO_CIDADES) as $key) {
        $row = is_array($src[$key] ?? null) ? $src[$key] : [];
        $out = [];
        foreach (GCV_TARIFARIO_CAMPOS as $campo) {
            $out[$campo] = max(0, (int)($row[$campo] ?? 0));
        }
        $cidades[$key] = $out;
    }
    $bi = gcv_tarifario_bilingue($raw);
    return [
        'quorum' => $quorum,
        'bilingue_tipo' => $bi['tipo'],
        'bilingue_valor' => $bi['valor'],
        'bilingue_cents' => $bi['cents'],
        'cidades' => $cidades,
    ];
}

/** Formato que o site usa (mesmo de antes: base de Alto Paraíso + cidades). */
function gcv_tarifario_public(array $row): array
{
    $precos = json_decode((string)($row['precos_json'] ?? ''), true);
    $norm = gcv_tarifario_normalize(array_merge(is_array($precos) ? $precos : [], ['quorum' => $row['quorum'] ?? 4]));
    $base = $norm['cidades']['alto-paraiso'];
    return [
        'id' => (int)$row['id'],
        'nome' => (string)$row['nome'],
        'quorum' => $norm['quorum'],
        'exclusivo_pessoa_cents' => $base['exclusivo_pessoa_cents'],
        'excursao_pessoa_cents' => $base['excursao_pessoa_cents'],
        'exclusivo_transporte_cents' => $base['exclusivo_transporte_cents'],
        'excursao_transporte_cents' => $base['excursao_transporte_cents'],
        'bilingue_tipo' => $norm['bilingue_tipo'],
        'bilingue_valor' => $norm['bilingue_valor'],
        'bilingue_cents' => $norm['bilingue_cents'],
        'cidades' => $norm['cidades'],
    ];
}

function gcv_tarifario_save(PDO $pdo, ?int $id, array $body): int
{
    $nome = trim((string)($body['nome'] ?? ''));
    if ($nome === '') {
        throw new InvalidArgumentException('Dê um nome ao tarifário.');
    }
    if (mb_strlen($nome) > 160) {
        $nome = mb_substr($nome, 0, 160);
    }
    $norm = gcv_tarifario_normalize($body);
    $json = json_encode([
        'cidades' => $norm['cidades'],
        'bilingue_tipo' => $norm['bilingue_tipo'],
        'bilingue_valor' => $norm['bilingue_valor'],
        'bilingue_cents' => $norm['bilingue_cents'],
    ], JSON_UNESCAPED_UNICODE);
    if ($id) {
        $stmt = $pdo->prepare('UPDATE gcv_tarifario SET nome = ?, quorum = ?, precos_json = ? WHERE id = ?');
        $stmt->execute([$nome, $norm['quorum'], $json, $id]);
        if (!gcv_tarifario_get($pdo, $id)) {
            throw new InvalidArgumentException('Tarifário não encontrado.');
        }
        return $id;
    }
    $pdo->prepare('INSERT INTO gcv_tarifario (nome, quorum, precos_json) VALUES (?,?,?)')->execute([$nome, $norm['quorum'], $json]);
    return (int)$pdo->lastInsertId();
}

function gcv_tarifario_get(PDO $pdo, int $id): ?array
{
    if ($id <= 0) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT * FROM gcv_tarifario WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function gcv_tarifario_public_by_id(PDO $pdo, ?int $id): ?array
{
    if (!$id) {
        return null;
    }
    $row = gcv_tarifario_get($pdo, $id);
    return $row ? gcv_tarifario_public($row) : null;
}

/**
 * Duração do passeio por cidade de saída, em minutos.
 * Cidade sem valor usa a duração geral (duration_minutes).
 * @return array<string,int>
 */
function gcv_duracao_cidades($json, int $fallbackMinutes): array
{
    $raw = is_string($json) && $json !== '' ? json_decode($json, true) : (is_array($json) ? $json : []);
    $out = [];
    foreach (array_keys(GCV_TARIFARIO_CIDADES) as $key) {
        $v = is_array($raw) && isset($raw[$key]) && $raw[$key] !== '' ? (int)$raw[$key] : 0;
        $out[$key] = $v > 0 ? min($v, 1440) : max(0, $fallbackMinutes);
    }
    return $out;
}

/** @param array<string,mixed> $duracao */
function gcv_duracao_save(PDO $pdo, string $kind, int $id, array $duracao): void
{
    $clean = [];
    foreach (array_keys(GCV_TARIFARIO_CIDADES) as $key) {
        $v = isset($duracao[$key]) ? (int)$duracao[$key] : 0;
        if ($v > 0) {
            $clean[$key] = min($v, 1440);
        }
    }
    $table = $kind === 'passeio' ? 'gcv_passeio_relacionado' : 'gcv_attractions';
    $pdo->prepare("UPDATE $table SET duracao_json = ? WHERE id = ?")->execute([$clean ? json_encode($clean) : null, $id]);
}

/** Um atrativo tem um só tarifário: gravar troca o anterior. null desliga. */
function gcv_tarifario_link_attraction(PDO $pdo, int $attractionId, ?int $tarifarioId): void
{
    if ($tarifarioId && !gcv_tarifario_get($pdo, $tarifarioId)) {
        throw new InvalidArgumentException('Tarifário não encontrado.');
    }
    $pdo->prepare('UPDATE gcv_attractions SET tarifario_id = ? WHERE id = ?')->execute([$tarifarioId ?: null, $attractionId]);
}

/** Um passeio com 2+ atrativos tem um só tarifário. null desliga. */
function gcv_tarifario_link_tour(PDO $pdo, int $passeioId, ?int $tarifarioId): void
{
    if ($tarifarioId && !gcv_tarifario_get($pdo, $tarifarioId)) {
        throw new InvalidArgumentException('Tarifário não encontrado.');
    }
    $pdo->prepare('UPDATE gcv_passeio_relacionado SET tarifario_id = ? WHERE id = ?')->execute([$tarifarioId ?: null, $passeioId]);
}

/** Apaga o tarifário e solta quem usava (ficam sem preço, fora da venda). */
function gcv_tarifario_delete(PDO $pdo, int $id): void
{
    $pdo->prepare('UPDATE gcv_attractions SET tarifario_id = NULL WHERE tarifario_id = ?')->execute([$id]);
    $pdo->prepare('UPDATE gcv_passeio_relacionado SET tarifario_id = NULL WHERE tarifario_id = ?')->execute([$id]);
    $pdo->prepare('DELETE FROM gcv_tarifario WHERE id = ?')->execute([$id]);
}

/** Tudo que o menu Tarifário precisa numa chamada. */
function gcv_tarifario_admin_overview(PDO $pdo): array
{
    if (!function_exists('gcv_attraction_public_html_path')) {
        require_once __DIR__ . '/excursion_attractions.php';
    }
    $tarifarios = [];
    foreach ($pdo->query('SELECT * FROM gcv_tarifario ORDER BY nome ASC')->fetchAll() as $row) {
        $pub = gcv_tarifario_public($row);
        $pub['atrativos'] = [];
        $pub['passeios'] = [];
        $tarifarios[(int)$row['id']] = $pub;
    }
    $attractions = [];
    $rows = $pdo->query(
        "SELECT id, title_pt, slug, status, duration_minutes, duracao_json, tarifario_id, tarifa_guia, tarifa_translado, tem_passeio, categorias FROM gcv_attractions
         WHERE title_pt NOT LIKE '% + %' ORDER BY title_pt ASC"
    )->fetchAll();
    foreach ($rows as $row) {
        $slug = (string)$row['slug'];
        $tid = $row['tarifario_id'] !== null ? (int)$row['tarifario_id'] : null;
        $item = [
            'id' => (int)$row['id'],
            'title_pt' => (string)$row['title_pt'],
            'slug' => $slug,
            'status' => (string)$row['status'],
            'duration_minutes' => (int)($row['duration_minutes'] ?? 0),
            'page' => gcv_attraction_public_html_path($slug),
            'tem_passeio' => !isset($row['tem_passeio']) || (int)$row['tem_passeio'] === 1,
            'categorias' => gcv_passeio_categorias_parse($row['categorias'] ?? null, 1),
            'tarifario_id' => $tid,
            'tarifa_guia' => (string)($row['tarifa_guia'] ?? ''),
            'tarifa_translado' => (string)($row['tarifa_translado'] ?? ''),
            'duracao_cidades' => gcv_duracao_cidades($row['duracao_json'] ?? null, (int)($row['duration_minutes'] ?? 0)),
        ];
        $attractions[] = $item;
        if ($tid && isset($tarifarios[$tid])) {
            $tarifarios[$tid]['atrativos'][] = ['id' => $item['id'], 'title_pt' => $item['title_pt']];
        }
    }
    $passeios = [];
    foreach ($pdo->query('SELECT id FROM gcv_passeio_relacionado ORDER BY id ASC')->fetchAll() as $row) {
        $tour = gcv_related_tour_one($pdo, (int)$row['id']);
        if (!$tour) {
            continue;
        }
        $passeios[] = $tour;
        $tid = $tour['tarifario_id'] ?? null;
        if ($tid && isset($tarifarios[$tid])) {
            $tarifarios[$tid]['passeios'][] = [
                'id' => $tour['id'],
                'title' => implode(' + ', array_map(static fn($a) => $a['title_pt'], $tour['attractions'])),
            ];
        }
    }
    return [
        'max_atrativos' => gcv_passeio_max_atrativos($pdo),
        'categorias' => GCV_PASSEIO_CATEGORIAS,
        'cidades' => GCV_TARIFARIO_CIDADES,
        'tarifas_oficiais' => gcv_tarifas_oficiais(),
        'bilingue' => gcv_bilingue_universal_get($pdo),
        'tarifarios' => array_values($tarifarios),
        'atrativos' => $attractions,
        'passeios' => $passeios,
    ];
}

/** Payload do widget na página do atrativo. null = atrativo não existe. */
function gcv_tarifario_public_attraction(PDO $pdo, string $slug): ?array
{
    $stmt = $pdo->prepare("SELECT id, slug, title_pt, duration_minutes, duracao_json, tarifario_id, tarifa_guia, tarifa_translado, tem_passeio, categorias, saidas_json FROM gcv_attractions WHERE slug = ? AND status = 'published' LIMIT 1");
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $related = [];
    $max = gcv_passeio_max_atrativos($pdo);
    foreach (gcv_related_tours_for_attraction($pdo, (int)$row['id']) as $tour) {
        if (empty($tour['tarifa']) || count($tour['attractions']) > $max) {
            continue;
        }
        $related[] = $tour;
    }
    $mapa = gcv_cidades_saida_mapa($pdo);
    $tarifa = gcv_tarifa_resolver(
        $pdo,
        (string)($row['tarifa_guia'] ?? ''),
        (string)($row['tarifa_translado'] ?? ''),
        $row['tarifario_id'] !== null ? (int)$row['tarifario_id'] : null
    );
    $minutos = (int)($row['duration_minutes'] ?? 0);
    return [
        'slug' => (string)$row['slug'],
        'title' => (string)$row['title_pt'],
        'duration_minutes' => $minutos,
        'duracao_cidades' => gcv_duracao_cidades($row['duracao_json'] ?? null, $minutos),
        'tem_passeio' => !isset($row['tem_passeio']) || (int)$row['tem_passeio'] === 1,
        'categorias' => gcv_passeio_categorias_parse($row['categorias'] ?? null, 1),
        'tarifa' => $tarifa,
        'saidas' => gcv_saidas_public(
            gcv_saidas_chaves($row['saidas_json'] ?? null, $tarifa, $mapa),
            $tarifa,
            $row['duracao_json'] ?? null,
            $minutos,
            $mapa
        ),
        'max_atrativos' => $max,
        'related_tours' => $related,
    ];
}

/** Catálogo da página Passeios: só o que tem tarifário. */
function gcv_tarifario_public_catalog(PDO $pdo): array
{
    if (!function_exists('gcv_attraction_public_html_path')) {
        require_once __DIR__ . '/excursion_attractions.php';
    }
    $out = [];
    foreach ($pdo->query('SELECT id FROM gcv_passeio_relacionado ORDER BY id ASC')->fetchAll() as $row) {
        $tour = gcv_related_tour_one($pdo, (int)$row['id']);
        if (!$tour || empty($tour['tarifa']) || !$tour['attractions'] || count($tour['attractions']) > gcv_passeio_max_atrativos($pdo)) {
            continue;
        }
        $first = $tour['attractions'][0];
        $cover = $pdo->prepare('SELECT cover_url FROM gcv_attractions WHERE id = ?');
        $cover->execute([$first['id']]);
        $out[] = [
            'id' => 'r-' . $tour['id'],
            'kind' => 'combo',
            'slug' => (string)$first['slug'],
            'attraction_ids' => array_map(static fn($a) => (int)$a['id'], $tour['attractions']),
            'title' => implode(' + ', array_map(static fn($a) => $a['title_pt'], $tour['attractions'])),
            'count' => count($tour['attractions']),
            'categories' => $tour['categorias'] ?? gcv_passeio_categorias_parse(null, count($tour['attractions'])),
            'duration_minutes' => $tour['duration_minutes'],
            'duracao_cidades' => $tour['duracao_cidades'],
            'tarifa' => $tour['tarifa'],
            'saidas' => $tour['saidas'] ?? [],
            'image' => (string)($cover->fetchColumn() ?: ''),
            'href' => $first['page'] !== '' ? '/' . ltrim($first['page'], '/') : '/passeios.html',
            'attractions' => array_map(static fn($a) => $a['title_pt'], $tour['attractions']),
            'parts' => array_map(static function ($a) {
                $page = (string)($a['page'] ?? '');
                return [
                    'id' => (int)$a['id'],
                    'title' => (string)$a['title_pt'],
                    'image' => (string)($a['cover_url'] ?? ''),
                    'href' => $page !== '' ? '/' . ltrim($page, '/') : '',
                ];
            }, $tour['attractions']),
        ];
    }
    $rows = $pdo->query(
        "SELECT id, slug, title_pt, duration_minutes, duracao_json, cover_url, tarifario_id, tarifa_guia, tarifa_translado, tem_passeio, categorias, saidas_json FROM gcv_attractions
         WHERE status = 'published' AND title_pt NOT LIKE '% + %'
           AND (tarifario_id IS NOT NULL OR (tarifa_guia <> '' AND tarifa_translado <> ''))
         ORDER BY title_pt ASC"
    )->fetchAll();
    $mapa = gcv_cidades_saida_mapa($pdo);
    foreach ($rows as $row) {
        if (isset($row['tem_passeio']) && (int)$row['tem_passeio'] !== 1) {
            continue;
        }
        $page = gcv_attraction_public_html_path((string)$row['slug']);
        $tarifa = gcv_tarifa_resolver(
            $pdo,
            (string)($row['tarifa_guia'] ?? ''),
            (string)($row['tarifa_translado'] ?? ''),
            $row['tarifario_id'] !== null ? (int)$row['tarifario_id'] : null
        );
        if ($page === '' || !$tarifa) {
            continue;
        }
        $minutos = (int)($row['duration_minutes'] ?? 0);
        $out[] = [
            'id' => 'a-' . $row['id'],
            'kind' => 'atrativo',
            'slug' => (string)$row['slug'],
            'attraction_ids' => [(int)$row['id']],
            'title' => (string)$row['title_pt'],
            'count' => 1,
            'categories' => gcv_passeio_categorias_parse($row['categorias'] ?? null, 1),
            'duration_minutes' => (int)($row['duration_minutes'] ?? 0),
            'duracao_cidades' => gcv_duracao_cidades($row['duracao_json'] ?? null, $minutos),
            'tarifa' => $tarifa,
            'saidas' => gcv_saidas_public(
                gcv_saidas_chaves($row['saidas_json'] ?? null, $tarifa, $mapa),
                $tarifa,
                $row['duracao_json'] ?? null,
                $minutos,
                $mapa
            ),
            'image' => (string)($row['cover_url'] ?? ''),
            'href' => '/' . ltrim($page, '/'),
            'attractions' => [(string)$row['title_pt']],
            'parts' => [[
                'id' => (int)$row['id'],
                'title' => (string)$row['title_pt'],
                'image' => (string)($row['cover_url'] ?? ''),
                'href' => '/' . ltrim($page, '/'),
            ]],
        ];
    }
    return $out;
}
