<?php
declare(strict_types=1);

/**
 * Interruptores do site público.
 * PASSEIOS_PUBLICOS ausente ou 1 = compra, lista e menu para todo mundo.
 * PASSEIOS_PUBLICOS=0 = só o admin logado vê (prévia).
 * PAGAMENTO_CARTAO=1  = cartão nacional e internacional para todo mundo.
 * Sem a flag do cartão, o público fica só no Pix. O admin da lista, logado, ainda paga nos dois cartões.
 */

function gcv_passeios_flag_ligado(): bool
{
    $raw = $_ENV['PASSEIOS_PUBLICOS'] ?? getenv('PASSEIOS_PUBLICOS');
    $v = strtolower(trim((string) ($raw === false || $raw === null || $raw === '' ? '1' : $raw)));
    return in_array($v, ['1', 'true', 'on', 'sim'], true);
}

/** Público vê passeios só com a flag. Sem ela, só o admin logado (prévia). */
function gcv_passeios_visiveis(): bool
{
    if (gcv_passeios_flag_ligado()) {
        return true;
    }
    return gcv_passeios_preview_do_admin();
}

function gcv_passeios_so_preview(): bool
{
    return !gcv_passeios_flag_ligado() && gcv_passeios_preview_do_admin();
}

function gcv_passeios_preview_do_admin(): bool
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }
    $cached = false;
    if (trim((string) ($_COOKIE['gcv_session'] ?? '')) === '') {
        return false;
    }
    try {
        if (!function_exists('current_user')) {
            require_once __DIR__ . '/auth.php';
        }
        if (!function_exists('gcv_is_admin_allowlisted')) {
            require_once __DIR__ . '/access_policy.php';
        }
        $user = current_user();
        if (!$user || (string) ($user['status'] ?? '') !== 'active') {
            return false;
        }
        $roles = $user['roles'] ?? [];
        $isAdmin = in_array('admin', $roles, true)
            || (string) ($user['role'] ?? '') === 'admin'
            || (string) ($user['active_role'] ?? '') === 'admin'
            || (string) ($user['primary_role'] ?? '') === 'admin';
        if (!$isAdmin) {
            return false;
        }
        if (!gcv_is_admin_allowlisted((string) ($user['email'] ?? ''))) {
            return false;
        }
        $cached = true;
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

function gcv_cartao_flag_ligado(): bool
{
    $v = strtolower(trim((string) ($_ENV['PAGAMENTO_CARTAO'] ?? getenv('PAGAMENTO_CARTAO') ?: '0')));
    return in_array($v, ['1', 'true', 'on', 'sim'], true);
}

/** Público paga no cartão só com a flag. Sem ela, só o admin logado. */
function gcv_cartao_visivel(): bool
{
    if (gcv_cartao_flag_ligado()) {
        return true;
    }
    return gcv_passeios_preview_do_admin();
}
