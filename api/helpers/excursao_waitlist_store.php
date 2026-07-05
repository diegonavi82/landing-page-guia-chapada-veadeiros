<?php

declare(strict_types=1);

require_once __DIR__ . '/pix_reservation_store.php';

function gcv_waitlist_storage_dir(): string
{
    $dir = dirname(__DIR__) . '/storage/excursao_waitlist';
    if (!is_dir($dir)) {
        if (!@mkdir($dir, 0755, true) && !is_dir($dir)) {
            throw new RuntimeException('Cannot create waitlist storage directory');
        }
    }
    if (!is_writable($dir)) {
        throw new RuntimeException('Waitlist storage directory is not writable');
    }
    return $dir;
}

function gcv_waitlist_safe_cart_id(string $cartId): string
{
    $safe = strtolower(trim($cartId));
    $safe = preg_replace('/[^a-z0-9\-]/', '', $safe) ?? '';
    if ($safe === '' || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $safe)) {
        throw new InvalidArgumentException('Invalid cart_id');
    }
    return $safe;
}

function gcv_waitlist_index_path(): string
{
    return gcv_waitlist_storage_dir() . '/index.json';
}

/** @return array<string, list<array<string, mixed>>> */
function gcv_waitlist_read_all(): array
{
    $path = gcv_waitlist_index_path();
    if (!is_readable($path)) {
        return [];
    }
    $raw = file_get_contents($path);
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/** @param array<string, list<array<string, mixed>>> $data */
function gcv_waitlist_write_all(array $data): bool
{
    $path = gcv_waitlist_index_path();
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        return false;
    }
    return file_put_contents($path, $json, LOCK_EX) !== false;
}

/** @return list<array<string, mixed>> */
function gcv_waitlist_read_cart(string $cartId): array
{
    try {
        $safe = gcv_waitlist_safe_cart_id($cartId);
    } catch (Throwable $e) {
        return [];
    }
    $all = gcv_waitlist_read_all();
    $rows = $all[$safe] ?? [];
    return is_array($rows) ? $rows : [];
}

/** @param array<string, mixed> $entry */
function gcv_waitlist_add_entry(string $cartId, array $entry): bool
{
    try {
        $safe = gcv_waitlist_safe_cart_id($cartId);
    } catch (Throwable $e) {
        return false;
    }

    $email = strtolower(trim((string)($entry['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }

    $all = gcv_waitlist_read_all();
    $rows = $all[$safe] ?? [];
    if (!is_array($rows)) {
        $rows = [];
    }

    foreach ($rows as $row) {
        if (is_array($row) && strtolower((string)($row['email'] ?? '')) === $email) {
            return true;
        }
    }

    $rows[] = [
        'email' => $email,
        'locale' => in_array($entry['locale'] ?? 'pt', ['pt', 'en', 'es'], true) ? $entry['locale'] : 'pt',
        'destino' => mb_substr(trim((string)($entry['destino'] ?? '')), 0, 190),
        'date_label' => mb_substr(trim((string)($entry['date_label'] ?? '')), 0, 80),
        'date_iso' => mb_substr(trim((string)($entry['date_iso'] ?? '')), 0, 10),
        'created_at' => gmdate('c'),
    ];

    $all[$safe] = $rows;
    return gcv_waitlist_write_all($all);
}

/** @return list<array<string, mixed>> */
function gcv_waitlist_take_all(string $cartId): array
{
    try {
        $safe = gcv_waitlist_safe_cart_id($cartId);
    } catch (Throwable $e) {
        return [];
    }

    $all = gcv_waitlist_read_all();
    $rows = $all[$safe] ?? [];
    if (!is_array($rows) || count($rows) === 0) {
        return [];
    }

    unset($all[$safe]);
    gcv_waitlist_write_all($all);

    return array_values(array_filter($rows, static fn ($row) => is_array($row)));
}
