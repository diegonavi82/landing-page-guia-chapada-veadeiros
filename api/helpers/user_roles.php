<?php
declare(strict_types=1);

/**
 * Multi-papel: um e-mail pode ser admin + guia + cliente.
 * A sessão guarda active_role = porta de login usada.
 */

function gcv_auth_ensure_role_schema(): void
{
    static $done = false;
    if ($done) return;
    $done = true;
    $pdo = db();

    try {
        $pdo->exec(
            "CREATE TABLE IF NOT EXISTS gcv_user_roles (
              user_id INT UNSIGNED NOT NULL,
              role ENUM('admin','guide','client') NOT NULL,
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (user_id, role),
              INDEX idx_role (role)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
    } catch (Throwable $e) {
        // ignore
    }

    // Migrar role legado → gcv_user_roles
    try {
        $pdo->exec(
            "INSERT IGNORE INTO gcv_user_roles (user_id, role)
             SELECT id, role FROM gcv_users
             WHERE role IN ('admin','guide','client')"
        );
    } catch (Throwable $e) {
        // ignore
    }

    // active_role na sessão
    try {
        $cols = $pdo->query('SHOW COLUMNS FROM gcv_sessions')->fetchAll();
        $have = [];
        foreach ($cols as $c) {
            $have[strtolower((string)$c['Field'])] = true;
        }
        if (!isset($have['active_role'])) {
            $pdo->exec(
                "ALTER TABLE gcv_sessions ADD COLUMN active_role ENUM('admin','guide','client') NOT NULL DEFAULT 'client' AFTER user_id"
            );
        }
    } catch (Throwable $e) {
        // ignore
    }
}

/** @return list<string> */
function gcv_user_roles(int $userId): array
{
    gcv_auth_ensure_role_schema();
    $stmt = db()->prepare('SELECT role FROM gcv_user_roles WHERE user_id = ? ORDER BY role ASC');
    $stmt->execute([$userId]);
    $roles = [];
    foreach ($stmt->fetchAll() as $row) {
        $r = (string)($row['role'] ?? '');
        if ($r !== '' && !in_array($r, $roles, true)) {
            $roles[] = $r;
        }
    }
    if ($roles === []) {
        // fallback coluna legada
        $stmt = db()->prepare('SELECT role FROM gcv_users WHERE id = ?');
        $stmt->execute([$userId]);
        $legacy = (string)($stmt->fetchColumn() ?: '');
        if (in_array($legacy, ['admin', 'guide', 'client'], true)) {
            gcv_user_grant_role($userId, $legacy);
            return [$legacy];
        }
    }
    return $roles;
}

function gcv_user_has_role(int $userId, string $role): bool
{
    return in_array($role, gcv_user_roles($userId), true);
}

function gcv_user_grant_role(int $userId, string $role): void
{
    if (!in_array($role, ['admin', 'guide', 'client'], true)) return;
    gcv_auth_ensure_role_schema();
    db()->prepare('INSERT IGNORE INTO gcv_user_roles (user_id, role) VALUES (?,?)')->execute([$userId, $role]);
}

function gcv_user_revoke_role(int $userId, string $role): void
{
    if (!in_array($role, ['admin', 'guide', 'client'], true)) return;
    gcv_auth_ensure_role_schema();
    db()->prepare('DELETE FROM gcv_user_roles WHERE user_id = ? AND role = ?')->execute([$userId, $role]);
}

/**
 * Concede papéis e sincroniza gcv_users.role (papel "principal" para compat).
 * Prioridade do legado: admin > guide > client
 */
function gcv_user_sync_primary_role(int $userId): void
{
    $roles = gcv_user_roles($userId);
    $primary = 'client';
    if (in_array('admin', $roles, true)) $primary = 'admin';
    elseif (in_array('guide', $roles, true)) $primary = 'guide';
    elseif (in_array('client', $roles, true)) $primary = 'client';
    db()->prepare('UPDATE gcv_users SET role = ? WHERE id = ?')->execute([$primary, $userId]);
}

function gcv_normalize_login_context(?string $context): string
{
    $c = strtolower(trim((string)$context));
    return in_array($c, ['admin', 'guide', 'client'], true) ? $c : 'client';
}

/**
 * Pode entrar nesta porta?
 * @return string|null erro amigável ou null se ok
 */
function gcv_login_context_error(int $userId, string $context, string $accountStatus): ?string
{
    $context = gcv_normalize_login_context($context);
    $roles = gcv_user_roles($userId);

    if ($context === 'admin') {
        if (!in_array('admin', $roles, true)) {
            return 'Acesso restrito à administração. Use a conta admin ou peça permissão.';
        }
        return null;
    }

    if ($context === 'guide') {
        if (!in_array('guide', $roles, true)) {
            return 'Esta área é exclusiva para guias. Cadastre-se como guia ou use a Área do Cliente.';
        }
        // pending guide ainda entra (tela de análise)
        return null;
    }

    // client: concede client automaticamente se ainda não tiver (admin/guia também podem ser clientes)
    if (!in_array('client', $roles, true)) {
        gcv_user_grant_role($userId, 'client');
        gcv_user_sync_primary_role($userId);
    }
    return null;
}
