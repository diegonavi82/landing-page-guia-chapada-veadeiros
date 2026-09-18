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
        if ($line !== '') {
            $first = $line;
            break;
        }
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

function gcv_inbox_unread_count(int $userId): int
{
    if ($userId <= 0) {
        return 0;
    }
    gcv_inbox_ensure_schema();
    try {
        $st = db()->prepare('SELECT COUNT(*) FROM gcv_inbox WHERE user_id = ? AND read_at IS NULL');
        $st->execute([$userId]);
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
