<?php
declare(strict_types=1);

/**
 * Interruptores do site público. Ausente ou diferente de 1 = desligado.
 * PASSEIOS_PUBLICOS=1  mostra compra, lista e menu de passeios.
 * PAGAMENTO_CARTAO=1   mostra cartão nacional e internacional. Sem isso, só Pix.
 */

function gcv_passeios_flag_ligado(): bool
{
    $v = strtolower(trim((string) ($_ENV['PASSEIOS_PUBLICOS'] ?? getenv('PASSEIOS_PUBLICOS') ?: '0')));
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
        if (!in_array('admin', $roles, true)) {
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

function gcv_cartao_visivel(): bool
{
    $v = strtolower(trim((string) ($_ENV['PAGAMENTO_CARTAO'] ?? getenv('PAGAMENTO_CARTAO') ?: '0')));
    return in_array($v, ['1', 'true', 'on', 'sim'], true);
}
