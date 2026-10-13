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
 *   exclusivo_pessoa_cents       PAX 4- privativo, sem translado
 *   exclusivo_pessoa_5_cents     PAX 5+ privativo, sem translado (tem que ser menor que o PAX 4-)
 *   exclusivo_transporte_cents   privativo com translado (sem faixa)
 *   excursao_pessoa_cents        PAX 4- excursão, sem translado
 *   excursao_pessoa_5_cents      PAX 5+ excursão, sem translado (tem que ser menor que o PAX 4-)
 *   excursao_transporte_cents    excursão com translado (sem faixa)
 *
 * Sem translado, excursão: até 4 pessoas pagam o PAX 4-. Da 5ª em diante,
 * total = 4 × PAX 4- + (pessoas − 4) × PAX 5+.
 * Sem translado, privativo de 1 pessoa até o quórum: total = quórum × PAX 4- Excursão.
 * Acima do quórum: esse pacote + (pessoas − quórum) × PAX 5+ Privativo.
 * Excursão é sempre menor que o privativo do mesmo campo. Não podem ser iguais.
 * PAX 4- Excursão × quórum não pode ficar abaixo da diária mínima de guiagem.
 * Com translado não há PAX 5+. O guia em outro idioma entra uma vez nesse total.
 * bilingue_tipo fixo = bilingue_valor em centavos. percentual = bilingue_valor inteiro (0–100).
 * Português soma zero. Vazio no fixo = R$ 40. Vazio no percentual = 0.
 */

require_once __DIR__ . '/experiencias.php';

const GCV_TARIFARIO_CIDADES = [
    'alto-paraiso' => 'Alto Paraíso de Goiás',
    'sao-jorge' => 'São Jorge',
    'cavalcante' => 'Cavalcante',
];

const GCV_TARIFARIO_CAMPOS = [
    'exclusivo_pessoa_cents',
    'exclusivo_pessoa_5_cents',
    'exclusivo_transporte_cents',
    'excursao_pessoa_cents',
    'excursao_pessoa_5_cents',
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
    if (!gcv_tarifario_column_exists($pdo, 'gcv_passeio_relacionado', 'tarifas_saida_json')) {
        $pdo->exec('ALTER TABLE gcv_passeio_relacionado ADD COLUMN tarifas_saida_json TEXT NULL');
    }
    gcv_passeio_max_atrativos_ensure($pdo);
    gcv_bilingue_universal_ensure($pdo);
    gcv_tarifario_regras_ensure($pdo);
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
                'Número máximo de experiências no mesmo passeio (até 3)',
                'integer',
            ]);
        } else {
            $pdo->prepare('UPDATE gcv_settings SET label = ? WHERE key_name = ?')->execute([
                'Número máximo de experiências no mesmo passeio (até 3)',
                'passeio_max_atrativos',
            ]);
            $cur = $pdo->prepare('SELECT value FROM gcv_settings WHERE key_name = ? LIMIT 1');
            $cur->execute(['passeio_max_atrativos']);
            if ((int)$cur->fetchColumn() > 3) {
                $pdo->prepare('UPDATE gcv_settings SET value = ? WHERE key_name = ?')->execute(['3', 'passeio_max_atrativos']);
            }
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
        gcv_experiencia_apos_atrativo($pdo, (int)$body['attraction_id']);
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
            if (str_ends_with($campo, '_5_cents')) {
                continue;
            }
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
    $cidadesTarifa = is_array($tarifa) && is_array($tarifa['cidades'] ?? null) ? $tarifa['cidades'] : [];
    foreach ($chaves as $key) {
        $row = is_array($cidadesTarifa[$key] ?? null) ? $cidadesTarifa[$key] : [];
        $temPreco = false;
        foreach (GCV_TARIFARIO_CAMPOS as $campo) {
            if (str_ends_with($campo, '_5_cents')) {
                continue;
            }
            if ((int)($row[$campo] ?? 0) > 0) {
                $temPreco = true;
                break;
            }
        }
        if (!$temPreco && is_array($cidadesTarifa['alto-paraiso'] ?? null)) {
            $row = $cidadesTarifa['alto-paraiso'];
        }
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
            if ($cents > 0 && !str_ends_with($campo, '_5_cents')) {
                $vende = true;
            }
        }
        if ($vende) {
            $out[] = $item;
        }
    }
    return $out;
}

/**
 * Cidades de embarque da experiência.
 * Cada cidade gravada já é uma saída. Sem embarques, vale a lista antiga.
 *
 * @return list<string>
 */
function gcv_embarques_publicos(?string $experienciaJson, $saidasJson, ?array $tarifa, array $mapa): array
{
    if (is_string($experienciaJson) && $experienciaJson !== '') {
        $exp = json_decode($experienciaJson, true);
        if (is_array($exp) && isset($exp['embarques']) && is_array($exp['embarques']) && $exp['embarques']) {
            $out = [];
            foreach (array_keys($mapa) as $key) {
                $row = $exp['embarques'][$key] ?? null;
                if (!is_array($row)) {
                    continue;
                }
                $out[] = $key;
            }
            return array_values(array_unique($out));
        }
    }
    if ($saidasJson !== null && $saidasJson !== '') {
        return gcv_saidas_chaves($saidasJson, $tarifa, $mapa);
    }
    return gcv_saidas_chaves(null, $tarifa, $mapa);
}

/** A tarifa do conjunto vale igual em qualquer cidade da interseção. */
function gcv_tarifa_relacao_plana(?array $tarifa): ?array
{
    if (!$tarifa) {
        return $tarifa;
    }
    $cidades = [];
    foreach (array_keys(GCV_TARIFARIO_CIDADES) as $key) {
        $row = [];
        foreach (GCV_TARIFARIO_CAMPOS as $campo) {
            $row[$campo] = max(0, (int)($tarifa[$campo] ?? 0));
        }
        $cidades[$key] = $row;
    }
    $tarifa['cidades'] = $cidades;
    return $tarifa;
}

/**
 * @param list<list<string>> $listas
 * @return list<string>
 */
function gcv_embarques_intersecao(array $listas): array
{
    $base = $listas[0] ?? [];
    $out = [];
    foreach ($base as $key) {
        $ok = true;
        foreach ($listas as $lista) {
            if (!in_array($key, $lista, true)) {
                $ok = false;
                break;
            }
        }
        if ($ok) {
            $out[] = $key;
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
    if ($kind !== 'passeio') {
        gcv_experiencia_apos_atrativo($pdo, $id);
    }
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
    return max(1, min(3, $max));
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

/** EXC120(100) / PRI150(130). Fora do parêntese: até 4 pessoas. Dentro: da 5ª. 0 no 5+ repete o 4-. */
function gcv_tarifa_nome_sem_translado(int $excursao, int $excursao5, int $privativo, int $privativo5): string
{
    $exc5 = $excursao5 > 0 ? $excursao5 : $excursao;
    $pri5 = $privativo5 > 0 ? $privativo5 : $privativo;
    return 'EXC' . $excursao . '(' . $exc5 . ') / PRI' . $privativo . '(' . $pri5 . ')';
}

/** @return array{codigo:string,tipo:string,excursao:int,privativo:int,excursao_5:int,privativo_5:int,excursao_cents:int,privativo_cents:int,excursao_5_cents:int,privativo_5_cents:int,nome:string} */
function gcv_tarifa_oficial_linha(string $tipo, string $codigo, int $excursao, int $privativo, int $excursao5 = 0, int $privativo5 = 0): array
{
    $tipo = $tipo === 'translado' ? 'translado' : 'guia';
    $excursao = max(0, $excursao);
    $privativo = max(0, $privativo);
    $excursao5 = $tipo === 'guia' ? max(0, $excursao5) : 0;
    $privativo5 = $tipo === 'guia' ? max(0, $privativo5) : 0;
    return [
        'codigo' => $codigo,
        'tipo' => $tipo,
        'excursao' => $excursao,
        'privativo' => $privativo,
        'excursao_5' => $excursao5,
        'privativo_5' => $privativo5,
        'excursao_cents' => $excursao * 100,
        'privativo_cents' => $privativo * 100,
        'excursao_5_cents' => $excursao5 * 100,
        'privativo_5_cents' => $privativo5 * 100,
        'nome' => $tipo === 'guia'
            ? gcv_tarifa_nome_sem_translado($excursao, $excursao5, $privativo, $privativo5)
            : ('Tarifa Translado · excursão ' . $excursao . ' / privativo ' . $privativo),
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
        $out[] = gcv_tarifa_oficial_linha($tipo, $codigo, $exc, $pri, (int)($row['excursao_5'] ?? 0), (int)($row['privativo_5'] ?? 0));
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
            'excursao_5' => (int)($row['excursao_5'] ?? 0),
            'privativo_5' => (int)($row['privativo_5'] ?? 0),
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
    $vistos = [];
    foreach (['gcv_attractions', 'gcv_passeio_relacionado'] as $table) {
        $stmt = $pdo->prepare("SELECT id FROM {$table} WHERE tarifa_guia = ? OR tarifa_translado = ?");
        $stmt->execute([$codigo, $codigo]);
        foreach ($stmt->fetchAll() as $row) {
            $vistos[$table . ':' . (int)$row['id']] = true;
            $n++;
        }
    }
    $mapa = gcv_cidades_saida_mapa($pdo);
    $attrs = $pdo->query('SELECT id, tarifa_guia, tarifa_translado, experiencia_json, saidas_json FROM gcv_attractions')->fetchAll();
    foreach ($attrs as $row) {
        $marca = 'gcv_attractions:' . (int)$row['id'];
        if (isset($vistos[$marca])) {
            continue;
        }
        foreach (gcv_saidas_tarifas_atrativo($row, $mapa) as $saida) {
            if ($saida['guia'] === $codigo || $saida['translado'] === $codigo) {
                $n++;
                break;
            }
        }
    }
    try {
        $tours = $pdo->query('SELECT id, tarifa_guia, tarifa_translado, tarifas_saida_json FROM gcv_passeio_relacionado')->fetchAll();
    } catch (Throwable $e) {
        $tours = [];
    }
    foreach ($tours as $row) {
        $marca = 'gcv_passeio_relacionado:' . (int)$row['id'];
        if (isset($vistos[$marca])) {
            continue;
        }
        foreach (gcv_saidas_tarifas_passeio($row, array_keys($mapa), $mapa) as $saida) {
            if ($saida['guia'] === $codigo || $saida['translado'] === $codigo) {
                $n++;
                break;
            }
        }
    }
    return $n;
}

function gcv_tarifa_oficial_criar(PDO $pdo, string $tipo, int $excursao, int $privativo, int $excursao5 = 0, int $privativo5 = 0): string
{
    if ($tipo !== 'guia' && $tipo !== 'translado') {
        throw new InvalidArgumentException('Escolha Tarifa Guia ou Tarifa Translado.');
    }
    if ($excursao < 1 || $excursao > 100000 || $privativo < 1 || $privativo > 100000) {
        throw new InvalidArgumentException('Informe a excursão e o privativo em reais.');
    }
    if ($tipo !== 'guia') {
        $excursao5 = 0;
        $privativo5 = 0;
    }
    if ($excursao5 < 0 || $excursao5 > 100000 || $privativo5 < 0 || $privativo5 > 100000) {
        throw new InvalidArgumentException('Informe o PAX 5+ em reais.');
    }
    $quorum = max(1, gcv_tarifario_setting_int($pdo, 'passeio_quorum', 4));
    $diaria = gcv_tarifario_setting_int($pdo, 'diaria_minima_reais', 320);
    if ($tipo === 'guia') {
        gcv_tarifario_validar_guia_valores($excursao, $excursao5, $privativo, $privativo5, '');
        gcv_tarifario_validar_diaria_valor($excursao, $quorum, $diaria, '');
    } else {
        gcv_tarifario_validar_translado_valores($excursao, $privativo, '');
    }
    $rows = gcv_tarifas_oficiais_ler($pdo);
    foreach ($rows as $row) {
        if ($row['tipo'] === $tipo && $row['excursao'] === $excursao && $row['privativo'] === $privativo
            && (int)$row['excursao_5'] === $excursao5 && (int)$row['privativo_5'] === $privativo5) {
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
    $rows[] = gcv_tarifa_oficial_linha($tipo, $codigo, $excursao, $privativo, $excursao5, $privativo5);
    gcv_tarifas_oficiais_gravar($pdo, $rows);
    return $codigo;
}

/** Grava o PAX 5+ de uma Tarifa Guia já existente. Tem que ser menor que o PAX 4-. */
function gcv_tarifa_oficial_pax5(PDO $pdo, string $codigo, int $excursao5, int $privativo5): void
{
    $codigo = trim($codigo);
    if ($excursao5 < 0 || $excursao5 > 100000 || $privativo5 < 0 || $privativo5 > 100000) {
        throw new InvalidArgumentException('Informe o PAX 5+ em reais.');
    }
    $rows = gcv_tarifas_oficiais_ler($pdo);
    $found = false;
    $quorum = max(1, gcv_tarifario_setting_int($pdo, 'passeio_quorum', 4));
    $diaria = gcv_tarifario_setting_int($pdo, 'diaria_minima_reais', 320);
    foreach ($rows as $i => $row) {
        if ($row['codigo'] !== $codigo) {
            continue;
        }
        if ($row['tipo'] !== 'guia') {
            throw new InvalidArgumentException('PAX 5+ só existe na Tarifa Guia, sem translado.');
        }
        gcv_tarifario_validar_guia_valores((int)$row['excursao'], $excursao5, (int)$row['privativo'], $privativo5, (string)$row['nome']);
        gcv_tarifario_validar_diaria_valor((int)$row['excursao'], $quorum, $diaria, (string)$row['nome']);
        $rows[$i] = gcv_tarifa_oficial_linha('guia', $codigo, (int)$row['excursao'], (int)$row['privativo'], $excursao5, $privativo5);
        $found = true;
        break;
    }
    if (!$found) {
        throw new InvalidArgumentException('Tarifa não encontrada.');
    }
    gcv_tarifas_oficiais_gravar($pdo, $rows);
}

/** Altera os valores de uma tarifa já existente. O código não muda, para os vínculos continuarem. */
function gcv_tarifa_oficial_editar(PDO $pdo, string $codigo, int $excursao, int $privativo, int $excursao5 = 0, int $privativo5 = 0): void
{
    $codigo = trim($codigo);
    if ($excursao < 1 || $excursao > 100000 || $privativo < 1 || $privativo > 100000) {
        throw new InvalidArgumentException('Preencha todos os valores da tarifa.');
    }
    $rows = gcv_tarifas_oficiais_ler($pdo);
    $found = false;
    $quorum = max(1, gcv_tarifario_setting_int($pdo, 'passeio_quorum', 4));
    $diaria = gcv_tarifario_setting_int($pdo, 'diaria_minima_reais', 320);
    foreach ($rows as $i => $row) {
        if ($row['codigo'] !== $codigo) {
            continue;
        }
        $tipo = (string)$row['tipo'];
        if ($tipo !== 'guia') {
            $excursao5 = 0;
            $privativo5 = 0;
            gcv_tarifario_validar_translado_valores($excursao, $privativo, (string)$row['nome']);
        } else {
            if ($excursao5 < 1 || $privativo5 < 1) {
                throw new InvalidArgumentException('Preencha o PAX 5+ da excursão e do privativo.');
            }
            gcv_tarifario_validar_guia_valores($excursao, $excursao5, $privativo, $privativo5, (string)$row['nome']);
            gcv_tarifario_validar_diaria_valor($excursao, $quorum, $diaria, (string)$row['nome']);
        }
        foreach ($rows as $outra) {
            if ($outra['codigo'] === $codigo || $outra['tipo'] !== $tipo) {
                continue;
            }
            if ((int)$outra['excursao'] === $excursao && (int)$outra['privativo'] === $privativo
                && (int)$outra['excursao_5'] === $excursao5 && (int)$outra['privativo_5'] === $privativo5) {
                throw new InvalidArgumentException('Essa tarifa já existe.');
            }
        }
        $rows[$i] = gcv_tarifa_oficial_linha($tipo, $codigo, $excursao, $privativo, $excursao5, $privativo5);
        $found = true;
        break;
    }
    if (!$found) {
        throw new InvalidArgumentException('Tarifa não encontrada.');
    }
    gcv_tarifas_oficiais_gravar($pdo, $rows);
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
        gcv_tarifa_oficial_realocar_json($pdo, $codigo, (string)$acima['codigo'], $col === 'tarifa_guia' ? 'guia' : 'translado');
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
 * Sem Tarifa Guia, devolve null. Sem Tarifa Translado, o passeio vende só a pé.
 *
 * @return array<string,mixed>|null
 */
function gcv_tarifa_oficial_montar(?string $guiaCodigo, ?string $transladoCodigo, int $quorum = 4): ?array
{
    $guia = gcv_tarifa_oficial_item((string)$guiaCodigo, 'guia');
    $trans = gcv_tarifa_oficial_item((string)$transladoCodigo, 'translado');
    if (!$guia) {
        return null;
    }
    $cidades = [];
    foreach (array_keys(GCV_TARIFARIO_CIDADES) as $key) {
        $cidades[$key] = [
            'excursao_pessoa_cents' => $guia['excursao_cents'],
            'exclusivo_pessoa_cents' => $guia['privativo_cents'],
            'excursao_pessoa_5_cents' => $guia['excursao_5_cents'],
            'exclusivo_pessoa_5_cents' => $guia['privativo_5_cents'],
            'excursao_transporte_cents' => $trans['excursao_cents'] ?? 0,
            'exclusivo_transporte_cents' => $trans['privativo_cents'] ?? 0,
        ];
    }
    $base = $cidades['alto-paraiso'];
    return [
        'id' => 0,
        'nome' => $guia['nome'] . ($trans ? ' + ' . $trans['nome'] : ''),
        'oficial' => true,
        'tarifa_guia' => $guia['codigo'],
        'tarifa_translado' => $trans['codigo'] ?? '',
        'quorum' => max(1, min(20, $quorum)),
        'exclusivo_pessoa_cents' => $base['exclusivo_pessoa_cents'],
        'excursao_pessoa_cents' => $base['excursao_pessoa_cents'],
        'exclusivo_pessoa_5_cents' => $base['exclusivo_pessoa_5_cents'],
        'excursao_pessoa_5_cents' => $base['excursao_pessoa_5_cents'],
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

/** Tem preço de venda: par oficial ou tabela antiga com algum valor. */
function gcv_passeio_tarifa_vende(?array $tarifa): bool
{
    if (!$tarifa) {
        return false;
    }
    $checar = static function (array $row): bool {
        foreach (GCV_TARIFARIO_CAMPOS as $campo) {
            if (str_ends_with($campo, '_5_cents')) {
                continue;
            }
            if ((int)($row[$campo] ?? 0) > 0) {
                return true;
            }
        }
        return false;
    };
    if ($checar($tarifa)) {
        return true;
    }
    $cidades = is_array($tarifa['cidades'] ?? null) ? $tarifa['cidades'] : [];
    foreach ($cidades as $row) {
        if (is_array($row) && $checar($row)) {
            return true;
        }
    }
    return false;
}

/** O passeio pode existir sem tarifa. Sem preço, não entra no site. */
function gcv_passeio_tem_preco_publico(PDO $pdo, int $passeioId): bool
{
    if ($passeioId <= 0) {
        return false;
    }
    $stmt = $pdo->prepare('SELECT tarifa_guia, tarifa_translado, tarifario_id FROM gcv_passeio_relacionado WHERE id = ? LIMIT 1');
    $stmt->execute([$passeioId]);
    $row = $stmt->fetch();
    if (!$row) {
        return false;
    }
    $tid = isset($row['tarifario_id']) && $row['tarifario_id'] !== null && $row['tarifario_id'] !== '' ? (int)$row['tarifario_id'] : null;
    return gcv_passeio_tarifa_vende(gcv_tarifa_resolver(
        $pdo,
        (string)($row['tarifa_guia'] ?? ''),
        (string)($row['tarifa_translado'] ?? ''),
        $tid
    ));
}

/** Experiência ativada, com página e com preço. Sem isso, o passeio dela e os relacionados ficam fora do site. */
function gcv_atrativo_vende_no_site(PDO $pdo, array $row): bool
{
    if ((string)($row['status'] ?? '') !== 'published') {
        return false;
    }
    if (isset($row['tem_passeio']) && (int)$row['tem_passeio'] !== 1) {
        return false;
    }
    if (!function_exists('gcv_attraction_public_html_path')) {
        require_once __DIR__ . '/excursion_attractions.php';
    }
    if (gcv_attraction_public_html_path((string)($row['slug'] ?? '')) === '') {
        return false;
    }
    $mapa = gcv_cidades_saida_mapa($pdo);
    $pares = [];
    foreach (gcv_saidas_tarifas_atrativo($row, $mapa) as $saida) {
        if (($saida['key'] ?? '') === '' || (($saida['guia'] ?? '') === '' && ($saida['translado'] ?? '') === '')) {
            continue;
        }
        $pares[$saida['key']] = ['guia' => $saida['guia'], 'translado' => $saida['translado']];
    }
    $tarifa = $pares
        ? gcv_tarifa_aplicar_bilingue(gcv_tarifa_de_pares($pares, gcv_tarifario_setting_int($pdo, 'passeio_quorum', 4)), gcv_bilingue_universal_get($pdo))
        : null;
    if (!$tarifa) {
        $tid = isset($row['tarifario_id']) && $row['tarifario_id'] !== null && $row['tarifario_id'] !== '' ? (int)$row['tarifario_id'] : null;
        $tarifa = gcv_tarifa_resolver($pdo, (string)($row['tarifa_guia'] ?? ''), (string)($row['tarifa_translado'] ?? ''), $tid);
    }
    return gcv_passeio_tarifa_vende($tarifa);
}

/** Cada experiência do passeio precisa vender sozinha. Uma desativada ou sem tarifa tira o conjunto. */
function gcv_passeio_experiencias_vendem(PDO $pdo, int $passeioId): bool
{
    if ($passeioId <= 0) {
        return false;
    }
    $stmt = $pdo->prepare(
        'SELECT a.slug, a.status, a.tem_passeio, a.tarifa_guia, a.tarifa_translado, a.tarifario_id, a.experiencia_json, a.saidas_json
         FROM gcv_passeio_relacionado_atrativo x
         INNER JOIN gcv_attractions a ON a.id = x.attraction_id
         WHERE x.passeio_id = ?'
    );
    $stmt->execute([$passeioId]);
    $rows = $stmt->fetchAll();
    if (!$rows) {
        return false;
    }
    foreach ($rows as $row) {
        if (!gcv_atrativo_vende_no_site($pdo, $row)) {
            return false;
        }
    }
    return true;
}

/** @return array<string,mixed>|null */
function gcv_tarifa_resolver(PDO $pdo, ?string $guia, ?string $translado, ?int $tarifarioId): ?array
{
    $oficial = gcv_tarifa_oficial_montar($guia, $translado, gcv_tarifario_setting_int($pdo, 'passeio_quorum', 4));
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
        $id = (int)$body['attraction_id'];
        $stmt = $pdo->prepare('SELECT id, tarifa_guia, tarifa_translado, experiencia_json, saidas_json FROM gcv_attractions WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new InvalidArgumentException('Experiência não encontrada.');
        }
        $lista = gcv_saidas_tarifas_atrativo($row, gcv_cidades_saida_mapa($pdo));
        if (!$lista) {
            $pdo->prepare('UPDATE gcv_attractions SET tarifa_guia = ?, tarifa_translado = ? WHERE id = ?')->execute([$guia, $trans, $id]);
            gcv_experiencia_apos_atrativo($pdo, $id);
            return;
        }
        foreach ($lista as $i => $item) {
            $lista[$i]['guia'] = $guia ?? '';
            $lista[$i]['translado'] = $trans ?? '';
        }
        gcv_saidas_tarifas_gravar_atrativo($pdo, $row, $lista);
        return;
    }
    if (!empty($body['passeio_id'])) {
        $id = (int)$body['passeio_id'];
        $stmt = $pdo->prepare('SELECT * FROM gcv_passeio_relacionado WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $passeio = $stmt->fetch();
        if (!$passeio) {
            throw new InvalidArgumentException('Passeio não encontrado.');
        }
        $mapa = gcv_cidades_saida_mapa($pdo);
        if (!function_exists('gcv_related_tour_one')) {
            require_once __DIR__ . '/related_tours.php';
        }
        $tour = gcv_related_tour_one($pdo, $id);
        $chaves = [];
        foreach (is_array($tour['saidas_tarifas'] ?? null) ? $tour['saidas_tarifas'] : [] as $saida) {
            if (!empty($saida['key'])) {
                $chaves[] = (string)$saida['key'];
            }
        }
        $lista = gcv_saidas_tarifas_passeio($passeio, $chaves, $mapa);
        if (!$lista) {
            $pdo->prepare('UPDATE gcv_passeio_relacionado SET tarifa_guia = ?, tarifa_translado = ? WHERE id = ?')->execute([$guia, $trans, $id]);
            return;
        }
        foreach ($lista as $i => $item) {
            $lista[$i]['guia'] = $guia ?? '';
            $lista[$i]['translado'] = $trans ?? '';
        }
        gcv_saidas_tarifas_gravar_passeio($pdo, $id, $lista);
        return;
    }
    throw new InvalidArgumentException('Informe o atrativo ou o passeio.');
}

/** @return array<string,mixed> */
function gcv_experiencia_decode_json($raw): array
{
    if (is_array($raw)) {
        return $raw;
    }
    if (!is_string($raw) || $raw === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function gcv_experiencia_so4x4($raw): bool
{
    $exp = gcv_experiencia_decode_json($raw);
    $log = $exp['logistica'] ?? null;
    return is_array($log) && !empty($log['so4x4']);
}

function gcv_experiencia_max_participantes($raw): int
{
    $exp = gcv_experiencia_decode_json($raw);
    $log = is_array($exp['logistica'] ?? null) ? $exp['logistica'] : [];
    $n = (int)($log['max'] ?? 0);
    if ($n < 4 || $n > 15) {
        return 0;
    }
    return $n;
}

/** Menor máximo entre as experiências do passeio. Zero se nenhuma definiu. */
function gcv_passeio_max_participantes(PDO $pdo, array $ids): int
{
    $ids = array_values(array_unique(array_filter(array_map('intval', $ids), static fn(int $id): bool => $id > 0)));
    if (!$ids) {
        return 0;
    }
    try {
        $rows = $pdo->query(
            'SELECT experiencia_json FROM gcv_attractions WHERE id IN (' . implode(',', $ids) . ')'
        )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        return 0;
    }
    $nums = [];
    foreach ($rows as $row) {
        $n = gcv_experiencia_max_participantes($row['experiencia_json'] ?? null);
        if ($n >= 4) {
            $nums[] = $n;
        }
    }
    return $nums ? min($nums) : 0;
}

function gcv_max_people_excursao_erro(PDO $pdo, array $ids, int $maxPeople): ?string
{
    if ($maxPeople < 4) {
        return 'As vagas não podem ser menos que 4.';
    }
    if ($maxPeople > 15) {
        return 'As vagas não podem passar de 15.';
    }
    $teto = gcv_passeio_max_participantes($pdo, $ids);
    if ($teto >= 4 && $maxPeople > $teto) {
        return 'Este passeio permite no máximo ' . $teto . ' pessoas.';
    }
    return null;
}

/**
 * Saídas da experiência com a tarifa de cada uma.
 * Sem cidade gravada e com tarifa na coluna, entra uma linha sem cidade.
 *
 * @param array<string,string> $mapa
 * @return list<array{key:string,nome:string,guia:string,translado:string}>
 */
function gcv_saidas_tarifas_atrativo(array $row, array $mapa): array
{
    $exp = gcv_experiencia_decode_json($row['experiencia_json'] ?? null);
    $embarques = is_array($exp['embarques'] ?? null) ? $exp['embarques'] : [];
    $fallbackGuia = trim((string)($row['tarifa_guia'] ?? ''));
    $fallbackTrans = trim((string)($row['tarifa_translado'] ?? ''));
    $chaves = [];
    foreach ($embarques as $key => $item) {
        if (!is_array($item)) {
            continue;
        }
        $key = (string)$key;
        if ($key !== '' && isset($mapa[$key])) {
            $chaves[] = $key;
        }
    }
    if (!$chaves) {
        $raw = $row['saidas_json'] ?? null;
        $decoded = is_string($raw) && $raw !== '' ? json_decode($raw, true) : (is_array($raw) ? $raw : []);
        if (is_array($decoded)) {
            foreach ($decoded as $key) {
                $key = (string)$key;
                if (isset($mapa[$key])) {
                    $chaves[] = $key;
                }
            }
        }
    }
    $chaves = array_values(array_unique($chaves));
    $out = [];
    foreach ($chaves as $key) {
        $salvo = is_array($embarques[$key] ?? null) ? $embarques[$key] : [];
        $temCampo = array_key_exists('guia', $salvo) || array_key_exists('trans', $salvo) || array_key_exists('translado', $salvo);
        $guia = $temCampo ? trim((string)($salvo['guia'] ?? '')) : $fallbackGuia;
        $trans = $temCampo
            ? trim((string)($salvo['trans'] ?? ($salvo['translado'] ?? '')))
            : $fallbackTrans;
        $out[] = [
            'key' => $key,
            'nome' => (string)($mapa[$key] ?? ($salvo['nome'] ?? $key)),
            'guia' => $guia,
            'translado' => $trans,
        ];
    }
    if (!$out && ($fallbackGuia !== '' || $fallbackTrans !== '')) {
        $out[] = [
            'key' => '',
            'nome' => 'Sem cidade de saída',
            'guia' => $fallbackGuia,
            'translado' => $fallbackTrans,
        ];
    }
    return $out;
}

/**
 * @param list<string> $chaves
 * @param array<string,string> $mapa
 * @return list<array{key:string,nome:string,guia:string,translado:string}>
 */
function gcv_saidas_tarifas_passeio(array $passeio, array $chaves, array $mapa): array
{
    $raw = gcv_experiencia_decode_json($passeio['tarifas_saida_json'] ?? null);
    $fallbackGuia = trim((string)($passeio['tarifa_guia'] ?? ''));
    $fallbackTrans = trim((string)($passeio['tarifa_translado'] ?? ''));
    $out = [];
    foreach ($chaves as $key) {
        $key = (string)$key;
        if ($key === '' || !isset($mapa[$key])) {
            continue;
        }
        $salvo = is_array($raw[$key] ?? null) ? $raw[$key] : null;
        $temCampo = is_array($salvo) && (array_key_exists('guia', $salvo) || array_key_exists('translado', $salvo));
        $out[] = [
            'key' => $key,
            'nome' => (string)($mapa[$key] ?? $key),
            'guia' => $temCampo ? trim((string)($salvo['guia'] ?? '')) : $fallbackGuia,
            'translado' => $temCampo ? trim((string)($salvo['translado'] ?? '')) : $fallbackTrans,
        ];
    }
    return $out;
}

/**
 * Preço por cidade de saída. Cada cidade usa a Tarifa Guia e, se houver, a Tarifa Translado dela.
 *
 * @param array<string,array{guia?:string,translado?:string}> $pares
 * @return array<string,mixed>|null
 */
function gcv_tarifa_de_pares(array $pares, int $quorum = 4): ?array
{
    $cidades = [];
    $base = null;
    $guiaCodigo = '';
    $transCodigo = '';
    $nome = '';
    foreach ($pares as $key => $par) {
        $key = (string)$key;
        if ($key === '' || !is_array($par)) {
            continue;
        }
        $guia = gcv_tarifa_oficial_item((string)($par['guia'] ?? ''), 'guia');
        $trans = gcv_tarifa_oficial_item((string)($par['translado'] ?? ''), 'translado');
        $row = [
            'excursao_pessoa_cents' => (int)($guia['excursao_cents'] ?? 0),
            'exclusivo_pessoa_cents' => (int)($guia['privativo_cents'] ?? 0),
            'excursao_pessoa_5_cents' => (int)($guia['excursao_5_cents'] ?? 0),
            'exclusivo_pessoa_5_cents' => (int)($guia['privativo_5_cents'] ?? 0),
            'excursao_transporte_cents' => (int)($trans['excursao_cents'] ?? 0),
            'exclusivo_transporte_cents' => (int)($trans['privativo_cents'] ?? 0),
        ];
        $cidades[$key] = $row;
        if ($base === null && $guia) {
            $base = $row;
            $guiaCodigo = (string)$guia['codigo'];
            $transCodigo = $trans ? (string)$trans['codigo'] : '';
            $nome = (string)$guia['nome'] . ($trans ? ' + ' . $trans['nome'] : '');
        }
    }
    if (!$base) {
        return null;
    }
    return [
        'id' => 0,
        'nome' => $nome,
        'oficial' => true,
        'tarifa_guia' => $guiaCodigo,
        'tarifa_translado' => $transCodigo,
        'quorum' => max(1, min(20, $quorum)),
        'exclusivo_pessoa_cents' => $base['exclusivo_pessoa_cents'],
        'excursao_pessoa_cents' => $base['excursao_pessoa_cents'],
        'exclusivo_pessoa_5_cents' => $base['exclusivo_pessoa_5_cents'],
        'excursao_pessoa_5_cents' => $base['excursao_pessoa_5_cents'],
        'exclusivo_transporte_cents' => $base['exclusivo_transporte_cents'],
        'excursao_transporte_cents' => $base['excursao_transporte_cents'],
        'cidades' => $cidades,
    ];
}

/** @param list<array{key:string,guia:string,translado:string}> $lista */
function gcv_tarifa_colunas_da_lista(array $lista): array
{
    $ordem = array_keys(GCV_TARIFARIO_CIDADES);
    $escolha = null;
    foreach ($ordem as $pref) {
        foreach ($lista as $item) {
            if (($item['key'] ?? '') === $pref && trim((string)($item['guia'] ?? '')) !== '') {
                $escolha = $item;
                break 2;
            }
        }
    }
    if (!$escolha) {
        foreach ($lista as $item) {
            if (trim((string)($item['guia'] ?? '')) !== '') {
                $escolha = $item;
                break;
            }
        }
    }
    $guia = $escolha ? trim((string)$escolha['guia']) : '';
    $trans = $escolha ? trim((string)$escolha['translado']) : '';
    return [$guia !== '' ? $guia : null, $trans !== '' ? $trans : null];
}

/** @param list<array{key:string,nome:string,guia:string,translado:string}> $lista */
function gcv_saidas_tarifas_gravar_atrativo(PDO $pdo, array $row, array $lista): void
{
    $id = (int)($row['id'] ?? 0);
    $exp = gcv_experiencia_decode_json($row['experiencia_json'] ?? null);
    $embarques = is_array($exp['embarques'] ?? null) ? $exp['embarques'] : [];
    foreach ($lista as $item) {
        $key = (string)($item['key'] ?? '');
        if ($key === '') {
            continue;
        }
        $atual = is_array($embarques[$key] ?? null) ? $embarques[$key] : [];
        $atual['nome'] = (string)($item['nome'] ?? ($atual['nome'] ?? $key));
        $atual['guia'] = (string)($item['guia'] ?? '');
        $atual['trans'] = (string)($item['translado'] ?? '');
        $embarques[$key] = $atual;
    }
    $exp['embarques'] = $embarques;
    [$guia, $trans] = gcv_tarifa_colunas_da_lista($lista);
    $pdo->prepare('UPDATE gcv_attractions SET tarifa_guia = ?, tarifa_translado = ?, experiencia_json = ? WHERE id = ?')->execute([
        $guia,
        $trans,
        json_encode($exp, JSON_UNESCAPED_UNICODE),
        $id,
    ]);
    if (function_exists('gcv_experiencia_apos_atrativo')) {
        gcv_experiencia_apos_atrativo($pdo, $id);
    }
}

/** @param list<array{key:string,guia:string,translado:string}> $lista */
function gcv_saidas_tarifas_gravar_passeio(PDO $pdo, int $id, array $lista): void
{
    $map = [];
    foreach ($lista as $item) {
        $key = (string)($item['key'] ?? '');
        if ($key === '') {
            continue;
        }
        $map[$key] = [
            'guia' => (string)($item['guia'] ?? ''),
            'translado' => (string)($item['translado'] ?? ''),
        ];
    }
    [$guia, $trans] = gcv_tarifa_colunas_da_lista($lista);
    $pdo->prepare('UPDATE gcv_passeio_relacionado SET tarifa_guia = ?, tarifa_translado = ?, tarifas_saida_json = ? WHERE id = ?')->execute([
        $guia,
        $trans,
        $map ? json_encode($map, JSON_UNESCAPED_UNICODE) : null,
        $id,
    ]);
}

function gcv_tarifa_saida_salvar(PDO $pdo, array $body): void
{
    $kind = (string)($body['kind'] ?? '');
    $id = (int)($body['id'] ?? 0);
    $cidade = trim((string)($body['cidade'] ?? ''));
    $campo = (string)($body['campo'] ?? '');
    $codigo = trim((string)($body['codigo'] ?? ''));
    if ($campo !== 'guia' && $campo !== 'translado') {
        throw new InvalidArgumentException('Informe se é tarifa de guia ou de translado.');
    }
    if ($id <= 0) {
        throw new InvalidArgumentException('Informe a experiência ou o passeio.');
    }
    if ($codigo !== '') {
        $tipo = $campo === 'guia' ? 'guia' : 'translado';
        if (!gcv_tarifa_oficial_item($codigo, $tipo)) {
            throw new InvalidArgumentException('Tarifa não está na lista.');
        }
    }
    $mapa = gcv_cidades_saida_mapa($pdo);
    if ($cidade !== '' && !isset($mapa[$cidade])) {
        throw new InvalidArgumentException('Cidade de saída inválida.');
    }
    if ($kind === 'atrativo') {
        $stmt = $pdo->prepare('SELECT id, tarifa_guia, tarifa_translado, experiencia_json, saidas_json FROM gcv_attractions WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new InvalidArgumentException('Experiência não encontrada.');
        }
        $lista = gcv_saidas_tarifas_atrativo($row, $mapa);
        $found = false;
        foreach ($lista as $i => $item) {
            if ((string)$item['key'] !== $cidade) {
                continue;
            }
            $lista[$i][$campo] = $codigo;
            $found = true;
            break;
        }
        if (!$found) {
            if ($cidade === '') {
                throw new InvalidArgumentException('Essa experiência não tem cidade de saída.');
            }
            $lista[] = [
                'key' => $cidade,
                'nome' => (string)$mapa[$cidade],
                'guia' => $campo === 'guia' ? $codigo : '',
                'translado' => $campo === 'translado' ? $codigo : '',
            ];
        }
        gcv_saidas_tarifas_gravar_atrativo($pdo, $row, $lista);
        return;
    }
    if ($kind === 'passeio') {
        $stmt = $pdo->prepare('SELECT * FROM gcv_passeio_relacionado WHERE id = ? LIMIT 1');
        $stmt->execute([$id]);
        $passeio = $stmt->fetch();
        if (!$passeio) {
            throw new InvalidArgumentException('Passeio não encontrado.');
        }
        if (!function_exists('gcv_related_tour_one')) {
            require_once __DIR__ . '/related_tours.php';
        }
        $tour = gcv_related_tour_one($pdo, $id);
        $chaves = [];
        foreach (is_array($tour['saidas_tarifas'] ?? null) ? $tour['saidas_tarifas'] : [] as $saida) {
            if (!empty($saida['key'])) {
                $chaves[] = (string)$saida['key'];
            }
        }
        if ($cidade !== '' && !in_array($cidade, $chaves, true)) {
            throw new InvalidArgumentException('Essa saída não faz parte do passeio.');
        }
        $lista = gcv_saidas_tarifas_passeio($passeio, $chaves, $mapa);
        $found = false;
        foreach ($lista as $i => $item) {
            if ((string)$item['key'] !== $cidade) {
                continue;
            }
            $lista[$i][$campo] = $codigo;
            $found = true;
            break;
        }
        if (!$found) {
            throw new InvalidArgumentException('Essa saída não faz parte do passeio.');
        }
        gcv_saidas_tarifas_gravar_passeio($pdo, $id, $lista);
        return;
    }
    throw new InvalidArgumentException('Informe a experiência ou o passeio.');
}

function gcv_tarifa_oficial_realocar_json(PDO $pdo, string $de, string $para, string $campo): void
{
    $de = trim($de);
    $para = trim($para);
    if ($de === '' || $para === '' || ($campo !== 'guia' && $campo !== 'translado')) {
        return;
    }
    $attrs = $pdo->query("SELECT id, experiencia_json FROM gcv_attractions WHERE experiencia_json IS NOT NULL AND experiencia_json <> ''")->fetchAll();
    foreach ($attrs as $row) {
        $exp = gcv_experiencia_decode_json($row['experiencia_json'] ?? null);
        $embarques = is_array($exp['embarques'] ?? null) ? $exp['embarques'] : [];
        $mudou = false;
        foreach ($embarques as $key => $item) {
            if (!is_array($item)) {
                continue;
            }
            if ($campo === 'guia' && trim((string)($item['guia'] ?? '')) === $de) {
                $embarques[$key]['guia'] = $para;
                $mudou = true;
            }
            if ($campo === 'translado') {
                $atual = trim((string)($item['trans'] ?? ($item['translado'] ?? '')));
                if ($atual === $de) {
                    $embarques[$key]['trans'] = $para;
                    $embarques[$key]['translado'] = $para;
                    $mudou = true;
                }
            }
        }
        if ($mudou) {
            $exp['embarques'] = $embarques;
            $pdo->prepare('UPDATE gcv_attractions SET experiencia_json = ? WHERE id = ?')->execute([
                json_encode($exp, JSON_UNESCAPED_UNICODE),
                (int)$row['id'],
            ]);
        }
    }
    try {
        $tours = $pdo->query("SELECT id, tarifas_saida_json FROM gcv_passeio_relacionado WHERE tarifas_saida_json IS NOT NULL AND tarifas_saida_json <> ''")->fetchAll();
    } catch (Throwable $e) {
        $tours = [];
    }
    foreach ($tours as $row) {
        $map = gcv_experiencia_decode_json($row['tarifas_saida_json'] ?? null);
        $mudou = false;
        foreach ($map as $key => $item) {
            if (!is_array($item)) {
                continue;
            }
            $jsonCampo = $campo === 'guia' ? 'guia' : 'translado';
            if (trim((string)($item[$jsonCampo] ?? '')) === $de) {
                $map[$key][$jsonCampo] = $para;
                $mudou = true;
            }
        }
        if ($mudou) {
            $pdo->prepare('UPDATE gcv_passeio_relacionado SET tarifas_saida_json = ? WHERE id = ?')->execute([
                json_encode($map, JSON_UNESCAPED_UNICODE),
                (int)$row['id'],
            ]);
        }
    }
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
        'exclusivo_pessoa_5_cents' => $base['exclusivo_pessoa_5_cents'],
        'excursao_pessoa_5_cents' => $base['excursao_pessoa_5_cents'],
        'exclusivo_transporte_cents' => $base['exclusivo_transporte_cents'],
        'excursao_transporte_cents' => $base['excursao_transporte_cents'],
        'bilingue_tipo' => $norm['bilingue_tipo'],
        'bilingue_valor' => $norm['bilingue_valor'],
        'bilingue_cents' => $norm['bilingue_cents'],
        'cidades' => $norm['cidades'],
    ];
}

function gcv_tarifario_setting_int(PDO $pdo, string $key, int $default): int
{
    try {
        $stmt = $pdo->prepare('SELECT value FROM gcv_settings WHERE key_name = ? LIMIT 1');
        $stmt->execute([$key]);
        $v = $stmt->fetchColumn();
        if ($v === false || $v === null || $v === '') {
            return $default;
        }
        return (int)$v;
    } catch (Throwable $e) {
        return $default;
    }
}

function gcv_tarifario_regras_ensure(PDO $pdo): void
{
    $rows = [
        ['passeio_quorum', '4', 'Quórum do passeio (pessoas no pacote mínimo do privativo sem translado)', 'integer'],
        ['diaria_minima_reais', '320', 'Diária mínima de guiagem (R$)', 'integer'],
        ['pg_minimo_guia_reais', '280', 'Pagamento mínimo de guiagem (R$). Tem que ser menor que a diária mínima.', 'integer'],
    ];
    try {
        $check = $pdo->prepare('SELECT id FROM gcv_settings WHERE key_name = ? LIMIT 1');
        $ins = $pdo->prepare('INSERT INTO gcv_settings (key_name, value, label, type) VALUES (?,?,?,?)');
        $label = $pdo->prepare('UPDATE gcv_settings SET label = ? WHERE key_name = ?');
        foreach ($rows as [$key, $val, $text, $type]) {
            $check->execute([$key]);
            if (!$check->fetch()) {
                $ins->execute([$key, $val, $text, $type]);
            } else {
                $label->execute([$text, $key]);
            }
        }
    } catch (Throwable $e) {
        error_log('tarifario regras: ' . $e->getMessage());
    }
}

/** @return array{quorum:int,diaria_minima_reais:int,pg_minimo_guia_reais:int} */
function gcv_tarifario_regras_get(PDO $pdo): array
{
    return [
        'quorum' => max(1, min(20, gcv_tarifario_setting_int($pdo, 'passeio_quorum', 4))),
        'diaria_minima_reais' => max(0, gcv_tarifario_setting_int($pdo, 'diaria_minima_reais', 320)),
        'pg_minimo_guia_reais' => max(0, gcv_tarifario_setting_int($pdo, 'pg_minimo_guia_reais', 280)),
    ];
}

function gcv_tarifario_msg(string $onde, string $msg): string
{
    return $onde !== '' ? $onde . ': ' . $msg : $msg;
}

/** Preços na mesma unidade (reais ou centavos). Excursão sempre menor que o privativo. */
function gcv_tarifario_validar_guia_valores(int $exc4, int $exc5, int $pri4, int $pri5, string $onde): void
{
    if ($exc4 > 0 && $pri4 > 0 && $exc4 >= $pri4) {
        throw new InvalidArgumentException(gcv_tarifario_msg($onde, 'PAX 4- Excursão tem que ser menor que o PAX 4- Privativo.'));
    }
    if ($exc4 > 0 && ($exc5 <= 0 || $exc5 >= $exc4)) {
        throw new InvalidArgumentException(gcv_tarifario_msg($onde, 'PAX 5+ Excursão tem que ser menor que o PAX 4- Excursão.'));
    }
    if ($pri4 > 0 && ($pri5 <= 0 || $pri5 >= $pri4)) {
        throw new InvalidArgumentException(gcv_tarifario_msg($onde, 'PAX 5+ Privativo tem que ser menor que o PAX 4- Privativo.'));
    }
    if ($exc5 > 0 && $pri5 > 0 && $exc5 >= $pri5) {
        throw new InvalidArgumentException(gcv_tarifario_msg($onde, 'PAX 5+ Excursão tem que ser menor que o PAX 5+ Privativo.'));
    }
}

function gcv_tarifario_validar_translado_valores(int $excT, int $priT, string $onde): void
{
    if ($excT > 0 && $priT > 0 && $excT >= $priT) {
        throw new InvalidArgumentException(gcv_tarifario_msg($onde, 'Excursão com translado tem que ser menor que Privativo com translado.'));
    }
}

/** $exc4 e $diaria na mesma unidade. A diária do cliente é PAX 4- Excursão × quórum. */
function gcv_tarifario_validar_diaria_valor(int $exc4, int $quorum, int $diaria, string $onde): void
{
    $quorum = max(1, $quorum);
    if ($exc4 > 0 && $diaria > 0 && ($exc4 * $quorum) < $diaria) {
        throw new InvalidArgumentException(gcv_tarifario_msg($onde, 'PAX 4- Excursão × quórum ' . $quorum . ' fica abaixo da diária mínima de guiagem.'));
    }
}

/** @param array<string,array<string,int>> $cidades */
function gcv_tarifario_validar_cidades(array $cidades, int $quorum, int $diariaCents, string $nome): void
{
    foreach (GCV_TARIFARIO_CIDADES as $slug => $cidade) {
        $row = is_array($cidades[$slug] ?? null) ? $cidades[$slug] : [];
        $onde = $nome !== '' ? $nome . ' · ' . $cidade : $cidade;
        gcv_tarifario_validar_guia_valores(
            (int)($row['excursao_pessoa_cents'] ?? 0),
            (int)($row['excursao_pessoa_5_cents'] ?? 0),
            (int)($row['exclusivo_pessoa_cents'] ?? 0),
            (int)($row['exclusivo_pessoa_5_cents'] ?? 0),
            $onde
        );
        gcv_tarifario_validar_translado_valores(
            (int)($row['excursao_transporte_cents'] ?? 0),
            (int)($row['exclusivo_transporte_cents'] ?? 0),
            $onde
        );
        gcv_tarifario_validar_diaria_valor((int)($row['excursao_pessoa_cents'] ?? 0), $quorum, $diariaCents, $onde);
    }
}

/** Sobe a diária ou o quórum global só se nenhuma tarifa existente ficar abaixo. */
function gcv_tarifario_checar_piso(PDO $pdo, int $diariaReais, int $pagamentoReais, int $quorumGlobal): void
{
    if ($diariaReais < 1 || $pagamentoReais < 1) {
        throw new InvalidArgumentException('Informe a diária mínima e o pagamento mínimo de guiagem.');
    }
    if ($pagamentoReais >= $diariaReais) {
        throw new InvalidArgumentException('O pagamento mínimo de guiagem tem que ser menor que a diária mínima de guiagem.');
    }
    $quorumGlobal = max(1, min(20, $quorumGlobal));
    $falhas = [];
    try {
        $rows = $pdo->query('SELECT nome, quorum, precos_json FROM gcv_tarifario')->fetchAll();
    } catch (Throwable $e) {
        $rows = [];
    }
    foreach ($rows as $row) {
        $precos = json_decode((string)($row['precos_json'] ?? ''), true);
        $norm = gcv_tarifario_normalize(array_merge(is_array($precos) ? $precos : [], ['quorum' => $row['quorum'] ?? 4]));
        foreach (GCV_TARIFARIO_CIDADES as $slug => $cidade) {
            $exc = (int)($norm['cidades'][$slug]['excursao_pessoa_cents'] ?? 0);
            try {
                gcv_tarifario_validar_diaria_valor($exc, (int)$norm['quorum'], $diariaReais * 100, (string)$row['nome'] . ' · ' . $cidade);
            } catch (InvalidArgumentException $e) {
                $falhas[] = $e->getMessage();
            }
        }
    }
    foreach (gcv_tarifas_oficiais() as $oficial) {
        if (($oficial['tipo'] ?? '') !== 'guia') {
            continue;
        }
        try {
            gcv_tarifario_validar_diaria_valor((int)$oficial['excursao'], $quorumGlobal, $diariaReais, (string)$oficial['nome']);
        } catch (InvalidArgumentException $e) {
            $falhas[] = $e->getMessage();
        }
    }
    if ($falhas) {
        $mostradas = array_slice($falhas, 0, 4);
        $extra = count($falhas) > 4 ? ' E mais ' . (count($falhas) - 4) . '.' : '';
        throw new InvalidArgumentException(implode(' ', $mostradas) . $extra);
    }
}

function gcv_tarifario_regras_save(PDO $pdo, array $body): void
{
    gcv_tarifario_regras_ensure($pdo);
    $diaria = (int)($body['diaria_minima_reais'] ?? 0);
    $pg = (int)($body['pg_minimo_guia_reais'] ?? 0);
    gcv_tarifario_checar_piso($pdo, $diaria, $pg, gcv_tarifario_setting_int($pdo, 'passeio_quorum', 4));
    $pdo->prepare('UPDATE gcv_settings SET value = ? WHERE key_name = ?')->execute([(string)$diaria, 'diaria_minima_reais']);
    $pdo->prepare('UPDATE gcv_settings SET value = ? WHERE key_name = ?')->execute([(string)$pg, 'pg_minimo_guia_reais']);
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
    gcv_tarifario_validar_cidades($norm['cidades'], $norm['quorum'], gcv_tarifario_setting_int($pdo, 'diaria_minima_reais', 320) * 100, $nome);
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
    if (is_array($raw)) {
        foreach ($raw as $key => $val) {
            $key = (string)$key;
            if (isset($out[$key])) {
                continue;
            }
            $v = (int)$val;
            if ($v > 0) {
                $out[$key] = min($v, 1440);
            }
        }
    }
    return $out;
}

/** Minutos do campo Duração do passeio da cidade. Sem campo, Alto Paraíso usa a duração geral. */
function gcv_minutos_da_ficha(?string $experienciaJson, $duracaoJson, int $fallbackMinutes, string $key): int
{
    $exp = [];
    if (is_string($experienciaJson) && $experienciaJson !== '') {
        $decoded = json_decode($experienciaJson, true);
        if (is_array($decoded)) {
            $exp = $decoded;
        }
    }
    $embarques = is_array($exp['embarques'] ?? null) ? $exp['embarques'] : [];
    $salvo = is_array($embarques[$key] ?? null) ? $embarques[$key] : [];
    $doCampo = (int)($salvo['minutos'] ?? 0);
    if ($doCampo > 0) {
        return min($doCampo, 1440);
    }
    $dur = is_string($duracaoJson) && $duracaoJson !== '' ? json_decode($duracaoJson, true) : (is_array($duracaoJson) ? $duracaoJson : []);
    $doMapa = is_array($dur) ? (int)($dur[$key] ?? 0) : 0;
    if ($doMapa > 0) {
        return min($doMapa, 1440);
    }
    if ($key === 'alto-paraiso' && $fallbackMinutes > 0) {
        return min($fallbackMinutes, 1440);
    }
    return 0;
}

/** @param list<string> $chaves */
function gcv_duracao_da_ficha(?string $experienciaJson, $duracaoJson, int $fallbackMinutes, array $chaves): array
{
    if (!$chaves) {
        $chaves = array_keys(GCV_TARIFARIO_CIDADES);
    }
    $out = [];
    foreach ($chaves as $key) {
        $key = (string)$key;
        $out[$key] = gcv_minutos_da_ficha($experienciaJson, $duracaoJson, $fallbackMinutes, $key);
    }
    return $out;
}

/** @param array<string,mixed> $duracao */
function gcv_duracao_save(PDO $pdo, string $kind, int $id, array $duracao): void
{
    $mapa = gcv_cidades_saida_mapa($pdo);
    $clean = [];
    foreach ($duracao as $key => $val) {
        $key = (string)$key;
        if (!isset($mapa[$key])) {
            continue;
        }
        $v = (int)$val;
        if ($v > 0) {
            $clean[$key] = min($v, 1440);
        }
    }
    $table = $kind === 'passeio' ? 'gcv_passeio_relacionado' : 'gcv_attractions';
    $pdo->prepare("UPDATE $table SET duracao_json = ? WHERE id = ?")->execute([$clean ? json_encode($clean) : null, $id]);
    if ($kind !== 'passeio') {
        gcv_experiencia_apos_atrativo($pdo, $id);
    }
}

/** Um atrativo tem um só tarifário: gravar troca o anterior. null desliga. */
function gcv_tarifario_link_attraction(PDO $pdo, int $attractionId, ?int $tarifarioId): void
{
    if ($tarifarioId && !gcv_tarifario_get($pdo, $tarifarioId)) {
        throw new InvalidArgumentException('Tarifário não encontrado.');
    }
    $pdo->prepare('UPDATE gcv_attractions SET tarifario_id = ? WHERE id = ?')->execute([$tarifarioId ?: null, $attractionId]);
    gcv_experiencia_apos_atrativo($pdo, $attractionId);
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
    $mapaSaidas = gcv_cidades_saida_mapa($pdo);
    $rows = $pdo->query(
        "SELECT id, title_pt, slug, status, duration_minutes, duracao_json, tarifario_id, tarifa_guia, tarifa_translado, tem_passeio, categorias, saidas_json, experiencia_json FROM gcv_attractions
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
            'saidas_tarifas' => gcv_saidas_tarifas_atrativo($row, $mapaSaidas),
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
        if (!$tour || count($tour['attractions'] ?? []) < 2) {
            continue;
        }
        if (empty($tour['publicado']) && ($tour['tarifa_guia'] ?? '') === '' && ($tour['tarifa_translado'] ?? '') === '' && empty($tour['tarifario_id'])) {
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
        'regras' => gcv_tarifario_regras_get($pdo),
        'tarifarios' => array_values($tarifarios),
        'atrativos' => $attractions,
        'passeios' => $passeios,
    ];
}

/** Payload do widget na página do atrativo. null = atrativo não existe. */
function gcv_tarifario_public_attraction(PDO $pdo, string $slug): ?array
{
    $stmt = $pdo->prepare("SELECT id, slug, title_pt, duration_minutes, duracao_json, tarifario_id, tarifa_guia, tarifa_translado, tem_passeio, categorias, saidas_json, experiencia_json FROM gcv_attractions WHERE slug = ? AND status = 'published' LIMIT 1");
    $stmt->execute([$slug]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }
    $related = [];
    $max = gcv_passeio_max_atrativos($pdo);
    foreach (gcv_related_tours_for_attraction($pdo, (int)$row['id']) as $tour) {
        if (empty($tour['tarifa']) || !gcv_passeio_tarifa_vende($tour['tarifa']) || count($tour['attractions']) > $max) {
            continue;
        }
        if (!gcv_passeio_liberado_no_site($pdo, (int)$tour['id'])) {
            continue;
        }
        $related[] = $tour;
    }
    $mapa = gcv_cidades_saida_mapa($pdo);
    $pares = [];
    foreach (gcv_saidas_tarifas_atrativo($row, $mapa) as $saida) {
        if ($saida['key'] === '' || ($saida['guia'] === '' && $saida['translado'] === '')) {
            continue;
        }
        $pares[$saida['key']] = ['guia' => $saida['guia'], 'translado' => $saida['translado']];
    }
    $tarifa = $pares
        ? gcv_tarifa_aplicar_bilingue(gcv_tarifa_de_pares($pares, gcv_tarifario_setting_int($pdo, 'passeio_quorum', 4)), gcv_bilingue_universal_get($pdo))
        : null;
    if (!$tarifa) {
        $tarifa = gcv_tarifa_resolver(
            $pdo,
            (string)($row['tarifa_guia'] ?? ''),
            (string)($row['tarifa_translado'] ?? ''),
            $row['tarifario_id'] !== null ? (int)$row['tarifario_id'] : null
        );
    }
    if (!gcv_passeio_tarifa_vende($tarifa)) {
        $tarifa = null;
    }
    $minutos = (int)($row['duration_minutes'] ?? 0);
    $embarques = gcv_embarques_publicos(
        isset($row['experiencia_json']) ? (string)$row['experiencia_json'] : null,
        $row['saidas_json'] ?? null,
        $tarifa,
        $mapa
    );
    $duracao = gcv_duracao_da_ficha(
        isset($row['experiencia_json']) ? (string)$row['experiencia_json'] : null,
        $row['duracao_json'] ?? null,
        $minutos,
        $embarques
    );
    return [
        'slug' => (string)$row['slug'],
        'title' => (string)$row['title_pt'],
        'duration_minutes' => $minutos,
        'duracao_cidades' => $duracao,
        'tem_passeio' => (!isset($row['tem_passeio']) || (int)$row['tem_passeio'] === 1) && $tarifa !== null,
        'categorias' => gcv_passeio_categorias_parse($row['categorias'] ?? null, 1),
        'tarifa' => $tarifa,
        'embarques' => $embarques,
        'saidas' => gcv_saidas_public(
            $embarques,
            $tarifa,
            $duracao,
            0,
            $mapa
        ),
        'max_atrativos' => $max,
        'somente_4x4' => gcv_experiencia_so4x4($row['experiencia_json'] ?? null),
        'max_participantes' => gcv_experiencia_max_participantes($row['experiencia_json'] ?? null),
        'related_tours' => $related,
    ];
}

/** Catálogo da página Passeios: cadastrado sem tarifa fica de fora. */
function gcv_tarifario_public_catalog(PDO $pdo): array
{
    if (!function_exists('gcv_attraction_public_html_path')) {
        require_once __DIR__ . '/excursion_attractions.php';
    }
    $out = [];
    foreach ($pdo->query('SELECT id FROM gcv_passeio_relacionado ORDER BY id ASC')->fetchAll() as $row) {
        $tour = gcv_related_tour_one($pdo, (int)$row['id']);
        if (!$tour || empty($tour['tarifa']) || !gcv_passeio_tarifa_vende($tour['tarifa']) || count($tour['attractions'] ?? []) < 2 || count($tour['attractions']) > gcv_passeio_max_atrativos($pdo)) {
            continue;
        }
        $semPagina = false;
        foreach ($tour['attractions'] as $part) {
            if (($part['page'] ?? '') === '') {
                $semPagina = true;
            }
        }
        if ($semPagina) {
            continue;
        }
        if (!gcv_passeio_liberado_no_site($pdo, (int)$tour['id'])) {
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
            'somente_4x4' => !empty($tour['somente_4x4']),
            'max_participantes' => (int)($tour['max_participantes'] ?? 0),
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
        "SELECT id, slug, title_pt, duration_minutes, duracao_json, cover_url, tarifario_id, tarifa_guia, tarifa_translado, tem_passeio, categorias, saidas_json, experiencia_json FROM gcv_attractions
         WHERE status = 'published' AND title_pt NOT LIKE '% + %'
           AND (tarifario_id IS NOT NULL OR tarifa_guia <> '' OR experiencia_json LIKE '%\"guia\"%')
         ORDER BY title_pt ASC"
    )->fetchAll();
    $mapa = gcv_cidades_saida_mapa($pdo);
    foreach ($rows as $row) {
        if (isset($row['tem_passeio']) && (int)$row['tem_passeio'] !== 1) {
            continue;
        }
        $page = gcv_attraction_public_html_path((string)$row['slug']);
        $pares = [];
        foreach (gcv_saidas_tarifas_atrativo($row, $mapa) as $saida) {
            if ($saida['key'] === '' || ($saida['guia'] === '' && $saida['translado'] === '')) {
                continue;
            }
            $pares[$saida['key']] = ['guia' => $saida['guia'], 'translado' => $saida['translado']];
        }
        $tarifa = $pares
            ? gcv_tarifa_aplicar_bilingue(gcv_tarifa_de_pares($pares, gcv_tarifario_setting_int($pdo, 'passeio_quorum', 4)), gcv_bilingue_universal_get($pdo))
            : null;
        if (!$tarifa) {
            $tarifa = gcv_tarifa_resolver(
                $pdo,
                (string)($row['tarifa_guia'] ?? ''),
                (string)($row['tarifa_translado'] ?? ''),
                $row['tarifario_id'] !== null ? (int)$row['tarifario_id'] : null
            );
        }
        if ($page === '' || !gcv_passeio_tarifa_vende($tarifa)) {
            continue;
        }
        $minutos = (int)($row['duration_minutes'] ?? 0);
        $embarques = gcv_embarques_publicos(
            isset($row['experiencia_json']) ? (string)$row['experiencia_json'] : null,
            $row['saidas_json'] ?? null,
            $tarifa,
            $mapa
        );
        $duracao = gcv_duracao_da_ficha(
            isset($row['experiencia_json']) ? (string)$row['experiencia_json'] : null,
            $row['duracao_json'] ?? null,
            $minutos,
            $embarques
        );
        $out[] = [
            'id' => 'a-' . $row['id'],
            'kind' => 'atrativo',
            'slug' => (string)$row['slug'],
            'attraction_ids' => [(int)$row['id']],
            'title' => (string)$row['title_pt'],
            'count' => 1,
            'categories' => gcv_passeio_categorias_parse($row['categorias'] ?? null, 1),
            'duration_minutes' => (int)($row['duration_minutes'] ?? 0),
            'duracao_cidades' => $duracao,
            'tarifa' => $tarifa,
            'embarques' => $embarques,
            'saidas' => gcv_saidas_public(
                $embarques,
                $tarifa,
                $duracao,
                0,
                $mapa
            ),
            'image' => (string)($row['cover_url'] ?? ''),
            'somente_4x4' => gcv_experiencia_so4x4($row['experiencia_json'] ?? null),
            'max_participantes' => gcv_experiencia_max_participantes($row['experiencia_json'] ?? null),
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
