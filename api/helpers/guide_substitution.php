<?php
declare(strict_types=1);

/**
 * Um guia passa a própria saída para outro guia.
 * O outro precisa aceitar. Quem aceita vai para o fim da fila.
 */

function gcv_substitution_ensure_schema(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    try {
        db()->exec(
            "CREATE TABLE IF NOT EXISTS gcv_guide_queue (
              user_id INT UNSIGNED NOT NULL PRIMARY KEY,
              posicao INT UNSIGNED NOT NULL DEFAULT 1,
              updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        db()->exec(
            "CREATE TABLE IF NOT EXISTS gcv_guide_substitutions (
              id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              excursion_id INT UNSIGNED NOT NULL,
              from_user_id INT UNSIGNED NOT NULL,
              to_user_id INT UNSIGNED NOT NULL,
              status VARCHAR(16) NOT NULL DEFAULT 'pending',
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              decided_at DATETIME NULL,
              INDEX idx_sub_exc (excursion_id, status),
              INDEX idx_sub_to (to_user_id, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        error_log('gcv_substitution_ensure_schema: ' . $e->getMessage());
    }
}

function gcv_substitution_seed_queue(): void
{
    gcv_substitution_ensure_schema();
    try {
        $have = db()->query('SELECT user_id FROM gcv_guide_queue')->fetchAll(PDO::FETCH_COLUMN) ?: [];
        $known = array_map('intval', $have);
        $st = db()->query("SELECT id FROM gcv_users WHERE role = 'guide' AND status = 'active' ORDER BY id ASC");
        $ids = array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN) ?: []);
        $max = (int)db()->query('SELECT COALESCE(MAX(posicao), 0) FROM gcv_guide_queue')->fetchColumn();
        $ins = db()->prepare('INSERT INTO gcv_guide_queue (user_id, posicao) VALUES (?, ?)');
        foreach ($ids as $id) {
            if ($id <= 0 || in_array($id, $known, true)) {
                continue;
            }
            $max++;
            $ins->execute([$id, $max]);
        }
    } catch (Throwable $e) {
        error_log('gcv_substitution_seed_queue: ' . $e->getMessage());
    }
}

/** @return list<array{id:int,nome:string,foto:string,cidade:string,posicao:int}> */
function gcv_substitution_queue(): array
{
    gcv_substitution_seed_queue();
    try {
        $kalungaSql = gcv_guides_tem_coluna_kalunga() ? 'COALESCE(g.is_kalunga, 0)' : '0';
        $st = db()->query(
            "SELECT u.id, u.name,
                    COALESCE(NULLIF(g.full_name, ''), NULLIF(g.nickname, ''), u.name) AS nome,
                    COALESCE(g.photo_url, g.photo_3x4_url, '') AS foto,
                    COALESCE(c.name, '') AS cidade,
                    {$kalungaSql} AS is_kalunga,
                    q.posicao
             FROM gcv_guide_queue q
             INNER JOIN gcv_users u ON u.id = q.user_id AND u.role = 'guide' AND u.status = 'active'
             LEFT JOIN gcv_guides g ON g.user_id = u.id
             LEFT JOIN gcv_cities c ON c.id = g.base_city_id
             ORDER BY q.posicao ASC, u.id ASC"
        );
        $out = [];
        $n = 0;
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
            $n++;
            $out[] = [
                'id' => (int)$row['id'],
                'nome' => (string)$row['nome'],
                'foto' => (string)$row['foto'],
                'cidade' => (string)$row['cidade'],
                'kalunga' => (int)($row['is_kalunga'] ?? 0) === 1,
                'posicao' => $n,
            ];
        }
        return $out;
    } catch (Throwable $e) {
        error_log('gcv_substitution_queue: ' . $e->getMessage());
        return [];
    }
}

function gcv_substitution_move_to_end(int $userId): int
{
    gcv_substitution_seed_queue();
    $max = (int)db()->query('SELECT COALESCE(MAX(posicao), 0) FROM gcv_guide_queue')->fetchColumn();
    db()->prepare('UPDATE gcv_guide_queue SET posicao = ? WHERE user_id = ?')->execute([$max + 1, $userId]);
    $fila = gcv_substitution_queue();
    foreach ($fila as $g) {
        if ((int)$g['id'] === $userId) {
            return (int)$g['posicao'];
        }
    }
    return count($fila);
}

function gcv_substitution_load_excursion(int $id): ?array
{
    if ($id <= 0) {
        return null;
    }
    $st = db()->prepare(
        'SELECT e.*, a.title_pt AS attraction_title
         FROM gcv_excursions e
         LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
         WHERE e.id = ? AND e.deleted_at IS NULL
         LIMIT 1'
    );
    $st->execute([$id]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function gcv_substitution_busy(int $guideId, array $tour): bool
{
    $st = db()->prepare(
        "SELECT id FROM gcv_excursions
         WHERE guide_user_id = ?
           AND id <> ?
           AND date_iso = ?
           AND departure_time = ?
           AND deleted_at IS NULL
           AND status NOT IN ('cancelled', 'rejected')
         LIMIT 1"
    );
    $st->execute([
        $guideId,
        (int)($tour['id'] ?? 0),
        (string)($tour['date_iso'] ?? ''),
        (string)($tour['departure_time'] ?? ''),
    ]);
    if ($st->fetchColumn()) {
        return true;
    }
    if (!function_exists('gcv_guiagem_priority_holds_day')) {
        $queueFile = __DIR__ . '/guide_queue_offer.php';
        if (is_file($queueFile)) {
            require_once $queueFile;
        }
    }
    if (function_exists('gcv_guiagem_priority_holds_day')) {
        return gcv_guiagem_priority_holds_day(
            $guideId,
            (string)($tour['date_iso'] ?? ''),
            (int)($tour['id'] ?? 0)
        );
    }
    return false;
}

/** @return list<array<string,mixed>> */
function gcv_substitution_available(array $tour, int $fromId): array
{
    $soKalunga = gcv_excursao_exige_guia_kalunga($tour);
    $out = [];
    foreach (gcv_substitution_queue() as $g) {
        if ((int)$g['id'] === $fromId) {
            continue;
        }
        if ($soKalunga && empty($g['kalunga'])) {
            continue;
        }
        if (gcv_substitution_busy((int)$g['id'], $tour)) {
            continue;
        }
        $out[] = $g;
    }
    return $out;
}

function gcv_substitution_pending_out(int $excursionId, int $fromId): ?array
{
    gcv_substitution_ensure_schema();
    $st = db()->prepare(
        "SELECT s.*, COALESCE(NULLIF(g.full_name, ''), NULLIF(g.nickname, ''), u.name) AS to_nome
         FROM gcv_guide_substitutions s
         INNER JOIN gcv_users u ON u.id = s.to_user_id
         LEFT JOIN gcv_guides g ON g.user_id = u.id
         WHERE s.excursion_id = ? AND s.from_user_id = ? AND s.status = 'pending'
         ORDER BY s.id DESC LIMIT 1"
    );
    $st->execute([$excursionId, $fromId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

/**
 * @param list<array<string,mixed>> $rows
 * @return list<array<string,mixed>>
 */
function gcv_substitution_attach(array $rows, int $userId): array
{
    gcv_substitution_ensure_schema();
    foreach ($rows as &$row) {
        $row['can_substitute'] = empty($row['awaiting_guide']) && !empty($row['can_cancel']);
        $pending = gcv_substitution_pending_out((int)($row['id'] ?? 0), $userId);
        if ($pending) {
            $row['substitution_to_name'] = (string)$pending['to_nome'];
            $row['substitution_to_id'] = (int)$pending['to_user_id'];
            $row['substitution_offer_out'] = (int)$pending['id'];
        }
    }
    unset($row);

    $st = db()->prepare(
        "SELECT s.id, s.excursion_id, s.from_user_id,
                COALESCE(NULLIF(g.full_name, ''), NULLIF(g.nickname, ''), u.name) AS from_nome
         FROM gcv_guide_substitutions s
         INNER JOIN gcv_users u ON u.id = s.from_user_id
         LEFT JOIN gcv_guides g ON g.user_id = u.id
         WHERE s.to_user_id = ? AND s.status = 'pending'
         ORDER BY s.id ASC"
    );
    try {
        $st->execute([$userId]);
        $offers = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        $offers = [];
    }
    $incoming = [];
    foreach ($offers as $offer) {
        $tour = gcv_substitution_load_excursion((int)$offer['excursion_id']);
        if (!$tour || !function_exists('gcv_map_excursion_row')) {
            continue;
        }
        $mapped = gcv_map_excursion_row($tour);
        $mapped['clients'] = [];
        $mapped['awaiting_guide'] = true;
        $mapped['can_substitute'] = false;
        $mapped['can_cancel'] = false;
        $mapped['substitution_offer_id'] = (int)$offer['id'];
        $mapped['substitution_from_name'] = (string)$offer['from_nome'];
        $incoming[] = $mapped;
    }
    return array_merge($incoming, $rows);
}

function gcv_substitution_fila_posicao(int $userId): int
{
    foreach (gcv_substitution_queue() as $g) {
        if ((int)$g['id'] === $userId) {
            return (int)$g['posicao'];
        }
    }
    return 0;
}

function gcv_guia_kalunga_erro_msg(): string
{
    return 'Santa Bárbara, Capivara e Candaru só podem ser guiados por guia Kalunga.';
}

function gcv_guides_tem_coluna_kalunga(): bool
{
    static $ok = null;
    if ($ok !== null) {
        return $ok;
    }
    try {
        db()->query('SELECT is_kalunga FROM gcv_guides LIMIT 0');
        $ok = true;
    } catch (Throwable $e) {
        $ok = false;
    }
    return $ok;
}

function gcv_texto_sem_acento(string $s): string
{
    $s = function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
    return str_replace(
        ['á', 'à', 'ã', 'â', 'ä', 'é', 'ê', 'ë', 'í', 'ï', 'ó', 'ô', 'õ', 'ö', 'ú', 'ü', 'ç', 'ñ'],
        ['a', 'a', 'a', 'a', 'a', 'e', 'e', 'e', 'i', 'i', 'o', 'o', 'o', 'o', 'u', 'u', 'c', 'n'],
        $s
    );
}

/** Santa Bárbara, Capivara ou Candaru, inclusive nos combinados. */
function gcv_texto_exige_guia_kalunga(string $texto): bool
{
    $t = gcv_texto_sem_acento($texto);
    $t = str_replace(['-', '_', '+'], ' ', $t);
    return (bool)preg_match('/\b(santa barbara|capivara|candaru)\b/', $t);
}

/** @param list<array<string,mixed>> $rows */
function gcv_atrativos_exigem_guia_kalunga(array $rows): bool
{
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $blob = implode(' ', [
            (string)($row['title_pt'] ?? ''),
            (string)($row['title_en'] ?? ''),
            (string)($row['title_es'] ?? ''),
            (string)($row['slug'] ?? ''),
            (string)($row['title'] ?? ''),
        ]);
        if (gcv_texto_exige_guia_kalunga($blob)) {
            return true;
        }
    }
    return false;
}

/** @param list<int> $ids */
function gcv_ids_exigem_guia_kalunga(array $ids): bool
{
    $clean = [];
    foreach ($ids as $id) {
        $id = (int)$id;
        if ($id > 0) {
            $clean[$id] = $id;
        }
    }
    if (!$clean) {
        return false;
    }
    $rows = db()->query(
        'SELECT title_pt, title_en, title_es, slug FROM gcv_attractions WHERE id IN (' . implode(',', $clean) . ')'
    )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    return gcv_atrativos_exigem_guia_kalunga($rows);
}

/** @param array<string,mixed> $tour */
function gcv_excursao_exige_guia_kalunga(array $tour): bool
{
    $id = (int)($tour['id'] ?? 0);
    if ($id > 0) {
        if (!function_exists('gcv_excursion_load_attractions')) {
            require_once __DIR__ . '/excursion_attractions.php';
        }
        $attrs = gcv_excursion_load_attractions($id);
        if ($attrs) {
            return gcv_atrativos_exigem_guia_kalunga($attrs);
        }
    }
    return gcv_texto_exige_guia_kalunga(
        (string)($tour['attraction_title'] ?? '') . ' ' . (string)($tour['attraction_slug'] ?? '') . ' ' . (string)($tour['slug'] ?? '')
    );
}

function gcv_guia_e_kalunga(int $userId): bool
{
    if ($userId <= 0 || !gcv_guides_tem_coluna_kalunga()) {
        return false;
    }
    static $cache = [];
    if (array_key_exists($userId, $cache)) {
        return $cache[$userId];
    }
    try {
        $st = db()->prepare('SELECT is_kalunga FROM gcv_guides WHERE user_id = ? LIMIT 1');
        $st->execute([$userId]);
        $cache[$userId] = (int)$st->fetchColumn() === 1;
    } catch (Throwable $e) {
        $cache[$userId] = false;
    }
    return $cache[$userId];
}

/** @param array<string,mixed> $tour */
function gcv_guia_erro_kalunga_excursao(array $tour, int $guideId): ?string
{
    if ($guideId <= 0 || !gcv_excursao_exige_guia_kalunga($tour)) {
        return null;
    }
    if (gcv_guia_e_kalunga($guideId)) {
        return null;
    }
    return gcv_guia_kalunga_erro_msg();
}

/** @param list<int> $ids */
function gcv_guia_erro_kalunga_ids(array $ids, int $guideId): ?string
{
    if ($guideId <= 0 || !gcv_ids_exigem_guia_kalunga($ids)) {
        return null;
    }
    if (gcv_guia_e_kalunga($guideId)) {
        return null;
    }
    return gcv_guia_kalunga_erro_msg();
}
