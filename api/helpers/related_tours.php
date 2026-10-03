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
    foreach ($rows as $row) {
        if (!function_exists('gcv_attraction_public_html_path')) {
            require_once __DIR__ . '/excursion_attractions.php';
        }
        if (gcv_attraction_public_html_path((string)$row['slug']) === '') {
            throw new InvalidArgumentException('Só entra atrativo que tem página: ' . (string)$row['title_pt']);
        }
    }

    $sorted = $ids;
    sort($sorted);
    $signature = implode('-', $sorted);
    $minutes = 0;
    foreach ($rows as $row) {
        $minutes += (int)($row['duration_minutes'] ?? 0);
    }

    $find = $pdo->prepare('SELECT id FROM gcv_passeio_relacionado WHERE signature = ? LIMIT 1');
    $find->execute([$signature]);
    $existing = $find->fetch();
    if ($existing) {
        $passeioId = (int)$existing['id'];
        $pdo->prepare('UPDATE gcv_passeio_relacionado SET duration_minutes = ? WHERE id = ?')->execute([$minutes, $passeioId]);
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
    $upd = $pdo->prepare('UPDATE gcv_passeio_relacionado SET duration_minutes = ? WHERE id = ?');
    foreach ($stmt->fetchAll() as $row) {
        $passeioId = (int)$row['passeio_id'];
        $sum->execute([$passeioId]);
        $upd->execute([(int)$sum->fetchColumn(), $passeioId]);
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
        $out[] = gcv_related_tour_one($pdo, (int)$row['passeio_id']);
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
    $stmt = $pdo->prepare(
        'SELECT a.id, a.title_pt, a.slug, a.duration_minutes, x.sort_order
         FROM gcv_passeio_relacionado_atrativo x
         INNER JOIN gcv_attractions a ON a.id = x.attraction_id
         WHERE x.passeio_id = ?
         ORDER BY x.sort_order ASC, a.title_pt ASC'
    );
    $stmt->execute([$passeioId]);
    if (!function_exists('gcv_attraction_public_html_path')) {
        require_once __DIR__ . '/excursion_attractions.php';
    }
    $attractions = [];
    foreach ($stmt->fetchAll() as $row) {
        $slug = (string)$row['slug'];
        $attractions[] = [
            'id' => (int)$row['id'],
            'title_pt' => (string)$row['title_pt'],
            'slug' => $slug,
            'duration_minutes' => (int)($row['duration_minutes'] ?? 0),
            'page' => gcv_attraction_public_html_path($slug),
        ];
    }
    $tarifa = $pdo->prepare('SELECT id FROM gcv_tarifa WHERE passeio_relacionado_id = ? LIMIT 1');
    $tarifa->execute([$passeioId]);
    $tarifaRow = $tarifa->fetch();
    require_once __DIR__ . '/tarifarios.php';
    $tarifarioId = isset($passeio['tarifario_id']) && $passeio['tarifario_id'] !== null ? (int)$passeio['tarifario_id'] : null;
    return [
        'id' => (int)$passeio['id'],
        'duration_minutes' => (int)$passeio['duration_minutes'],
        'tarifa_id' => $tarifaRow ? (int)$tarifaRow['id'] : null,
        'tarifario_id' => $tarifarioId,
        'duracao_cidades' => gcv_duracao_cidades($passeio['duracao_json'] ?? null, (int)$passeio['duration_minutes']),
        'categorias' => gcv_passeio_categorias_parse($passeio['categorias'] ?? null, count($attractions)),
        'tarifa' => gcv_tarifario_public_by_id($pdo, $tarifarioId),
        'attractions' => $attractions,
    ];
}

function gcv_related_tour_delete(PDO $pdo, int $passeioId): void
{
    $pdo->prepare('DELETE FROM gcv_tarifa WHERE passeio_relacionado_id = ?')->execute([$passeioId]);
    $pdo->prepare('DELETE FROM gcv_passeio_relacionado_atrativo WHERE passeio_id = ?')->execute([$passeioId]);
    $pdo->prepare('DELETE FROM gcv_passeio_relacionado WHERE id = ?')->execute([$passeioId]);
}
