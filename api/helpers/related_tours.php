<?php
declare(strict_types=1);

/**
 * Duração do atrativo e passeios relacionados (2 ou 3 atrativos, tarifa única).
 * A tarifa progressiva não se aplica a passeio publicado pelo guia.
 */

function gcv_related_tours_ensure(PDO $pdo): void
{
    try {
        $cols = $pdo->query('SHOW COLUMNS FROM gcv_attractions')->fetchAll();
    } catch (Throwable $e) {
        return;
    }
    $hasDuration = false;
    foreach ($cols as $col) {
        if (strtolower((string)($col['Field'] ?? '')) === 'duration_minutes') {
            $hasDuration = true;
            break;
        }
    }
    if (!$hasDuration) {
        try {
            $pdo->exec('ALTER TABLE gcv_attractions ADD COLUMN duration_minutes SMALLINT UNSIGNED NULL AFTER trail_distance_km');
        } catch (Throwable $e) {
            error_log('duration_minutes: ' . $e->getMessage());
        }
    }

    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS gcv_passeio_relacionado (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          signature VARCHAR(80) NOT NULL,
          duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_passeio_rel_sig (signature)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS gcv_passeio_relacionado_atrativo (
          passeio_id INT UNSIGNED NOT NULL,
          attraction_id INT UNSIGNED NOT NULL,
          sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
          PRIMARY KEY (passeio_id, attraction_id),
          INDEX idx_pra_attr (attraction_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS gcv_tarifa (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          passeio_relacionado_id INT UNSIGNED NULL,
          attraction_id INT UNSIGNED NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_tarifa_rel (passeio_relacionado_id),
          UNIQUE KEY uq_tarifa_attr (attraction_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );

    try {
        $pdo->exec('ALTER TABLE gcv_passeio_relacionado ADD COLUMN duracao_manual TINYINT(1) NOT NULL DEFAULT 0');
    } catch (Throwable $e) {
        // a coluna já existe
    }

    gcv_related_tours_seed($pdo);

    require_once __DIR__ . '/tarifarios.php';
    gcv_tarifarios_ensure($pdo);
}

function gcv_related_tours_seed(PDO $pdo): void
{
    $path = dirname(__DIR__) . '/data/related-tours-seed.json';
    if (!is_file($path)) {
        return;
    }
    $data = json_decode((string)file_get_contents($path), true);
    if (!is_array($data)) {
        return;
    }

    $bySlug = $pdo->prepare('SELECT id, duration_minutes FROM gcv_attractions WHERE slug = ? LIMIT 1');
    $setDuration = $pdo->prepare(
        'UPDATE gcv_attractions SET duration_minutes = ? WHERE id = ? AND (duration_minutes IS NULL OR duration_minutes = 0)'
    );
    foreach ($data['durations'] ?? [] as $row) {
        if (!is_array($row)) {
            continue;
        }
        $slug = trim((string)($row['slug'] ?? ''));
        $minutes = (int)($row['minutes'] ?? 0);
        if ($slug === '' || $minutes <= 0) {
            continue;
        }
        $bySlug->execute([$slug]);
        $found = $bySlug->fetch();
        if ($found) {
            $attractionId = (int)$found['id'];
            $setDuration->execute([$minutes, $attractionId]);
            $hasTarifa = $pdo->prepare('SELECT id FROM gcv_tarifa WHERE attraction_id = ? LIMIT 1');
            $hasTarifa->execute([$attractionId]);
            if (!$hasTarifa->fetch()) {
                $pdo->prepare('INSERT INTO gcv_tarifa (attraction_id) VALUES (?)')->execute([$attractionId]);
            }
        }
    }

    foreach ($data['related'] ?? [] as $row) {
        if (!is_array($row)) {
            continue;
        }
        $ids = [];
        foreach ($row['attractions'] ?? [] as $part) {
            $slug = trim((string)($part['slug'] ?? ''));
            if ($slug === '') {
                continue;
            }
            $bySlug->execute([$slug]);
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
        gcv_related_tour_save($pdo, $ids);
    }
}

/** @param list<int> $attractionIds */
function gcv_related_tour_save(PDO $pdo, array $attractionIds): array
{
    $ids = [];
    foreach ($attractionIds as $raw) {
        $id = (int)$raw;
        if ($id > 0 && !in_array($id, $ids, true)) {
            $ids[] = $id;
        }
    }
    $n = count($ids);
    require_once __DIR__ . '/tarifarios.php';
    $max = gcv_passeio_max_atrativos($pdo);
    if ($max < 2) {
        throw new InvalidArgumentException('Nas Configurações, o máximo de atrativos no mesmo dia é 1. Aumente para juntar atrativos.');
    }
    if ($n < 2 || $n > $max) {
        throw new InvalidArgumentException('Um passeio com mais de um atrativo tem de 2 a ' . $max . ' atrativos.');
    }

    $marks = implode(',', array_fill(0, $n, '?'));
    $stmt = $pdo->prepare("SELECT id, slug, title_pt, duration_minutes FROM gcv_attractions WHERE id IN ($marks)");
    $stmt->execute($ids);
    $rows = $stmt->fetchAll();
    if (count($rows) !== $n) {
        throw new InvalidArgumentException('Atrativo não encontrado.');
    }

    $sorted = $ids;
    sort($sorted);
    $signature = implode('-', $sorted);
    $minutes = 0;
    foreach ($rows as $row) {
        $minutes += (int)($row['duration_minutes'] ?? 0);
    }

    $find = $pdo->prepare('SELECT id, duracao_manual FROM gcv_passeio_relacionado WHERE signature = ? LIMIT 1');
    $find->execute([$signature]);
    $existing = $find->fetch();
    if ($existing) {
        $passeioId = (int)$existing['id'];
        if ((int)($existing['duracao_manual'] ?? 0) !== 1) {
            $pdo->prepare('UPDATE gcv_passeio_relacionado SET duration_minutes = ? WHERE id = ?')->execute([$minutes, $passeioId]);
        }
    } else {
        $pdo->prepare('INSERT INTO gcv_passeio_relacionado (signature, duration_minutes) VALUES (?, ?)')->execute([$signature, $minutes]);
        $passeioId = (int)$pdo->lastInsertId();
        $link = $pdo->prepare(
            'INSERT INTO gcv_passeio_relacionado_atrativo (passeio_id, attraction_id, sort_order) VALUES (?,?,?)'
        );
        foreach ($ids as $i => $attractionId) {
            $link->execute([$passeioId, $attractionId, $i]);
        }
    }

    $tarifa = $pdo->prepare('SELECT id FROM gcv_tarifa WHERE passeio_relacionado_id = ? LIMIT 1');
    $tarifa->execute([$passeioId]);
    if (!$tarifa->fetch()) {
        $pdo->prepare('INSERT INTO gcv_tarifa (passeio_relacionado_id) VALUES (?)')->execute([$passeioId]);
    }

    if (!function_exists('gcv_passeio_vincular_atrativos')) {
        require_once __DIR__ . '/experiencias.php';
    }
    gcv_passeio_vincular_atrativos($pdo, $passeioId);

    return gcv_related_tour_one($pdo, $passeioId);
}

function gcv_related_refresh_durations(PDO $pdo, int $attractionId): void
{
    $stmt = $pdo->prepare(
        'SELECT DISTINCT passeio_id FROM gcv_passeio_relacionado_atrativo WHERE attraction_id = ?'
    );
    $stmt->execute([$attractionId]);
    $sum = $pdo->prepare(
        'SELECT COALESCE(SUM(a.duration_minutes), 0)
         FROM gcv_passeio_relacionado_atrativo x
         INNER JOIN gcv_attractions a ON a.id = x.attraction_id
         WHERE x.passeio_id = ?'
    );
    $upd = $pdo->prepare('UPDATE gcv_passeio_relacionado SET duration_minutes = ? WHERE id = ? AND duracao_manual = 0');
    foreach ($stmt->fetchAll() as $row) {
        $passeioId = (int)$row['passeio_id'];
        $sum->execute([$passeioId]);
        $upd->execute([(int)$sum->fetchColumn(), $passeioId]);
    }
}

/** Grava a duração digitada e as duas tarifas do passeio que nasceu da relação. */
function gcv_related_tour_aplicar_ficha(PDO $pdo, int $passeioId, array $body): void
{
    if (array_key_exists('horas', $body)) {
        $raw = trim((string)$body['horas']);
        if ($raw === '') {
            $pdo->prepare('UPDATE gcv_passeio_relacionado SET duracao_manual = 0 WHERE id = ?')->execute([$passeioId]);
            $sum = $pdo->prepare(
                'SELECT COALESCE(SUM(a.duration_minutes), 0)
                 FROM gcv_passeio_relacionado_atrativo x
                 INNER JOIN gcv_attractions a ON a.id = x.attraction_id
                 WHERE x.passeio_id = ?'
            );
            $sum->execute([$passeioId]);
            $pdo->prepare('UPDATE gcv_passeio_relacionado SET duration_minutes = ? WHERE id = ?')->execute([(int)$sum->fetchColumn(), $passeioId]);
        } else {
            $horas = max(1, min(24, (int)$raw));
            $pdo->prepare('UPDATE gcv_passeio_relacionado SET duration_minutes = ?, duracao_manual = 1 WHERE id = ?')->execute([$horas * 60, $passeioId]);
        }
    }
    if (array_key_exists('tarifa_guia', $body) || array_key_exists('tarifa_translado', $body)) {
        require_once __DIR__ . '/tarifarios.php';
        gcv_tarifa_oficial_vincular($pdo, [
            'passeio_id' => $passeioId,
            'tarifa_guia' => (string)($body['tarifa_guia'] ?? ''),
            'tarifa_translado' => (string)($body['tarifa_translado'] ?? ''),
        ]);
    }
}

/** @return list<array<string,mixed>> */
function gcv_related_tours_for_attraction(PDO $pdo, int $attractionId): array
{
    $stmt = $pdo->prepare(
        'SELECT passeio_id FROM gcv_passeio_relacionado_atrativo WHERE attraction_id = ? ORDER BY passeio_id ASC'
    );
    $stmt->execute([$attractionId]);
    $out = [];
    foreach ($stmt->fetchAll() as $row) {
        $tour = gcv_related_tour_one($pdo, (int)$row['passeio_id']);
        if (!$tour || count($tour['attractions'] ?? []) < 2) {
            continue;
        }
        $out[] = $tour;
    }
    return $out;
}

/** @return array<string,mixed> */
function gcv_related_tour_one(PDO $pdo, int $passeioId): array
{
    $head = $pdo->prepare('SELECT * FROM gcv_passeio_relacionado WHERE id = ?');
    $head->execute([$passeioId]);
    $passeio = $head->fetch();
    if (!$passeio) {
        return [];
    }
    $cols = [];
    foreach ($pdo->query('SHOW COLUMNS FROM gcv_attractions')->fetchAll() as $col) {
        $cols[strtolower((string)($col['Field'] ?? ''))] = true;
    }
    $partes = ['id', 'title_pt', 'slug', 'duration_minutes', 'duracao_json', 'cover_url', 'experiencia_json', 'saidas_json', 'tarifa_guia', 'tarifa_translado', 'tarifario_id', 'categorias'];
    $select = [];
    foreach ($partes as $nome) {
        if (!empty($cols[$nome])) {
            $select[] = 'a.' . $nome;
        }
    }
    $select[] = 'x.sort_order';
    $stmt = $pdo->prepare(
        'SELECT ' . implode(', ', $select) . '
         FROM gcv_passeio_relacionado_atrativo x
         INNER JOIN gcv_attractions a ON a.id = x.attraction_id
         WHERE x.passeio_id = ?
         ORDER BY x.sort_order ASC, a.title_pt ASC'
    );
    $stmt->execute([$passeioId]);
    if (!function_exists('gcv_attraction_public_html_path')) {
        require_once __DIR__ . '/excursion_attractions.php';
    }
    require_once __DIR__ . '/tarifarios.php';
    $attractions = [];
    $catsPartes = [];
    $mapaPartes = gcv_cidades_saida_mapa($pdo);
    foreach ($stmt->fetchAll() as $row) {
        $catsPartes[] = $row['categorias'] ?? null;
        $slug = (string)$row['slug'];
        $tarifaParte = gcv_tarifa_resolver(
            $pdo,
            (string)($row['tarifa_guia'] ?? ''),
            (string)($row['tarifa_translado'] ?? ''),
            isset($row['tarifario_id']) && $row['tarifario_id'] !== null ? (int)$row['tarifario_id'] : null
        );
        $embarquesParte = gcv_embarques_publicos(
            isset($row['experiencia_json']) ? (string)$row['experiencia_json'] : null,
            $row['saidas_json'] ?? null,
            $tarifaParte,
            $mapaPartes
        );
        $attractions[] = [
            'id' => (int)$row['id'],
            'title_pt' => (string)$row['title_pt'],
            'slug' => $slug,
            'duration_minutes' => (int)($row['duration_minutes'] ?? 0),
            'cover_url' => (string)($row['cover_url'] ?? ''),
            'page' => gcv_attraction_public_html_path($slug),
            'embarques' => $embarquesParte,
            'somente_4x4' => gcv_experiencia_so4x4($row['experiencia_json'] ?? null),
            'max_participantes' => gcv_experiencia_max_participantes($row['experiencia_json'] ?? null),
            'duracao_cidades' => gcv_duracao_da_ficha(
                isset($row['experiencia_json']) ? (string)$row['experiencia_json'] : null,
                $row['duracao_json'] ?? null,
                (int)($row['duration_minutes'] ?? 0),
                $embarquesParte
            ),
        ];
    }
    $tarifa = $pdo->prepare('SELECT id FROM gcv_tarifa WHERE passeio_relacionado_id = ? LIMIT 1');
    $tarifa->execute([$passeioId]);
    $tarifaRow = $tarifa->fetch();
    $tarifarioId = isset($passeio['tarifario_id']) && $passeio['tarifario_id'] !== null ? (int)$passeio['tarifario_id'] : null;
    $tarifaGuia = (string)($passeio['tarifa_guia'] ?? '');
    $tarifaTranslado = (string)($passeio['tarifa_translado'] ?? '');
    $mapa = gcv_cidades_saida_mapa($pdo);
    $inter = gcv_embarques_intersecao(array_map(static fn($a) => $a['embarques'] ?? [], $attractions));
    $saidasTarifas = gcv_saidas_tarifas_passeio($passeio, $inter, $mapa);
    $pares = [];
    foreach ($saidasTarifas as $saida) {
        if ($saida['guia'] === '' && $saida['translado'] === '') {
            continue;
        }
        $pares[$saida['key']] = ['guia' => $saida['guia'], 'translado' => $saida['translado']];
    }
    $tarifaPublica = $pares
        ? gcv_tarifa_aplicar_bilingue(gcv_tarifa_de_pares($pares, gcv_tarifario_setting_int($pdo, 'passeio_quorum', 4)), gcv_bilingue_universal_get($pdo))
        : null;
    if (!$tarifaPublica) {
        $tarifaPublica = gcv_tarifa_relacao_plana(gcv_tarifa_resolver($pdo, $tarifaGuia, $tarifaTranslado, $tarifarioId));
    }
    $chavesDuracao = $inter ?: array_keys(GCV_TARIFARIO_CIDADES);
    $minutosGuardados = (int)($passeio['duration_minutes'] ?? 0);
    $manual = (int)($passeio['duracao_manual'] ?? 0) === 1 && $minutosGuardados > 0;
    $duracao = [];
    foreach ($chavesDuracao as $key) {
        if ($manual) {
            $duracao[$key] = $minutosGuardados;
            continue;
        }
        $soma = 0;
        foreach ($attractions as $parte) {
            $soma += (int)($parte['duracao_cidades'][$key] ?? 0);
        }
        $duracao[$key] = min($soma, 1440 * 3);
    }
    $attractions = array_map(static function ($parte) {
        unset($parte['duracao_cidades']);
        return $parte;
    }, $attractions);
    $minutos = (int)($passeio['duration_minutes'] ?? 0);
    return [
        'id' => (int)$passeio['id'],
        'duration_minutes' => $minutos,
        'tarifa_id' => $tarifaRow ? (int)$tarifaRow['id'] : null,
        'tarifario_id' => $tarifarioId,
        'tarifa_guia' => $tarifaGuia,
        'tarifa_translado' => $tarifaTranslado,
        'saidas_tarifas' => $saidasTarifas,
        'duracao_cidades' => $duracao,
        'categorias' => gcv_passeio_categorias_merge($catsPartes),
        'tarifa' => $tarifaPublica,
        'saidas' => gcv_saidas_public(
            $inter,
            $tarifaPublica,
            $duracao,
            0,
            $mapa
        ),
        'publicado' => !array_key_exists('publicado', $passeio) || (int)$passeio['publicado'] === 1,
        'somente_4x4' => (bool)array_filter($attractions, static fn($parte) => !empty($parte['somente_4x4'])),
        'max_participantes' => (function (array $partes): int {
            $nums = [];
            foreach ($partes as $parte) {
                $n = (int)($parte['max_participantes'] ?? 0);
                if ($n >= 4 && $n <= 15) {
                    $nums[] = $n;
                }
            }
            return $nums ? min($nums) : 0;
        })($attractions),
        'attractions' => $attractions,
    ];
}

function gcv_related_tour_delete(PDO $pdo, int $passeioId): void
{
    try {
        $pdo->prepare('UPDATE gcv_excursions SET passeio_id = NULL WHERE passeio_id = ?')->execute([$passeioId]);
    } catch (Throwable $e) {
        // a coluna passeio_id nasce com o modelo de experiências
    }
    try {
        $pdo->prepare('DELETE FROM gcv_passeio_experiencia WHERE passeio_id = ?')->execute([$passeioId]);
    } catch (Throwable $e) {
        // tabela ainda não criada
    }
    $pdo->prepare('DELETE FROM gcv_tarifa WHERE passeio_relacionado_id = ?')->execute([$passeioId]);
    $pdo->prepare('DELETE FROM gcv_passeio_relacionado_atrativo WHERE passeio_id = ?')->execute([$passeioId]);
    $pdo->prepare('DELETE FROM gcv_passeio_relacionado WHERE id = ?')->execute([$passeioId]);
}
