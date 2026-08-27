<?php

declare(strict_types=1);

/**
 * Vagas Pix do carrossel — persistência em MySQL (+ espelho JSON de fallback).
 *
 * Tabelas:
 * - gcv_pix_carousel_seats (cart_id, qty)
 * - gcv_pix_carousel_seat_applied (reservation_id) — idempotência
 *
 * Fallback: api/storage/pix_seats.json se o banco falhar.
 */

function gcv_pix_seats_path(): string
{
    $dir = dirname(__DIR__) . '/storage';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir . '/pix_seats.json';
}

function gcv_pix_seats_safe_reservation_id(string $id): string
{
    return preg_replace('/[^A-Z0-9\-]/', '', strtoupper(trim($id))) ?? '';
}

function gcv_pix_seats_normalize_cart_id(string $cartId): string
{
    $id = strtolower(trim($cartId));
    $id = preg_replace('/[^a-z0-9\-]+/', '-', $id) ?? '';
    return trim($id, '-');
}

function gcv_pix_seats_db(): ?PDO
{
    static $pdo = null;
    static $failed = false;
    if ($failed) {
        return null;
    }
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $dbHelper = __DIR__ . '/db.php';
    $schemaHelper = __DIR__ . '/cms_schema.php';
    if (!is_readable($dbHelper)) {
        $failed = true;
        return null;
    }
    try {
        require_once $dbHelper;
        if (is_readable($schemaHelper)) {
            require_once $schemaHelper;
            if (function_exists('gcv_cms_ensure_schema')) {
                gcv_cms_ensure_schema();
            }
        }
        if (!function_exists('db')) {
            $failed = true;
            return null;
        }
        $pdo = db();
        gcv_pix_seats_ensure_tables($pdo);
        return $pdo;
    } catch (Throwable $e) {
        error_log('gcv_pix_seats_db: ' . $e->getMessage());
        $failed = true;
        return null;
    }
}

function gcv_pix_seats_ensure_tables(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS gcv_pix_carousel_seats (
          cart_id VARCHAR(220) NOT NULL,
          qty SMALLINT UNSIGNED NOT NULL DEFAULT 0,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (cart_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS gcv_pix_carousel_seat_applied (
          reservation_id VARCHAR(32) NOT NULL,
          applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (reservation_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

/** @return array{seats: array<string,int>, applied: array<string,bool>} */
function gcv_pix_seats_read_json(): array
{
    $path = gcv_pix_seats_path();
    $empty = ['seats' => [], 'applied' => []];
    if (!is_readable($path)) {
        return $empty;
    }
    $raw = file_get_contents($path);
    if ($raw === false || $raw === '') {
        return $empty;
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        return $empty;
    }
    $seats = [];
    if (is_array($data['seats'] ?? null)) {
        foreach ($data['seats'] as $id => $qty) {
            $canon = gcv_pix_seats_normalize_cart_id((string)$id);
            $n = (int)$qty;
            if ($canon === '' || $n < 1) {
                continue;
            }
            $seats[$canon] = ($seats[$canon] ?? 0) + $n;
        }
    }
    $applied = [];
    if (is_array($data['applied'] ?? null)) {
        foreach ($data['applied'] as $rid => $flag) {
            $safe = gcv_pix_seats_safe_reservation_id((string)$rid);
            if ($safe !== '' && $flag) {
                $applied[$safe] = true;
            }
        }
    }
    return ['seats' => $seats, 'applied' => $applied];
}

/** @param array{seats?: array<string,int>, applied?: array<string,bool>} $data */
function gcv_pix_seats_write_json(array $data): bool
{
    $payload = [
        'seats' => $data['seats'] ?? [],
        'applied' => $data['applied'] ?? [],
        'updated_at' => gmdate('c'),
        'source' => 'mirror',
    ];
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        return false;
    }
    return file_put_contents(gcv_pix_seats_path(), $json, LOCK_EX) !== false;
}

/** @return array{seats: array<string,int>, applied: array<string,bool>} */
function gcv_pix_seats_read_db(PDO $pdo): array
{
    $seats = [];
    $applied = [];
    $rows = $pdo->query('SELECT cart_id, qty FROM gcv_pix_carousel_seats')->fetchAll();
    foreach ($rows as $r) {
        $canon = gcv_pix_seats_normalize_cart_id((string)($r['cart_id'] ?? ''));
        $n = (int)($r['qty'] ?? 0);
        if ($canon === '' || $n < 1) {
            continue;
        }
        $seats[$canon] = $n;
    }
    $apps = $pdo->query('SELECT reservation_id FROM gcv_pix_carousel_seat_applied')->fetchAll();
    foreach ($apps as $r) {
        $safe = gcv_pix_seats_safe_reservation_id((string)($r['reservation_id'] ?? ''));
        if ($safe !== '') {
            $applied[$safe] = true;
        }
    }
    return ['seats' => $seats, 'applied' => $applied];
}

/** @return array{seats: array<string,int>, applied: array<string,bool>} */
function gcv_pix_seats_read(): array
{
    $pdo = gcv_pix_seats_db();
    if ($pdo) {
        try {
            $store = gcv_pix_seats_read_db($pdo);
            // Espelha no JSON para backup/debug
            gcv_pix_seats_write_json($store);
            return $store;
        } catch (Throwable $e) {
            error_log('gcv_pix_seats_read db: ' . $e->getMessage());
        }
    }
    return gcv_pix_seats_read_json();
}

/**
 * Soma vagas dos trips de uma reserva PAID (idempotente por reservation_id).
 *
 * @param array<string, mixed> $reservation
 * @return array{ok: bool, seats: array<string,int>, already?: bool, storage?: string}
 */
function gcv_pix_seats_apply_reservation(array $reservation): array
{
    $rid = gcv_pix_seats_safe_reservation_id((string)($reservation['reservation_id'] ?? ''));
    if ($rid === '') {
        return ['ok' => false, 'seats' => []];
    }

    $pending = [];
    $trips = is_array($reservation['trips'] ?? null) ? $reservation['trips'] : [];
    foreach ($trips as $trip) {
        if (!is_array($trip)) {
            continue;
        }
        $cartId = gcv_pix_seats_normalize_cart_id((string)($trip['cartId'] ?? $trip['cart_id'] ?? ''));
        $qty = (int)($trip['qty'] ?? $trip['quantity'] ?? 0);
        if ($cartId === '' || $qty < 1) {
            continue;
        }
        $pending[$cartId] = ($pending[$cartId] ?? 0) + $qty;
    }

    $pdo = gcv_pix_seats_db();
    if ($pdo) {
        try {
            $pdo->beginTransaction();
            $chk = $pdo->prepare('SELECT 1 FROM gcv_pix_carousel_seat_applied WHERE reservation_id = ? LIMIT 1');
            $chk->execute([$rid]);
            if ($chk->fetch()) {
                $pdo->commit();
                $store = gcv_pix_seats_read_db($pdo);
                gcv_pix_seats_write_json($store);
                return ['ok' => true, 'already' => true, 'seats' => $store['seats'], 'storage' => 'mysql'];
            }

            $upsert = $pdo->prepare(
                'INSERT INTO gcv_pix_carousel_seats (cart_id, qty)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE qty = LEAST(65535, qty + VALUES(qty))'
            );
            foreach ($pending as $cartId => $qty) {
                $upsert->execute([$cartId, $qty]);
            }

            $mark = $pdo->prepare('INSERT INTO gcv_pix_carousel_seat_applied (reservation_id) VALUES (?)');
            $mark->execute([$rid]);
            $pdo->commit();

            gcv_pix_seats_bump_cms_booked($pdo, $pending);

            $store = gcv_pix_seats_read_db($pdo);
            gcv_pix_seats_write_json($store);
            return ['ok' => true, 'seats' => $store['seats'], 'storage' => 'mysql'];
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('gcv_pix_seats_apply_reservation db: ' . $e->getMessage());
        }
    }

    // Fallback JSON
    $store = gcv_pix_seats_read_json();
    if (!empty($store['applied'][$rid])) {
        return ['ok' => true, 'already' => true, 'seats' => $store['seats'], 'storage' => 'json'];
    }
    foreach ($pending as $cartId => $qty) {
        $store['seats'][$cartId] = (int)($store['seats'][$cartId] ?? 0) + $qty;
    }
    $store['applied'][$rid] = true;
    if (!gcv_pix_seats_write_json($store)) {
        return ['ok' => false, 'seats' => $store['seats'], 'storage' => 'json'];
    }
    return ['ok' => true, 'seats' => $store['seats'], 'storage' => 'json'];
}

/**
 * Devolve vagas de uma reserva cancelada (idempotente).
 *
 * @param array<string,mixed> $reservation
 */
function gcv_pix_seats_release_reservation(array $reservation): void
{
    $rid = gcv_pix_seats_safe_reservation_id((string)($reservation['reservation_id'] ?? ''));
    if ($rid === '') {
        return;
    }
    $pending = [];
    $trips = is_array($reservation['trips'] ?? null) ? $reservation['trips'] : [];
    foreach ($trips as $trip) {
        if (!is_array($trip)) {
            continue;
        }
        $cartId = gcv_pix_seats_normalize_cart_id((string)($trip['cartId'] ?? $trip['cart_id'] ?? ''));
        $qty = (int)($trip['qty'] ?? $trip['quantity'] ?? 0);
        if ($cartId === '' || $qty < 1) {
            continue;
        }
        $pending[$cartId] = ($pending[$cartId] ?? 0) + $qty;
    }
    if (!$pending) {
        return;
    }
    $pdo = gcv_pix_seats_db();
    if ($pdo) {
        try {
            $chk = $pdo->prepare('SELECT 1 FROM gcv_pix_carousel_seat_applied WHERE reservation_id = ? LIMIT 1');
            $chk->execute([$rid]);
            if (!$chk->fetch()) {
                return;
            }
            $pdo->beginTransaction();
            $dec = $pdo->prepare('UPDATE gcv_pix_carousel_seats SET qty = GREATEST(0, CAST(qty AS SIGNED) - ?) WHERE cart_id = ?');
            foreach ($pending as $cartId => $qty) {
                $dec->execute([$qty, $cartId]);
            }
            $pdo->prepare('DELETE FROM gcv_pix_carousel_seat_applied WHERE reservation_id = ?')->execute([$rid]);
            $pdo->commit();
            $store = gcv_pix_seats_read_db($pdo);
            gcv_pix_seats_write_json($store);
            return;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            error_log('gcv_pix_seats_release: ' . $e->getMessage());
        }
    }
    $store = gcv_pix_seats_read_json();
    if (empty($store['applied'][$rid])) {
        return;
    }
    foreach ($pending as $cartId => $qty) {
        $store['seats'][$cartId] = max(0, (int)($store['seats'][$cartId] ?? 0) - $qty);
    }
    unset($store['applied'][$rid]);
    gcv_pix_seats_write_json($store);
}

/**
 * Aplica seats de reservas PAID ainda não processadas (recupera histórico / deploy novo).
 */
function gcv_pix_seats_sync_from_paid_reservations(): array
{
    if (!function_exists('gcv_pix_storage_dir')) {
        $resStore = __DIR__ . '/pix_reservation_store.php';
        if (is_readable($resStore)) {
            require_once $resStore;
        }
    }
    if (!function_exists('gcv_pix_storage_dir')) {
        return gcv_pix_seats_read();
    }

    $dir = gcv_pix_storage_dir();
    foreach (glob($dir . '/GCV-*.json') ?: [] as $path) {
        $raw = file_get_contents($path);
        if ($raw === false || $raw === '') {
            continue;
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            continue;
        }
        if (strtoupper((string)($data['status'] ?? '')) !== 'PAID') {
            continue;
        }
        gcv_pix_seats_apply_reservation($data);
    }
    return gcv_pix_seats_read();
}

/**
 * Também incrementa booked_people em gcv_excursions quando a saída existir no CMS.
 *
 * @param array<string,int> $pending
 */
function gcv_pix_seats_bump_cms_booked(PDO $pdo, array $pending): void
{
    if (!$pending) {
        return;
    }
    try {
        $stmt = $pdo->prepare(
            'UPDATE gcv_excursions
             SET booked_people = LEAST(255, booked_people + ?)
             WHERE id = ? OR cart_slug = ? OR cart_slug = ?'
        );
        foreach ($pending as $cartId => $qty) {
            $qty = (int)$qty;
            if ($qty < 1) {
                continue;
            }
            $slug = $cartId;
            if (preg_match('/^\d{4}-\d{2}-\d{2}-(.+)$/', $cartId, $m)) {
                $slug = $m[1];
            }
            $maybeId = ctype_digit($cartId) ? (int)$cartId : 0;
            $stmt->execute([$qty, $maybeId, $cartId, $slug]);
        }
    } catch (Throwable $e) {
        error_log('gcv_pix_seats_bump_cms_booked: ' . $e->getMessage());
    }
}
