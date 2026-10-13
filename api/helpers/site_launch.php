<?php
declare(strict_types=1);

/**
 * Interruptores do site público. Ausente ou diferente de 1 = desligado.
 * PASSEIOS_PUBLICOS=1  mostra compra, lista e menu de passeios.
 * PAGAMENTO_CARTAO=1   mostra cartão nacional e internacional. Sem isso, só Pix.
 */

function gcv_passeios_visiveis(): bool
{
    $v = strtolower(trim((string) ($_ENV['PASSEIOS_PUBLICOS'] ?? getenv('PASSEIOS_PUBLICOS') ?: '0')));
    return in_array($v, ['1', 'true', 'on', 'sim'], true);
}

function gcv_cartao_visivel(): bool
{
    $v = strtolower(trim((string) ($_ENV['PAGAMENTO_CARTAO'] ?? getenv('PAGAMENTO_CARTAO') ?: '0')));
    return in_array($v, ['1', 'true', 'on', 'sim'], true);
}
