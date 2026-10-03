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
    gcv_passeio_max_atrativos_ensure($pdo);
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
                'Máximo de atrativos no mesmo dia (um passeio pode ter de 1 até este número)',
                'integer',
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

/** @return array{quorum:int,cidades:array<string,array<string,int>>} */
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
    return ['quorum' => $quorum, 'cidades' => $cidades];
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
    $json = json_encode(['cidades' => $norm['cidades']], JSON_UNESCAPED_UNICODE);
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
        "SELECT id, title_pt, slug, status, duration_minutes, duracao_json, tarifario_id, tem_passeio, categorias FROM gcv_attractions
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
        'tarifarios' => array_values($tarifarios),
        'atrativos' => $attractions,
        'passeios' => $passeios,
    ];
}

/** Payload do widget na página do atrativo. null = atrativo não existe. */
function gcv_tarifario_public_attraction(PDO $pdo, string $slug): ?array
{
    $stmt = $pdo->prepare("SELECT id, slug, title_pt, duration_minutes, duracao_json, tarifario_id, tem_passeio, categorias FROM gcv_attractions WHERE slug = ? AND status = 'published' LIMIT 1");
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
    return [
        'slug' => (string)$row['slug'],
        'title' => (string)$row['title_pt'],
        'duration_minutes' => (int)($row['duration_minutes'] ?? 0),
        'duracao_cidades' => gcv_duracao_cidades($row['duracao_json'] ?? null, (int)($row['duration_minutes'] ?? 0)),
        'tem_passeio' => !isset($row['tem_passeio']) || (int)$row['tem_passeio'] === 1,
        'categorias' => gcv_passeio_categorias_parse($row['categorias'] ?? null, 1),
        'tarifa' => gcv_tarifario_public_by_id($pdo, $row['tarifario_id'] !== null ? (int)$row['tarifario_id'] : null),
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
            'image' => (string)($cover->fetchColumn() ?: ''),
            'href' => $first['page'] !== '' ? '/' . ltrim($first['page'], '/') : '/passeios.html',
            'attractions' => array_map(static fn($a) => $a['title_pt'], $tour['attractions']),
        ];
    }
    $rows = $pdo->query(
        "SELECT id, slug, title_pt, duration_minutes, duracao_json, cover_url, tarifario_id, tem_passeio, categorias FROM gcv_attractions
         WHERE status = 'published' AND tarifario_id IS NOT NULL AND title_pt NOT LIKE '% + %' ORDER BY title_pt ASC"
    )->fetchAll();
    foreach ($rows as $row) {
        if (isset($row['tem_passeio']) && (int)$row['tem_passeio'] !== 1) {
            continue;
        }
        $page = gcv_attraction_public_html_path((string)$row['slug']);
        $tarifa = gcv_tarifario_public_by_id($pdo, (int)$row['tarifario_id']);
        if ($page === '' || !$tarifa) {
            continue;
        }
        $out[] = [
            'id' => 'a-' . $row['id'],
            'kind' => 'atrativo',
            'slug' => (string)$row['slug'],
            'attraction_ids' => [(int)$row['id']],
            'title' => (string)$row['title_pt'],
            'count' => 1,
            'categories' => gcv_passeio_categorias_parse($row['categorias'] ?? null, 1),
            'duration_minutes' => (int)($row['duration_minutes'] ?? 0),
            'duracao_cidades' => gcv_duracao_cidades($row['duracao_json'] ?? null, (int)($row['duration_minutes'] ?? 0)),
            'tarifa' => $tarifa,
            'image' => (string)($row['cover_url'] ?? ''),
            'href' => '/' . ltrim($page, '/'),
            'attractions' => [(string)$row['title_pt']],
        ];
    }
    return $out;
}
