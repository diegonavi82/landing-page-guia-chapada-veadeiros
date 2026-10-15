<?php
declare(strict_types=1);

/**
 * Experiência é a unidade do catálogo: atrativo (trilha) ou terapia (por hora).
 * Passeio junta de 1 a 3 experiências. No site só entra passeio feito só de atrativo.
 * Excursão continua a saída compartilhada e aponta para o passeio (passeio_id).
 */

require_once __DIR__ . '/related_tours.php';
require_once __DIR__ . '/tarifarios.php';

const GCV_PASSEIO_MAX_EXPERIENCIAS = 3;

function gcv_experiencias_ensure(PDO $pdo): array
{
    static $done = false;
    static $running = false;
    static $stats = [];
    if ($done) {
        return $stats;
    }
    if ($running) {
        return [];
    }
    $running = true;
    try {
        gcv_experiencias_schema($pdo);
        $stats = gcv_experiencias_backfill($pdo);
        $done = true;
        return $stats;
    } finally {
        $running = false;
    }
}

function gcv_experiencias_schema(PDO $pdo): void
{
    static $done = false;
    static $running = false;
    if ($done || $running) {
        return;
    }
    $running = true;
    try {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS gcv_experiencias (
              id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              tipo ENUM('atrativo','terapia') NOT NULL,
              attraction_id INT UNSIGNED NULL,
              nome VARCHAR(160) NOT NULL,
              slug VARCHAR(180) NOT NULL,
              status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
              descricao TEXT NULL,
              preco_hora_cents INT UNSIGNED NULL,
              duracao_padrao_min SMALLINT UNSIGNED NULL,
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              UNIQUE KEY uq_exp_attraction (attraction_id),
              UNIQUE KEY uq_exp_slug (slug),
              INDEX idx_exp_tipo (tipo, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS gcv_passeio_experiencia (
              passeio_id INT UNSIGNED NOT NULL,
              experiencia_id INT UNSIGNED NOT NULL,
              sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
              PRIMARY KEY (passeio_id, experiencia_id),
              INDEX idx_pex_exp (experiencia_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        if (function_exists('gcv_related_tours_ensure')) {
            gcv_related_tours_ensure($pdo);
        }
        if (function_exists('gcv_tarifario_column_exists')
            && gcv_tabela_existe($pdo, 'gcv_passeio_relacionado')
            && !gcv_tarifario_column_exists($pdo, 'gcv_passeio_relacionado', 'publicado')) {
            $pdo->exec('ALTER TABLE gcv_passeio_relacionado ADD COLUMN publicado TINYINT(1) NOT NULL DEFAULT 1');
        }
        if (function_exists('gcv_tarifario_column_exists')
            && gcv_tabela_existe($pdo, 'gcv_excursions')
            && !gcv_tarifario_column_exists($pdo, 'gcv_excursions', 'passeio_id')) {
            $pdo->exec('ALTER TABLE gcv_excursions ADD COLUMN passeio_id INT UNSIGNED NULL, ADD INDEX idx_exc_passeio (passeio_id)');
        }
        $done = true;
    } finally {
        $running = false;
    }
}

function gcv_tabela_existe(PDO $pdo, string $table): bool
{
    if (!preg_match('/^[a-z0-9_]+$/', $table)) {
        return false;
    }
    try {
        return (bool)$pdo->query("SHOW TABLES LIKE " . $pdo->quote($table))->fetchColumn();
    } catch (Throwable $e) {
        return false;
    }
}

/** @return array{experiencias_novas:int,passeios_novos:int,excursoes_ligadas:int,experiencias_total:int,passeios_total:int,terapias_total:int} */
function gcv_experiencias_backfill(PDO $pdo): array
{
    $expAntes = (int)$pdo->query('SELECT COUNT(*) FROM gcv_experiencias')->fetchColumn();
    $pasAntes = (int)$pdo->query('SELECT COUNT(*) FROM gcv_passeio_relacionado')->fetchColumn();
    $ligadasAntes = 0;
    $temPasseioId = function_exists('gcv_tarifario_column_exists')
        && gcv_tabela_existe($pdo, 'gcv_excursions')
        && gcv_tarifario_column_exists($pdo, 'gcv_excursions', 'passeio_id');
    if ($temPasseioId) {
        $ligadasAntes = (int)$pdo->query('SELECT COUNT(*) FROM gcv_excursions WHERE passeio_id IS NOT NULL')->fetchColumn();
    }

    $rows = $pdo->query(
        "SELECT id FROM gcv_attractions WHERE title_pt NOT LIKE '% + %' ORDER BY id ASC"
    )->fetchAll();
    foreach ($rows as $row) {
        try {
            gcv_experiencia_sync_atrativo($pdo, (int)$row['id']);
        } catch (Throwable $e) {
            error_log('backfill experiencia ' . (int)$row['id'] . ': ' . $e->getMessage());
        }
    }

    $passeios = $pdo->query('SELECT id FROM gcv_passeio_relacionado')->fetchAll();
    foreach ($passeios as $row) {
        try {
            gcv_passeio_vincular_atrativos($pdo, (int)$row['id']);
        } catch (Throwable $e) {
            error_log('backfill vinculo ' . (int)$row['id'] . ': ' . $e->getMessage());
        }
    }

    if ($temPasseioId) {
        $abertas = $pdo->query('SELECT id FROM gcv_excursions WHERE passeio_id IS NULL')->fetchAll();
        foreach ($abertas as $row) {
            try {
                gcv_excursion_bind_passeio($pdo, (int)$row['id']);
            } catch (Throwable $e) {
                error_log('backfill excursao ' . (int)$row['id'] . ': ' . $e->getMessage());
            }
        }
    }

    $ligadasDepois = $temPasseioId
        ? (int)$pdo->query('SELECT COUNT(*) FROM gcv_excursions WHERE passeio_id IS NOT NULL')->fetchColumn()
        : 0;

    return [
        'experiencias_novas' => max(0, (int)$pdo->query('SELECT COUNT(*) FROM gcv_experiencias')->fetchColumn() - $expAntes),
        'passeios_novos' => max(0, (int)$pdo->query('SELECT COUNT(*) FROM gcv_passeio_relacionado')->fetchColumn() - $pasAntes),
        'excursoes_ligadas' => max(0, $ligadasDepois - $ligadasAntes),
        'experiencias_total' => (int)$pdo->query("SELECT COUNT(*) FROM gcv_experiencias WHERE tipo = 'atrativo'")->fetchColumn(),
        'passeios_total' => (int)$pdo->query('SELECT COUNT(*) FROM gcv_passeio_relacionado')->fetchColumn(),
        'terapias_total' => (int)$pdo->query("SELECT COUNT(*) FROM gcv_experiencias WHERE tipo = 'terapia'")->fetchColumn(),
    ];
}

function gcv_experiencia_apos_atrativo(PDO $pdo, int $attractionId): void
{
    if ($attractionId <= 0) {
        return;
    }
    try {
        gcv_experiencia_sync_atrativo($pdo, $attractionId);
    } catch (Throwable $e) {
        error_log('sync experiencia: ' . $e->getMessage());
    }
}

function gcv_experiencia_sync_atrativo(PDO $pdo, int $attractionId): int
{
    static $emCurso = [];
    if (array_key_exists($attractionId, $emCurso)) {
        return (int)$emCurso[$attractionId];
    }
    $emCurso[$attractionId] = 0;
    try {
        return gcv_experiencia_sync_atrativo_grava($pdo, $attractionId, $emCurso);
    } finally {
        unset($emCurso[$attractionId]);
    }
}

/** @param array<int,int> $emCurso */
function gcv_experiencia_sync_atrativo_grava(PDO $pdo, int $attractionId, array &$emCurso): int
{
    gcv_experiencias_schema($pdo);
    $stmt = $pdo->prepare('SELECT * FROM gcv_attractions WHERE id = ? LIMIT 1');
    $stmt->execute([$attractionId]);
    $a = $stmt->fetch();
    if (!$a || str_contains((string)($a['title_pt'] ?? ''), ' + ')) {
        return 0;
    }
    $nome = trim((string)($a['title_pt'] ?? ''));
    if ($nome === '') {
        return 0;
    }
    if (mb_strlen($nome) > 160) {
        $nome = mb_substr($nome, 0, 160);
    }
    $status = (string)($a['status'] ?? 'draft');
    if (!in_array($status, ['draft', 'published', 'archived'], true)) {
        $status = 'draft';
    }
    $descricao = trim((string)($a['excerpt_pt'] ?? ''));
    if ($descricao === '') {
        $descricao = null;
    } elseif (mb_strlen($descricao) > 4000) {
        $descricao = mb_substr($descricao, 0, 4000);
    }
    $minutos = isset($a['duration_minutes']) && $a['duration_minutes'] !== null && $a['duration_minutes'] !== ''
        ? max(0, (int)$a['duration_minutes'])
        : null;
    $find = $pdo->prepare("SELECT id FROM gcv_experiencias WHERE attraction_id = ? AND tipo = 'atrativo' LIMIT 1");
    $find->execute([$attractionId]);
    $existing = $find->fetchColumn();
    $base = trim((string)($a['slug'] ?? ''));
    if ($base === '') {
        $base = $nome;
    }
    $slug = gcv_experiencia_slug_livre($pdo, $base, $existing ? (int)$existing : null);
    if ($existing) {
        $pdo->prepare(
            'UPDATE gcv_experiencias SET nome = ?, slug = ?, status = ?, descricao = ?, duracao_padrao_min = ? WHERE id = ?'
        )->execute([$nome, $slug, $status, $descricao, $minutos, (int)$existing]);
        $expId = (int)$existing;
    } else {
        $pdo->prepare(
            "INSERT INTO gcv_experiencias (tipo, attraction_id, nome, slug, status, descricao, duracao_padrao_min)
             VALUES ('atrativo', ?, ?, ?, ?, ?, ?)"
        )->execute([$attractionId, $nome, $slug, $status, $descricao, $minutos]);
        $expId = (int)$pdo->lastInsertId();
    }
    $emCurso[$attractionId] = $expId;
    gcv_passeio_garantir_solo($pdo, $a, $expId);
    return $expId;
}

/** @param array<string,mixed> $a */
function gcv_passeio_garantir_solo(PDO $pdo, array $a, int $experienciaId): int
{
    $attractionId = (int)($a['id'] ?? 0);
    if ($attractionId <= 0 || $experienciaId <= 0) {
        return 0;
    }
    $signature = (string)$attractionId;
    if (!function_exists('gcv_tarifa_resolver') || !function_exists('gcv_passeio_tarifa_vende')) {
        require_once __DIR__ . '/tarifarios.php';
    }
    $vende = false;
    if (function_exists('gcv_tarifa_resolver') && function_exists('gcv_passeio_tarifa_vende')) {
        $tid = isset($a['tarifario_id']) && $a['tarifario_id'] !== null && $a['tarifario_id'] !== '' ? (int)$a['tarifario_id'] : null;
        $vende = gcv_passeio_tarifa_vende(gcv_tarifa_resolver(
            $pdo,
            (string)($a['tarifa_guia'] ?? ''),
            (string)($a['tarifa_translado'] ?? ''),
            $tid
        ));
    }
    $publicado = ((string)($a['status'] ?? '') === 'published' && (int)($a['tem_passeio'] ?? 1) === 1 && $vende) ? 1 : 0;
    $minutos = max(0, (int)($a['duration_minutes'] ?? 0));
    $find = $pdo->prepare('SELECT id FROM gcv_passeio_relacionado WHERE signature = ? LIMIT 1');
    $find->execute([$signature]);
    $passeioId = (int)($find->fetchColumn() ?: 0);
    $campos = [
        'duration_minutes' => $minutos,
        'publicado' => $publicado,
        'tarifario_id' => isset($a['tarifario_id']) && $a['tarifario_id'] !== null && $a['tarifario_id'] !== '' ? (int)$a['tarifario_id'] : null,
        'tarifa_guia' => ($a['tarifa_guia'] ?? '') !== '' ? $a['tarifa_guia'] : null,
        'tarifa_translado' => ($a['tarifa_translado'] ?? '') !== '' ? $a['tarifa_translado'] : null,
        'categorias' => $a['categorias'] ?? null,
        'saidas_json' => $a['saidas_json'] ?? null,
        'duracao_json' => $a['duracao_json'] ?? null,
    ];
    if ($passeioId > 0) {
        gcv_passeio_atualizar_campos($pdo, $passeioId, $campos);
    } else {
        $campos = ['signature' => $signature] + $campos;
        $passeioId = gcv_passeio_inserir($pdo, $campos);
    }
    if ($passeioId <= 0) {
        return 0;
    }
    $pdo->prepare(
        'INSERT IGNORE INTO gcv_passeio_relacionado_atrativo (passeio_id, attraction_id, sort_order) VALUES (?,?,0)'
    )->execute([$passeioId, $attractionId]);
    $pdo->prepare(
        'INSERT IGNORE INTO gcv_passeio_experiencia (passeio_id, experiencia_id, sort_order) VALUES (?,?,0)'
    )->execute([$passeioId, $experienciaId]);
    gcv_passeio_garantir_tarifa_linha($pdo, $passeioId);
    return $passeioId;
}

/** @param array<string,mixed> $campos */
function gcv_passeio_inserir(PDO $pdo, array $campos): int
{
    $cols = [];
    $vals = [];
    foreach ($campos as $col => $val) {
        if ($col !== 'signature' && !gcv_tarifario_column_exists($pdo, 'gcv_passeio_relacionado', $col)) {
            continue;
        }
        $cols[] = $col;
        $vals[] = $val;
    }
    if (!$cols) {
        return 0;
    }
    $marks = implode(',', array_fill(0, count($cols), '?'));
    $pdo->prepare(
        'INSERT INTO gcv_passeio_relacionado (' . implode(',', $cols) . ') VALUES (' . $marks . ')'
    )->execute($vals);
    return (int)$pdo->lastInsertId();
}

/** @param array<string,mixed> $campos */
function gcv_passeio_atualizar_campos(PDO $pdo, int $passeioId, array $campos): void
{
    $sets = [];
    $vals = [];
    foreach ($campos as $col => $val) {
        if (!gcv_tarifario_column_exists($pdo, 'gcv_passeio_relacionado', $col)) {
            continue;
        }
        $sets[] = $col . ' = ?';
        $vals[] = $val;
    }
    if (!$sets) {
        return;
    }
    $vals[] = $passeioId;
    $pdo->prepare('UPDATE gcv_passeio_relacionado SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
}

function gcv_passeio_garantir_tarifa_linha(PDO $pdo, int $passeioId): void
{
    if (!gcv_tabela_existe($pdo, 'gcv_tarifa')) {
        return;
    }
    $stmt = $pdo->prepare('SELECT id FROM gcv_tarifa WHERE passeio_relacionado_id = ? LIMIT 1');
    $stmt->execute([$passeioId]);
    if (!$stmt->fetch()) {
        $pdo->prepare('INSERT INTO gcv_tarifa (passeio_relacionado_id) VALUES (?)')->execute([$passeioId]);
    }
}

function gcv_passeio_vincular_atrativos(PDO $pdo, int $passeioId): void
{
    gcv_experiencias_schema($pdo);
    if (!gcv_tabela_existe($pdo, 'gcv_passeio_experiencia')) {
        return;
    }
    $stmt = $pdo->prepare(
        'SELECT attraction_id, sort_order FROM gcv_passeio_relacionado_atrativo WHERE passeio_id = ? ORDER BY sort_order ASC, attraction_id ASC'
    );
    $stmt->execute([$passeioId]);
    $link = $pdo->prepare(
        'INSERT IGNORE INTO gcv_passeio_experiencia (passeio_id, experiencia_id, sort_order) VALUES (?,?,?)'
    );
    foreach ($stmt->fetchAll() as $row) {
        $expId = gcv_experiencia_sync_atrativo($pdo, (int)$row['attraction_id']);
        if ($expId <= 0) {
            continue;
        }
        $link->execute([$passeioId, $expId, (int)$row['sort_order']]);
    }
}

/** Liga a excursão ao passeio do mesmo conjunto de atrativos. Cria o passeio se ainda não existir. */
function gcv_excursion_bind_passeio(PDO $pdo, int $excursionId): int
{
    gcv_experiencias_schema($pdo);
    if (!gcv_tarifario_column_exists($pdo, 'gcv_excursions', 'passeio_id')) {
        return 0;
    }
    $stmt = $pdo->prepare(
        'SELECT attraction_id FROM gcv_excursion_attractions WHERE excursion_id = ? ORDER BY sort_order ASC, attraction_id ASC'
    );
    $stmt->execute([$excursionId]);
    $ids = [];
    foreach ($stmt->fetchAll() as $row) {
        $id = (int)$row['attraction_id'];
        if ($id > 0 && !in_array($id, $ids, true)) {
            $ids[] = $id;
        }
    }
    if (!$ids) {
        $one = $pdo->prepare('SELECT attraction_id FROM gcv_excursions WHERE id = ? LIMIT 1');
        $one->execute([$excursionId]);
        $aid = (int)$one->fetchColumn();
        if ($aid > 0) {
            $ids[] = $aid;
        }
    }
    if (!$ids) {
        return 0;
    }
    $passeioId = gcv_passeio_garantir_conjunto($pdo, $ids);
    if ($passeioId <= 0) {
        return 0;
    }
    $pdo->prepare('UPDATE gcv_excursions SET passeio_id = ? WHERE id = ?')->execute([$passeioId, $excursionId]);
    return $passeioId;
}

/** @param list<int> $attractionIds */
function gcv_passeio_garantir_conjunto(PDO $pdo, array $attractionIds): int
{
    $ids = [];
    foreach ($attractionIds as $raw) {
        $id = (int)$raw;
        if ($id > 0 && !in_array($id, $ids, true)) {
            $ids[] = $id;
        }
    }
    if (!$ids) {
        return 0;
    }
    if (count($ids) === 1) {
        $stmt = $pdo->prepare('SELECT * FROM gcv_attractions WHERE id = ? LIMIT 1');
        $stmt->execute([$ids[0]]);
        $a = $stmt->fetch();
        if (!$a) {
            return 0;
        }
        $expId = gcv_experiencia_sync_atrativo($pdo, $ids[0]);
        if ($expId <= 0) {
            return 0;
        }
        return gcv_passeio_garantir_solo($pdo, $a, $expId);
    }
    $sorted = $ids;
    sort($sorted);
    $signature = implode('-', $sorted);
    if (gcv_related_tour_foi_apagado($pdo, $signature)) {
        return 0;
    }
    $find = $pdo->prepare('SELECT id FROM gcv_passeio_relacionado WHERE signature = ? LIMIT 1');
    $find->execute([$signature]);
    $passeioId = (int)($find->fetchColumn() ?: 0);
    if ($passeioId > 0) {
        gcv_passeio_vincular_atrativos($pdo, $passeioId);
        return $passeioId;
    }
    $minutos = 0;
    $marks = implode(',', array_fill(0, count($ids), '?'));
    $sum = $pdo->prepare("SELECT COALESCE(SUM(duration_minutes), 0) FROM gcv_attractions WHERE id IN ($marks)");
    $sum->execute($ids);
    $minutos = (int)$sum->fetchColumn();
    $passeioId = gcv_passeio_inserir($pdo, [
        'signature' => $signature,
        'duration_minutes' => $minutos,
        'publicado' => 0,
    ]);
    if ($passeioId <= 0) {
        return 0;
    }
    $link = $pdo->prepare(
        'INSERT IGNORE INTO gcv_passeio_relacionado_atrativo (passeio_id, attraction_id, sort_order) VALUES (?,?,?)'
    );
    foreach ($ids as $i => $attractionId) {
        $link->execute([$passeioId, $attractionId, $i]);
    }
    gcv_passeio_vincular_atrativos($pdo, $passeioId);
    gcv_passeio_garantir_tarifa_linha($pdo, $passeioId);
    return $passeioId;
}

/** Passeio de 2+ experiências no site: publicado, com preço, e cada experiência ativada e com tarifa. */
function gcv_passeio_liberado_no_site(PDO $pdo, int $passeioId): bool
{
    if ($passeioId <= 0) {
        return false;
    }
    if (gcv_tabela_existe($pdo, 'gcv_experiencias')) {
        if (gcv_tarifario_column_exists($pdo, 'gcv_passeio_relacionado', 'publicado')) {
            $pub = $pdo->prepare('SELECT publicado FROM gcv_passeio_relacionado WHERE id = ? LIMIT 1');
            $pub->execute([$passeioId]);
            $flag = $pub->fetchColumn();
            if ($flag !== false && (int)$flag !== 1) {
                return false;
            }
        }
        if (gcv_tabela_existe($pdo, 'gcv_passeio_experiencia')) {
            $stmt = $pdo->prepare(
                'SELECT e.tipo FROM gcv_passeio_experiencia pe
                 INNER JOIN gcv_experiencias e ON e.id = pe.experiencia_id
                 WHERE pe.passeio_id = ?'
            );
            $stmt->execute([$passeioId]);
            $tipos = $stmt->fetchAll();
            if ($tipos) {
                if (count($tipos) > GCV_PASSEIO_MAX_EXPERIENCIAS) {
                    return false;
                }
                foreach ($tipos as $row) {
                    if ((string)$row['tipo'] !== 'atrativo') {
                        return false;
                    }
                }
            }
        }
    }
    if (!function_exists('gcv_passeio_tem_preco_publico')) {
        require_once __DIR__ . '/tarifarios.php';
    }
    if (!gcv_passeio_experiencias_vendem($pdo, $passeioId)) {
        return false;
    }
    return gcv_passeio_tem_preco_publico($pdo, $passeioId);
}

function gcv_experiencia_slugify(string $text): string
{
    $text = mb_strtolower(trim($text));
    $text = strtr($text, [
        'á' => 'a', 'à' => 'a', 'ã' => 'a', 'â' => 'a', 'ä' => 'a',
        'é' => 'e', 'ê' => 'e', 'ë' => 'e',
        'í' => 'i', 'ï' => 'i',
        'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
        'ú' => 'u', 'ü' => 'u',
        'ç' => 'c',
    ]);
    $text = preg_replace('/[^a-z0-9]+/', '-', $text) ?? '';
    $text = trim($text, '-');
    if (strlen($text) > 160) {
        $text = trim(substr($text, 0, 160), '-');
    }
    return $text;
}

function gcv_experiencia_slug_livre(PDO $pdo, string $base, ?int $excetoId): string
{
    $slug = gcv_experiencia_slugify($base);
    if ($slug === '') {
        $slug = 'experiencia';
    }
    $candidato = $slug;
    $n = 2;
    while ($n < 40) {
        if ($excetoId) {
            $stmt = $pdo->prepare('SELECT id FROM gcv_experiencias WHERE slug = ? AND id <> ? LIMIT 1');
            $stmt->execute([$candidato, $excetoId]);
        } else {
            $stmt = $pdo->prepare('SELECT id FROM gcv_experiencias WHERE slug = ? LIMIT 1');
            $stmt->execute([$candidato]);
        }
        if (!$stmt->fetch()) {
            return $candidato;
        }
        $candidato = $slug . '-' . $n;
        $n++;
    }
    return $slug . '-' . $n;
}

/** @return list<array<string,mixed>> */
function gcv_terapia_list(PDO $pdo): array
{
    gcv_experiencias_ensure($pdo);
    $rows = $pdo->query(
        "SELECT id, nome, slug, status, descricao, preco_hora_cents, duracao_padrao_min, updated_at
         FROM gcv_experiencias
         WHERE tipo = 'terapia'
         ORDER BY FIELD(status, 'published', 'draft', 'archived'), nome ASC"
    )->fetchAll();
    $out = [];
    foreach ($rows as $row) {
        $out[] = gcv_terapia_publicar_linha($row);
    }
    return $out;
}

/** @param array<string,mixed> $row */
function gcv_terapia_publicar_linha(array $row): array
{
    return [
        'id' => (int)$row['id'],
        'nome' => (string)$row['nome'],
        'slug' => (string)$row['slug'],
        'status' => (string)$row['status'],
        'descricao' => (string)($row['descricao'] ?? ''),
        'preco_hora_cents' => (int)($row['preco_hora_cents'] ?? 0),
        'duracao_padrao_min' => isset($row['duracao_padrao_min']) && $row['duracao_padrao_min'] !== null
            ? (int)$row['duracao_padrao_min']
            : null,
        'updated_at' => (string)($row['updated_at'] ?? ''),
    ];
}

/** @param array<string,mixed> $body */
function gcv_terapia_save(PDO $pdo, ?int $id, array $body): array
{
    gcv_experiencias_ensure($pdo);
    $nome = trim((string)($body['nome'] ?? ''));
    if ($nome === '') {
        throw new InvalidArgumentException('Dê um nome à terapia.');
    }
    if (mb_strlen($nome) > 160) {
        $nome = mb_substr($nome, 0, 160);
    }
    $descricao = trim((string)($body['descricao'] ?? ''));
    if (mb_strlen($descricao) > 4000) {
        throw new InvalidArgumentException('A descrição passa de 4000 caracteres.');
    }
    $preco = gcv_terapia_reais_para_cents($body['preco_hora_reais'] ?? $body['preco_hora_cents'] ?? null, array_key_exists('preco_hora_cents', $body) && !array_key_exists('preco_hora_reais', $body));
    if ($preco <= 0) {
        throw new InvalidArgumentException('Informe o preço por hora.');
    }
    $duracao = null;
    if (array_key_exists('duracao_padrao_min', $body) && $body['duracao_padrao_min'] !== '' && $body['duracao_padrao_min'] !== null) {
        $duracao = (int)$body['duracao_padrao_min'];
        if ($duracao < 15 || $duracao > 720) {
            throw new InvalidArgumentException('A duração padrão fica entre 15 e 720 minutos.');
        }
    }
    $status = (string)($body['status'] ?? 'draft');
    if (!in_array($status, ['draft', 'published', 'archived'], true)) {
        throw new InvalidArgumentException('Situação inválida.');
    }
    $exceto = null;
    if ($id) {
        $atual = $pdo->prepare("SELECT id FROM gcv_experiencias WHERE id = ? AND tipo = 'terapia' LIMIT 1");
        $atual->execute([$id]);
        if (!$atual->fetch()) {
            throw new InvalidArgumentException('Terapia não encontrada.');
        }
        $exceto = $id;
    }
    $slug = gcv_experiencia_slug_livre($pdo, $nome, $exceto);
    if ($id) {
        $pdo->prepare(
            "UPDATE gcv_experiencias
             SET nome = ?, slug = ?, status = ?, descricao = ?, preco_hora_cents = ?, duracao_padrao_min = ?
             WHERE id = ? AND tipo = 'terapia'"
        )->execute([$nome, $slug, $status, $descricao !== '' ? $descricao : null, $preco, $duracao, $id]);
    } else {
        $pdo->prepare(
            "INSERT INTO gcv_experiencias (tipo, attraction_id, nome, slug, status, descricao, preco_hora_cents, duracao_padrao_min)
             VALUES ('terapia', NULL, ?, ?, ?, ?, ?, ?)"
        )->execute([$nome, $slug, $status, $descricao !== '' ? $descricao : null, $preco, $duracao]);
        $id = (int)$pdo->lastInsertId();
    }
    $stmt = $pdo->prepare('SELECT * FROM gcv_experiencias WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        throw new RuntimeException('Não foi possível ler a terapia salva.');
    }
    return gcv_terapia_publicar_linha($row);
}

function gcv_terapia_reais_para_cents($raw, bool $jaEmCents): int
{
    if ($jaEmCents) {
        return max(0, (int)$raw);
    }
    if (is_int($raw) || is_float($raw)) {
        return max(0, (int)round(((float)$raw) * 100));
    }
    $s = trim((string)$raw);
    $s = str_replace(['R$', ' '], '', $s);
    if (str_contains($s, ',') && str_contains($s, '.')) {
        $s = str_replace('.', '', $s);
        $s = str_replace(',', '.', $s);
    } else {
        $s = str_replace(',', '.', $s);
    }
    if ($s === '' || !is_numeric($s)) {
        return 0;
    }
    return max(0, (int)round(((float)$s) * 100));
}
