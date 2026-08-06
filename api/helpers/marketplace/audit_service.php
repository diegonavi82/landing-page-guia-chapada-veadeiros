<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../marketplace_schema.php';

/**
 * Auditoria imutável de alterações.
 */
function gcv_audit_client_ip(): ?string
{
    $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    if (is_string($ip) && str_contains($ip, ',')) {
        $ip = trim(explode(',', $ip)[0]);
    }
    return is_string($ip) && $ip !== '' ? substr($ip, 0, 45) : null;
}

/**
 * @param array<string,mixed>|null $meta
 */
function gcv_audit_log(
    string $entityType,
    string|int $entityId,
    string $action,
    ?int $userId = null,
    ?string $fieldName = null,
    mixed $oldValue = null,
    mixed $newValue = null,
    ?string $origin = null,
    ?array $meta = null
): void {
    gcv_marketplace_ensure_schema();
    try {
        $stmt = db()->prepare(
            'INSERT INTO gcv_audit_log
             (entity_type, entity_id, action, field_name, old_value, new_value, user_id, ip, origin, meta_json)
             VALUES (?,?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            substr($entityType, 0, 80),
            substr((string)$entityId, 0, 64),
            substr($action, 0, 80),
            $fieldName !== null ? substr($fieldName, 0, 120) : null,
            gcv_audit_stringify($oldValue),
            gcv_audit_stringify($newValue),
            $userId,
            gcv_audit_client_ip(),
            $origin !== null ? substr($origin, 0, 40) : null,
            $meta !== null ? json_encode($meta, JSON_UNESCAPED_UNICODE) : null,
        ]);
    } catch (Throwable $e) {
        error_log('gcv_audit_log: ' . $e->getMessage());
    }
}

/**
 * Registra diffs campo a campo entre dois arrays.
 *
 * @param array<string,mixed> $before
 * @param array<string,mixed> $after
 * @param list<string>|null $fields null = todas as chaves de $after
 */
function gcv_audit_diff(
    string $entityType,
    string|int $entityId,
    array $before,
    array $after,
    ?int $userId,
    ?string $origin,
    ?array $fields = null
): void {
    $keys = $fields ?? array_unique(array_merge(array_keys($before), array_keys($after)));
    foreach ($keys as $key) {
        $old = $before[$key] ?? null;
        $new = $after[$key] ?? null;
        if ((string)gcv_audit_stringify($old) === (string)gcv_audit_stringify($new)) {
            continue;
        }
        gcv_audit_log($entityType, $entityId, 'field_change', $userId, (string)$key, $old, $new, $origin);
    }
}

function gcv_audit_stringify(mixed $value): ?string
{
    if ($value === null) {
        return null;
    }
    if (is_bool($value)) {
        return $value ? '1' : '0';
    }
    if (is_scalar($value)) {
        return (string)$value;
    }
    $json = json_encode($value, JSON_UNESCAPED_UNICODE);
    return $json === false ? null : $json;
}
