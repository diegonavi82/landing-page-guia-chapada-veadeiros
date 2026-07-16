<?php
declare(strict_types=1);

/**
 * Políticas temporárias de acesso (login / cadastro).
 * Ajuste aqui sem espalhar ifs pelo restante do código.
 */

if (!function_exists('gcv_normalize_login_context')) {
    require_once __DIR__ . '/user_roles.php';
}

/** Área do cliente (login + cadastro) — desligada por enquanto. */
function gcv_client_area_enabled(): bool
{
    return false;
}

/**
 * Emails autorizados a usar a porta Admin.
 * @return list<string>
 */
function gcv_admin_allowlist_emails(): array
{
    return [
        'diegonavi82@gmail.com',
    ];
}

function gcv_is_admin_allowlisted(string $email): bool
{
    $email = strtolower(trim($email));
    if ($email === '') {
        return false;
    }
    foreach (gcv_admin_allowlist_emails() as $allowed) {
        if ($email === strtolower(trim((string)$allowed))) {
            return true;
        }
    }
    return false;
}

/**
 * Mensagem de bloqueio (ou null se permitido) para um login/OAuth.
 */
function gcv_login_access_error(string $context, string $email): ?string
{
    $context = gcv_normalize_login_context($context);
    $email = strtolower(trim($email));

    if ($context === 'client') {
        if (!gcv_client_area_enabled()) {
            return 'Área do cliente temporariamente indisponível.';
        }
        return null;
    }

    if ($context === 'admin') {
        if (!gcv_is_admin_allowlisted($email)) {
            return 'Acesso à Área Admin restrito.';
        }
        return null;
    }

    // guide: permitido (cadastro fica pending até aprovação do admin)
    return null;
}
