<?php
declare(strict_types=1);

/**
 * Inbox do painel (sino): espelha avisos de WhatsApp e e-mail.
 */
require_once __DIR__ . '/db.php';

function gcv_inbox_ensure_schema(): void
{
    static $done = false;
    if ($done) {
        return;
    }
    if (function_exists('gcv_schema_should_run') && !gcv_schema_should_run('inbox-ensure')) {
        $done = true;
        return;
    }
    $done = true;
    try {
        db()->exec(
            "CREATE TABLE IF NOT EXISTS gcv_inbox (
              id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
              user_id INT UNSIGNED NOT NULL,
              title VARCHAR(180) NOT NULL,
              body TEXT NOT NULL,
              kind VARCHAR(40) NULL,
              excursion_id INT UNSIGNED NULL,
              sale_id BIGINT UNSIGNED NULL,
              read_at DATETIME NULL,
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_inbox_user_unread (user_id, read_at, id),
              INDEX idx_inbox_user_created (user_id, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        error_log('gcv_inbox schema: ' . $e->getMessage());
    }
}

function gcv_inbox_title_from_body(string $text): string
{
    $text = trim(str_replace("\r\n", "\n", $text));
    $first = '';
    foreach (explode("\n", $text) as $line) {
        $line = trim($line);
        if ($line === '') {
            continue;
        }
        if (preg_match('/^\*(.+)\*$/u', $line, $m)) {
            $line = trim($m[1]);
        }
        $first = $line;
        break;
    }
    if (function_exists('mb_substr')) {
        return mb_substr($first !== '' ? $first : 'Aviso', 0, 160);
    }
    return substr($first !== '' ? $first : 'Aviso', 0, 160);
}

/**
 * @param array{kind?:string,excursion_id?:int,sale_id?:int} $meta
 */
function gcv_inbox_push(int $userId, string $body, array $meta = []): void
{
    if ($userId <= 0) {
        return;
    }
    $body = trim($body);
    if ($body === '') {
        return;
    }
    gcv_inbox_ensure_schema();
    $title = gcv_inbox_title_from_body($body);
    $kind = substr(trim((string)($meta['kind'] ?? $meta['type'] ?? '')), 0, 40);
    $excIdEarly = isset($meta['excursion_id']) ? (int)$meta['excursion_id'] : 0;
    if ($excIdEarly > 0 && gcv_inbox_is_card($body, $kind) && gcv_inbox_replace_card($userId, $excIdEarly, $title, $body)) {
        return;
    }
    $excId = isset($meta['excursion_id']) ? (int)$meta['excursion_id'] : null;
    $saleId = isset($meta['sale_id']) ? (int)$meta['sale_id'] : null;
    if ($excId !== null && $excId <= 0) {
        $excId = null;
    }
    if ($saleId !== null && $saleId <= 0) {
        $saleId = null;
    }
    try {
        db()->prepare(
            'INSERT INTO gcv_inbox (user_id, title, body, `kind`, excursion_id, sale_id)
             VALUES (?,?,?,?,?,?)'
        )->execute([
            $userId,
            $title,
            $body,
            $kind !== '' ? $kind : null,
            $excId,
            $saleId,
        ]);
    } catch (Throwable $e) {
        error_log('gcv_inbox_push: ' . $e->getMessage());
    }
}

/** @return list<string> */
function gcv_inbox_card_markers(): array
{
    return [
        'Você é o guia dessa excursão',
        'Sua reserva está nesta excursão',
        'Your booking is on this tour',
        'Tu reserva está en esta excursión',
    ];
}

function gcv_inbox_is_card(string $body, string $kind): bool
{
    if (in_array($kind, ['guide_posse', 'guide_assigned', 'guide_accepted', 'client_posse'], true)) {
        return true;
    }
    foreach (gcv_inbox_card_markers() as $marker) {
        if (str_contains($body, $marker)) {
            return true;
        }
    }
    return false;
}

/** Regrava o aviso vivo da excursão em vez de empilhar uma cópia antiga. */
function gcv_inbox_replace_card(int $userId, int $excursionId, string $title, string $body): bool
{
    if ($userId <= 0 || $excursionId <= 0 || trim($body) === '') {
        return false;
    }
    $likes = [];
    $params = [$userId, $excursionId, 'guide_posse', 'guide_assigned', 'guide_accepted', 'client_posse'];
    foreach (gcv_inbox_card_markers() as $marker) {
        $likes[] = 'body LIKE ?';
        $params[] = '%' . $marker . '%';
    }
    try {
        $st = db()->prepare(
            'SELECT id FROM gcv_inbox WHERE user_id = ? AND excursion_id = ? AND (`kind` IN (?,?,?,?) OR '
            . implode(' OR ', $likes) . ')'
        );
        $st->execute($params);
        $ids = array_map('intval', $st->fetchAll(PDO::FETCH_COLUMN) ?: []);
        $ids = array_values(array_filter($ids));
        if (!$ids) {
            return false;
        }
        $upd = db()->prepare('UPDATE gcv_inbox SET title = ?, body = ? WHERE id = ? AND user_id = ?');
        foreach ($ids as $id) {
            $upd->execute([$title, $body, $id, $userId]);
        }
        return true;
    } catch (Throwable $e) {
        error_log('gcv_inbox_replace_card: ' . $e->getMessage());
        return false;
    }
}

function gcv_inbox_unread_count(int $userId, ?string $kind = null): int
{
    if ($userId <= 0) {
        return 0;
    }
    gcv_inbox_ensure_schema();
    $kind = $kind !== null ? substr(trim($kind), 0, 40) : '';
    try {
        if ($kind !== '') {
            $st = db()->prepare('SELECT COUNT(*) FROM gcv_inbox WHERE user_id = ? AND read_at IS NULL AND `kind` = ?');
            $st->execute([$userId, $kind]);
        } else {
            $st = db()->prepare('SELECT COUNT(*) FROM gcv_inbox WHERE user_id = ? AND read_at IS NULL');
            $st->execute([$userId]);
        }
        return (int)$st->fetchColumn();
    } catch (Throwable $e) {
        return 0;
    }
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_inbox_list(int $userId, int $limit = 80): array
{
    if ($userId <= 0) {
        return [];
    }
    gcv_inbox_ensure_schema();
    $limit = max(1, min(200, $limit));
    try {
        $st = db()->prepare(
            "SELECT id, title, body, `kind`, excursion_id, sale_id, read_at, created_at
             FROM gcv_inbox
             WHERE user_id = ?
             ORDER BY id DESC
             LIMIT {$limit}"
        );
        $st->execute([$userId]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($rows as &$r) {
            $r['id'] = (int)$r['id'];
            $r['unread'] = empty($r['read_at']);
            $r['excursion_id'] = $r['excursion_id'] !== null ? (int)$r['excursion_id'] : null;
            $r['sale_id'] = $r['sale_id'] !== null ? (int)$r['sale_id'] : null;
        }
        unset($r);
        return $rows;
    } catch (Throwable $e) {
        error_log('gcv_inbox_list: ' . $e->getMessage());
        return [];
    }
}

function gcv_inbox_mark_read(int $userId, ?int $id = null): int
{
    if ($userId <= 0) {
        return 0;
    }
    gcv_inbox_ensure_schema();
    try {
        if ($id !== null && $id > 0) {
            $st = db()->prepare(
                'UPDATE gcv_inbox SET read_at = NOW() WHERE user_id = ? AND id = ? AND read_at IS NULL'
            );
            $st->execute([$userId, $id]);
        } else {
            $st = db()->prepare(
                'UPDATE gcv_inbox SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL'
            );
            $st->execute([$userId]);
        }
        return $st->rowCount();
    } catch (Throwable $e) {
        return 0;
    }
}

function gcv_inbox_mark_read_kind(int $userId, string $kind): int
{
    if ($userId <= 0) {
        return 0;
    }
    $kind = substr(trim($kind), 0, 40);
    if ($kind === '') {
        return 0;
    }
    gcv_inbox_ensure_schema();
    try {
        $st = db()->prepare(
            'UPDATE gcv_inbox SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL AND `kind` = ?'
        );
        $st->execute([$userId, $kind]);
        return $st->rowCount();
    } catch (Throwable $e) {
        return 0;
    }
}

/**
 * @param list<int> $ids
 */
function gcv_inbox_mark_read_ids(int $userId, array $ids): int
{
    if ($userId <= 0) {
        return 0;
    }
    $clean = [];
    foreach ($ids as $id) {
        $n = (int)$id;
        if ($n > 0) {
            $clean[$n] = $n;
        }
    }
    $clean = array_values($clean);
    if (!$clean) {
        return 0;
    }
    gcv_inbox_ensure_schema();
    try {
        $placeholders = implode(',', array_fill(0, count($clean), '?'));
        $st = db()->prepare(
            "UPDATE gcv_inbox SET read_at = NOW()
             WHERE user_id = ? AND read_at IS NULL AND id IN ({$placeholders})"
        );
        $st->execute(array_merge([$userId], $clean));
        return $st->rowCount();
    } catch (Throwable $e) {
        return 0;
    }
}
