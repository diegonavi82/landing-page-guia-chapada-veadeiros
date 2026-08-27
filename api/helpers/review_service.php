<?php
declare(strict_types=1);

/**
 * Avaliações do guia (1 reserva = 1 avaliação, token, prazo de 1 ano).
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/marketplace_schema.php';
require_once __DIR__ . '/cms_schema.php';

function gcv_review_criteria(): array
{
    return ['punctuality', 'knowledge', 'service'];
}

function gcv_review_today(): string
{
    return (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
}

function gcv_review_tour_date(array $sale, ?array $exc): ?string
{
    $iso = (string)($exc['date_iso'] ?? '');
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $iso)) {
        return $iso;
    }
    $starts = (string)($sale['excursion_starts_at'] ?? '');
    if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $starts, $m)) {
        return $m[1];
    }
    return null;
}

function gcv_review_deadline(string $tourDate): string
{
    try {
        return (new DateTimeImmutable($tourDate, new DateTimeZone('America/Sao_Paulo')))
            ->modify('+1 year')
            ->format('Y-m-d');
    } catch (Throwable $e) {
        return $tourDate;
    }
}

/** @return array{ok:bool,reason:string,tour_date:?string,deadline:?string} */
function gcv_review_window(array $sale, ?array $exc): array
{
    $tour = gcv_review_tour_date($sale, $exc);
    if ($tour === null) {
        return ['ok' => false, 'reason' => 'no_date', 'tour_date' => null, 'deadline' => null];
    }
    $deadline = gcv_review_deadline($tour);
    $today = gcv_review_today();
    if ($today < $tour) {
        return ['ok' => false, 'reason' => 'too_early', 'tour_date' => $tour, 'deadline' => $deadline];
    }
    if ($today > $deadline) {
        return ['ok' => false, 'reason' => 'expired', 'tour_date' => $tour, 'deadline' => $deadline];
    }
    return ['ok' => true, 'reason' => 'open', 'tour_date' => $tour, 'deadline' => $deadline];
}

function gcv_review_ensure_token(array &$sale): string
{
    $existing = strtolower(trim((string)($sale['review_token'] ?? '')));
    if (preg_match('/^[a-f0-9]{64}$/', $existing)) {
        return $existing;
    }
    $id = (int)($sale['id'] ?? 0);
    if ($id <= 0) {
        return '';
    }
    for ($i = 0; $i < 4; $i++) {
        $token = bin2hex(random_bytes(32));
        try {
            db()->prepare(
                'UPDATE gcv_sales SET review_token = ? WHERE id = ? AND (review_token IS NULL OR review_token = \'\')'
            )->execute([$token, $id]);
            $chk = db()->prepare('SELECT review_token FROM gcv_sales WHERE id = ? LIMIT 1');
            $chk->execute([$id]);
            $got = strtolower(trim((string)$chk->fetchColumn()));
            if (preg_match('/^[a-f0-9]{64}$/', $got)) {
                $sale['review_token'] = $got;
                return $got;
            }
        } catch (Throwable $e) {
            error_log('review token: ' . $e->getMessage());
        }
    }
    return '';
}

function gcv_review_form_url(string $token, string $loc = 'pt'): string
{
    $host = 'https://www.guiachapadaveadeiros.com';
    $q = '?t=' . rawurlencode($token);
    if ($loc === 'en') {
        return $host . '/en/avaliar.html' . $q;
    }
    if ($loc === 'es') {
        return $host . '/es/avaliar.html' . $q;
    }
    return $host . '/avaliar.html' . $q;
}

function gcv_review_normalize_token(string $raw): string
{
    $t = strtolower(trim($raw));
    return preg_match('/^[a-f0-9]{64}$/', $t) ? $t : '';
}

function gcv_review_load_by_token(string $token): ?array
{
    $token = gcv_review_normalize_token($token);
    if ($token === '') {
        return null;
    }
    gcv_marketplace_ensure_schema();
    $stmt = db()->prepare(
        'SELECT s.*, e.date_iso, e.departure_time, e.guide_user_id AS exc_guide_user_id,
                a.title_pt AS attraction_title
         FROM gcv_sales s
         LEFT JOIN gcv_excursions e ON e.id = s.excursion_id
         LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
         WHERE s.review_token = ? AND s.deleted_at IS NULL
         LIMIT 1'
    );
    $stmt->execute([$token]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function gcv_review_find_for_sale(int $saleId): ?array
{
    if ($saleId <= 0) {
        return null;
    }
    $stmt = db()->prepare('SELECT * FROM gcv_guide_reviews WHERE sale_id = ? LIMIT 1');
    $stmt->execute([$saleId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function gcv_review_is_public(array $row): bool
{
    return (int)($row['hidden_by_admin'] ?? 0) === 0
        && (int)($row['hidden_by_tourist'] ?? 0) === 0;
}

function gcv_review_visibility_label(array $row): string
{
    $admin = (int)($row['hidden_by_admin'] ?? 0) === 1;
    $tour = (int)($row['hidden_by_tourist'] ?? 0) === 1;
    if (!$admin && !$tour) {
        return 'visible';
    }
    if ($admin && $tour) {
        return 'hidden_both';
    }
    return $admin ? 'hidden_admin' : 'hidden_tourist';
}

function gcv_review_photos(array $row): array
{
    $raw = $row['photos_json'] ?? '[]';
    $arr = is_array($raw) ? $raw : json_decode((string)$raw, true);
    if (!is_array($arr)) {
        return [];
    }
    $out = [];
    foreach ($arr as $p) {
        if (is_string($p) && $p !== '') {
            $out[] = ['url' => $p];
        } elseif (is_array($p) && !empty($p['url'])) {
            $out[] = ['url' => (string)$p['url'], 'path' => (string)($p['path'] ?? '')];
        }
    }
    return $out;
}

function gcv_review_public_payload(array $row): array
{
    $avg = (float)($row['score_avg'] ?? 0);
    return [
        'id' => (int)$row['id'],
        'guide_user_id' => (int)$row['guide_user_id'],
        'guide_name' => (string)($row['guide_name'] ?? ''),
        'tourist_name' => (string)($row['tourist_name'] ?? 'Cliente'),
        'excursion_title' => (string)($row['excursion_title'] ?? ''),
        'tour_date' => (string)($row['tour_date'] ?? ''),
        'created_at' => (string)($row['created_at'] ?? ''),
        'score_punctuality' => (int)$row['score_punctuality'],
        'score_knowledge' => (int)$row['score_knowledge'],
        'score_service' => (int)$row['score_service'],
        'score_avg' => round($avg, 2),
        'comment' => (string)($row['comment'] ?? ''),
        'photos' => gcv_review_photos($row),
        'locale' => (string)($row['locale'] ?? 'pt'),
    ];
}

function gcv_review_admin_payload(array $row): array
{
    $p = gcv_review_public_payload($row);
    $p['reservation_id'] = (string)($row['reservation_id'] ?? '');
    $p['sale_id'] = (int)($row['sale_id'] ?? 0);
    $p['hidden_by_admin'] = (int)($row['hidden_by_admin'] ?? 0);
    $p['hidden_by_tourist'] = (int)($row['hidden_by_tourist'] ?? 0);
    $p['visibility'] = gcv_review_visibility_label($row);
    $p['is_public'] = gcv_review_is_public($row);
    $p['tourist_email'] = (string)($row['tourist_email'] ?? '');
    return $p;
}

function gcv_review_tourist_payload(array $row): array
{
    $p = gcv_review_admin_payload($row);
    unset($p['tourist_email']);
    return $p;
}

function gcv_review_clamp_score($v): int
{
    $n = (int)$v;
    if ($n < 1) {
        return 0;
    }
    if ($n > 5) {
        return 5;
    }
    return $n;
}

function gcv_review_context_from_sale(array $sale): array
{
    $exc = [
        'date_iso' => $sale['date_iso'] ?? null,
        'departure_time' => $sale['departure_time'] ?? null,
        'attraction_title' => $sale['attraction_title'] ?? $sale['excursion_title'] ?? '',
        'guide_user_id' => $sale['exc_guide_user_id'] ?? $sale['guide_user_id'] ?? 0,
    ];
    $win = gcv_review_window($sale, $exc);
    $guideId = (int)($sale['guide_user_id'] ?? $exc['guide_user_id'] ?? 0);
    $guideName = (string)($sale['guide_name'] ?? '');
    if ($guideId > 0 && function_exists('gcv_ops_guide_contact')) {
        $c = gcv_ops_guide_contact($guideId);
        if ($c['name'] !== '') {
            $guideName = $c['name'];
        }
    } elseif ($guideId > 0) {
        try {
            $st = db()->prepare(
                'SELECT COALESCE(NULLIF(g.full_name,\'\'), NULLIF(g.nickname,\'\'), u.name) AS name
                 FROM gcv_users u LEFT JOIN gcv_guides g ON g.user_id = u.id WHERE u.id = ? LIMIT 1'
            );
            $st->execute([$guideId]);
            $n = trim((string)$st->fetchColumn());
            if ($n !== '') {
                $guideName = $n;
            }
        } catch (Throwable $e) {
            // ignore
        }
    }
    $existing = gcv_review_find_for_sale((int)$sale['id']);
    $paid = ($sale['sale_status'] ?? '') === 'PAID';
    $state = 'invalid';
    if ($existing) {
        $state = 'already';
    } elseif (!$paid) {
        $state = 'not_paid';
    } elseif ($win['reason'] === 'too_early') {
        $state = 'too_early';
    } elseif ($win['reason'] === 'expired') {
        $state = 'expired';
    } elseif ($win['ok']) {
        $state = 'form';
    }
    return [
        'state' => $state,
        'window' => $win,
        'sale' => $sale,
        'existing' => $existing,
        'guide_name' => $guideName,
        'guide_user_id' => $guideId,
        'title' => (string)($sale['attraction_title'] ?? $sale['excursion_title'] ?? 'Passeio'),
    ];
}

function gcv_review_submit(array $sale, array $body, string $locale): array
{
    $ctx = gcv_review_context_from_sale($sale);
    if ($ctx['state'] === 'already') {
        throw new RuntimeException('duplicate');
    }
    if ($ctx['state'] !== 'form') {
        throw new RuntimeException($ctx['state']);
    }
    $p = gcv_review_clamp_score($body['score_punctuality'] ?? $body['punctuality'] ?? 0);
    $k = gcv_review_clamp_score($body['score_knowledge'] ?? $body['knowledge'] ?? 0);
    $s = gcv_review_clamp_score($body['score_service'] ?? $body['service'] ?? 0);
    if ($p < 1 || $k < 1 || $s < 1) {
        throw new InvalidArgumentException('scores');
    }
    $avg = round(($p + $k + $s) / 3, 2);
    $comment = trim((string)($body['comment'] ?? ''));
    if (mb_strlen($comment) > 2000) {
        $comment = mb_substr($comment, 0, 2000);
    }
    $photos = [];
    if (is_array($body['photos'] ?? null)) {
        foreach ($body['photos'] as $ph) {
            if (count($photos) >= 5) {
                break;
            }
            $url = '';
            $path = '';
            if (is_string($ph)) {
                $url = $ph;
            } elseif (is_array($ph)) {
                $url = (string)($ph['url'] ?? '');
                $path = (string)($ph['path'] ?? '');
            }
            if ($url !== '' && (str_starts_with($url, '/assets/img/uploads/reviews/') || str_starts_with($url, 'assets/img/uploads/reviews/'))) {
                $photos[] = ['url' => $url, 'path' => $path];
            }
        }
    }
    $win = $ctx['window'];
    $loc = in_array($locale, ['pt', 'en', 'es'], true) ? $locale : 'pt';
    $ins = db()->prepare(
        'INSERT INTO gcv_guide_reviews (
            sale_id, reservation_id, excursion_id, guide_user_id, guide_name,
            tourist_name, tourist_email, tour_date, excursion_title,
            score_punctuality, score_knowledge, score_service, score_avg,
            comment, photos_json, locale
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    try {
        $ins->execute([
            (int)$sale['id'],
            strtoupper(trim((string)($sale['reservation_id'] ?? ''))),
            (int)($sale['excursion_id'] ?? 0) ?: null,
            $ctx['guide_user_id'],
            $ctx['guide_name'],
            (string)($sale['tourist_name'] ?? 'Cliente'),
            strtolower(trim((string)($sale['tourist_email'] ?? ''))),
            $win['tour_date'],
            $ctx['title'],
            $p,
            $k,
            $s,
            $avg,
            $comment !== '' ? $comment : null,
            json_encode($photos, JSON_UNESCAPED_UNICODE),
            $loc,
        ]);
    } catch (Throwable $e) {
        if (stripos($e->getMessage(), 'Duplicate') !== false) {
            throw new RuntimeException('duplicate');
        }
        throw $e;
    }
    $id = (int)db()->lastInsertId();
    $row = gcv_review_find_for_sale((int)$sale['id']) ?: ['id' => $id];
    return $row;
}

function gcv_review_set_tourist_hidden(array $row, bool $hidden): void
{
    db()->prepare('UPDATE gcv_guide_reviews SET hidden_by_tourist = ?, updated_at = NOW() WHERE id = ?')
        ->execute([$hidden ? 1 : 0, (int)$row['id']]);
}

function gcv_review_set_admin_hidden(int $id, bool $hidden): void
{
    db()->prepare('UPDATE gcv_guide_reviews SET hidden_by_admin = ?, updated_at = NOW() WHERE id = ?')
        ->execute([$hidden ? 1 : 0, $id]);
}

function gcv_review_delete_permanent(int $id): bool
{
    $st = db()->prepare('SELECT * FROM gcv_guide_reviews WHERE id = ? LIMIT 1');
    $st->execute([$id]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return false;
    }
    $root = dirname(__DIR__, 2);
    foreach (gcv_review_photos($row) as $ph) {
        $rel = ltrim(str_replace('\\', '/', (string)($ph['path'] ?? '')), '/');
        if ($rel === '' && !empty($ph['url'])) {
            $rel = ltrim((string)preg_replace('#^https?://[^/]+/#', '', (string)$ph['url']), '/');
        }
        if ($rel === '' || !str_starts_with($rel, 'assets/img/uploads/reviews/')) {
            continue;
        }
        $abs = $root . '/' . $rel;
        if (is_file($abs)) {
            @unlink($abs);
        }
    }
    $del = db()->prepare('DELETE FROM gcv_guide_reviews WHERE id = ?');
    $del->execute([$id]);
    return $del->rowCount() > 0;
}

function gcv_review_guide_stats(int $guideUserId): array
{
    $stmt = db()->prepare(
        "SELECT COUNT(*) AS n, AVG(score_avg) AS avg_score
         FROM gcv_guide_reviews
         WHERE guide_user_id = ? AND hidden_by_admin = 0 AND hidden_by_tourist = 0"
    );
    $stmt->execute([$guideUserId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    return [
        'count' => (int)($row['n'] ?? 0),
        'avg' => isset($row['avg_score']) ? round((float)$row['avg_score'], 2) : null,
    ];
}

function gcv_review_list_public(int $guideUserId, int $limit = 20): array
{
    $limit = max(1, min(50, $limit));
    $stmt = db()->prepare(
        "SELECT * FROM gcv_guide_reviews
         WHERE guide_user_id = ? AND hidden_by_admin = 0 AND hidden_by_tourist = 0
         ORDER BY created_at DESC
         LIMIT {$limit}"
    );
    $stmt->execute([$guideUserId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
    return array_map('gcv_review_public_payload', $rows);
}

function gcv_review_list_admin(int $limit = 200): array
{
    $limit = max(1, min(500, $limit));
    $stmt = db()->query(
        "SELECT * FROM gcv_guide_reviews ORDER BY created_at DESC LIMIT {$limit}"
    );
    $rows = $stmt ? ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: []) : [];
    return array_map('gcv_review_admin_payload', $rows);
}

function gcv_review_save_photo(array $file): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        throw new RuntimeException('upload');
    }
    if (($file['size'] ?? 0) > 8 * 1024 * 1024) {
        throw new RuntimeException('too_large');
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = $finfo->file($file['tmp_name']) ?: '';
    $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($allowed[$mime])) {
        throw new RuntimeException('type');
    }
    $ym = date('Y/m');
    $root = gcv_cms_uploads_root();
    $dir = $root . '/reviews/' . $ym;
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('mkdir');
    }
    $name = bin2hex(random_bytes(8)) . '-' . time() . '.' . $allowed[$mime];
    $abs = $dir . '/' . $name;
    if (!move_uploaded_file($file['tmp_name'], $abs)) {
        throw new RuntimeException('save');
    }
    $rel = 'assets/img/uploads/reviews/' . $ym . '/' . $name;
    $url = gcv_cms_public_url($rel);
    return ['url' => $url, 'path' => $rel];
}
