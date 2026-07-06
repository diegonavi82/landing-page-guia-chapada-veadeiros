<?php

declare(strict_types=1);

/**
 * Recibo Pix em HTML para e-mail (recover-by-email e similares).
 */

function gcv_pix_receipt_format_brl(float $amount): string
{
    return 'R$ ' . number_format($amount, 2, ',', '.');
}

/** @param array<string, mixed> $rec */
function gcv_build_pix_receipt_email_html(array $rec, string $locale): string
{
    $loc = in_array($locale, ['pt', 'en', 'es'], true) ? $locale : 'pt';
    $labels = [
        'pt' => [
            'docTitle' => 'RECIBO DE PAGAMENTO PIX',
            'introPaid' => 'Confirmamos o recebimento de {{amount}} via Pix referente à reserva {{code}}.',
            'introPending' => 'Reserva {{code}} registrada. Valor: {{amount}}. Aguardando confirmação do Pix.',
            'itinerary' => 'Itinerário',
            'colDate' => 'Data',
            'colDest' => 'Destino',
            'colGuide' => 'Guia',
            'colDeparture' => 'Saída',
            'colPeople' => 'Pessoas',
            'colTotal' => 'Total',
            'financial' => 'Resumo financeiro',
            'finTotal' => 'Valor total',
            'finReceived' => 'Recebido via Pix',
            'included' => 'Incluído',
            'excluded' => 'Não incluído',
            'inclDefault' => 'Passeio com guia local',
            'exclDefault' => 'Transporte, ingresso e almoço',
            'emitted' => 'Emitido em',
            'contact' => 'Contato',
            'confirm' => 'Ver confirmação',
            'lookup' => 'Consultar reserva',
        ],
        'en' => [
            'docTitle' => 'PIX PAYMENT RECEIPT',
            'introPaid' => 'We confirm receipt of {{amount}} via Pix for reservation {{code}}.',
            'introPending' => 'Reservation {{code}} registered. Amount: {{amount}}. Awaiting Pix confirmation.',
            'itinerary' => 'Itinerary',
            'colDate' => 'Date',
            'colDest' => 'Destination',
            'colGuide' => 'Guide',
            'colDeparture' => 'Meeting point',
            'colPeople' => 'People',
            'colTotal' => 'Total',
            'financial' => 'Payment summary',
            'finTotal' => 'Total',
            'finReceived' => 'Received via Pix',
            'included' => 'Included',
            'excluded' => 'Not included',
            'inclDefault' => 'Tour with local guide',
            'exclDefault' => 'Transport, admission and lunch',
            'emitted' => 'Issued on',
            'contact' => 'Contact',
            'confirm' => 'View confirmation',
            'lookup' => 'Look up reservation',
        ],
        'es' => [
            'docTitle' => 'RECIBO DE PAGO PIX',
            'introPaid' => 'Confirmamos la recepción de {{amount}} vía Pix para la reserva {{code}}.',
            'introPending' => 'Reserva {{code}} registrada. Valor: {{amount}}. Esperando confirmación del Pix.',
            'itinerary' => 'Itinerario',
            'colDate' => 'Fecha',
            'colDest' => 'Destino',
            'colGuide' => 'Guía',
            'colDeparture' => 'Salida',
            'colPeople' => 'Personas',
            'colTotal' => 'Total',
            'financial' => 'Resumen financiero',
            'finTotal' => 'Valor total',
            'finReceived' => 'Recibido vía Pix',
            'included' => 'Incluido',
            'excluded' => 'No incluido',
            'inclDefault' => 'Paseo con guía local',
            'exclDefault' => 'Transporte, entrada y almuerzo',
            'emitted' => 'Emitido el',
            'contact' => 'Contacto',
            'confirm' => 'Ver confirmación',
            'lookup' => 'Consultar reserva',
        ],
    ];
    $L = $labels[$loc];
    $code = gcv_pix_safe_id((string)($rec['reservation_id'] ?? ''));
    $amount = (float)($rec['amount'] ?? 0);
    $st = gcv_pix_effective_status($rec);
    $trips = is_array($rec['trips'] ?? null) ? $rec['trips'] : [];
    $incl = [];
    $excl = [];
    $ie = $rec['incl_excl'] ?? $rec['inclExcl'] ?? null;
    if (is_array($ie)) {
        $incl = is_array($ie['incl'] ?? null) ? $ie['incl'] : [];
        $excl = is_array($ie['excl'] ?? null) ? $ie['excl'] : [];
    }
    if (!$incl) {
        $incl = [$L['inclDefault']];
    }
    if (!$excl) {
        $excl = [$L['exclDefault']];
    }
    $introTpl = $st === 'PAID' ? $L['introPaid'] : $L['introPending'];
    $intro = str_replace(
        ['{{amount}}', '{{code}}'],
        [gcv_pix_receipt_format_brl($amount), $code],
        $introTpl
    );
    $emitted = (new DateTimeImmutable('now'))->format($loc === 'en' ? 'm/d/Y' : 'd/m/Y');

    $tripRows = '';
    foreach ($trips as $t) {
        if (!is_array($t)) {
            continue;
        }
        $qty = max(1, (int)($t['qty'] ?? 1));
        $unit = (int)($t['valorUnit'] ?? $amount);
        $dep = trim((string)($t['embarque'] ?? '') . ((isset($t['hora']) && $t['hora'] !== '') ? ' · ' . $t['hora'] : ''));
        $tripRows .= '<tr>'
            . '<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">' . htmlspecialchars((string)($t['dateLabel'] ?? $t['dateShort'] ?? $t['dateIso'] ?? '—'), ENT_QUOTES, 'UTF-8') . '</td>'
            . '<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">' . htmlspecialchars((string)($t['destino'] ?? '—'), ENT_QUOTES, 'UTF-8') . '</td>'
            . '<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">' . htmlspecialchars((string)($t['guiaNome'] ?? '—'), ENT_QUOTES, 'UTF-8') . '</td>'
            . '<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">' . htmlspecialchars($dep !== '' ? $dep : '—', ENT_QUOTES, 'UTF-8') . '</td>'
            . '<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:center;">' . htmlspecialchars((string)$qty, ENT_QUOTES, 'UTF-8') . '</td>'
            . '<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">' . htmlspecialchars(gcv_pix_receipt_format_brl($unit * $qty), ENT_QUOTES, 'UTF-8') . '</td>'
            . '</tr>';
    }
    if ($tripRows === '') {
        $tripRows = '<tr><td colspan="6" style="padding:8px;color:#64748b;">—</td></tr>';
    }

    $inclHtml = '';
    foreach ($incl as $item) {
        $inclHtml .= '<li>' . htmlspecialchars((string)$item, ENT_QUOTES, 'UTF-8') . '</li>';
    }
    $exclHtml = '';
    foreach ($excl as $item) {
        $exclHtml .= '<li>' . htmlspecialchars((string)$item, ENT_QUOTES, 'UTF-8') . '</li>';
    }

    $received = $st === 'PAID' ? gcv_pix_receipt_format_brl($amount) : gcv_pix_receipt_format_brl(0);
    $receivedLabel = $st === 'PAID' ? $L['finReceived'] : $L['finTotal'];

    $body = '<div style="max-width:640px;margin:0 auto;padding:20px 24px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;font-family:Inter,Arial,sans-serif;color:#0f172a;">'
        . '<h1 style="margin:0 0 8px;font-size:16px;color:#064e3b;">' . htmlspecialchars($L['docTitle'], ENT_QUOTES, 'UTF-8') . '</h1>'
        . '<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#334155;">' . htmlspecialchars($intro, ENT_QUOTES, 'UTF-8') . '</p>'
        . '<h2 style="margin:0 0 8px;font-size:13px;color:#064e3b;">' . htmlspecialchars($L['itinerary'], ENT_QUOTES, 'UTF-8') . '</h2>'
        . '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:0 0 16px;"><thead><tr style="background:#f8fafc;">'
        . '<th style="padding:6px 8px;text-align:left;">' . htmlspecialchars($L['colDate'], ENT_QUOTES, 'UTF-8') . '</th>'
        . '<th style="padding:6px 8px;text-align:left;">' . htmlspecialchars($L['colDest'], ENT_QUOTES, 'UTF-8') . '</th>'
        . '<th style="padding:6px 8px;text-align:left;">' . htmlspecialchars($L['colGuide'], ENT_QUOTES, 'UTF-8') . '</th>'
        . '<th style="padding:6px 8px;text-align:left;">' . htmlspecialchars($L['colDeparture'], ENT_QUOTES, 'UTF-8') . '</th>'
        . '<th style="padding:6px 8px;text-align:center;">' . htmlspecialchars($L['colPeople'], ENT_QUOTES, 'UTF-8') . '</th>'
        . '<th style="padding:6px 8px;text-align:right;">' . htmlspecialchars($L['colTotal'], ENT_QUOTES, 'UTF-8') . '</th>'
        . '</tr></thead><tbody>' . $tripRows . '</tbody></table>'
        . '<div style="margin:0 0 16px;padding:12px;background:#f8fafc;border-radius:8px;">'
        . '<p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#064e3b;">' . htmlspecialchars($L['financial'], ENT_QUOTES, 'UTF-8') . '</p>'
        . '<p style="margin:0 0 4px;font-size:12px;"><span>' . htmlspecialchars($L['finTotal'], ENT_QUOTES, 'UTF-8') . ':</span> <strong>' . htmlspecialchars(gcv_pix_receipt_format_brl($amount), ENT_QUOTES, 'UTF-8') . '</strong></p>'
        . '<p style="margin:0;font-size:12px;"><span>' . htmlspecialchars($receivedLabel, ENT_QUOTES, 'UTF-8') . ':</span> <strong>' . htmlspecialchars($received, ENT_QUOTES, 'UTF-8') . '</strong></p></div>'
        . '<div style="margin:0 0 16px;padding:12px;background:#f8fafc;border-radius:8px;">'
        . '<p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#065f46;">' . htmlspecialchars($L['included'], ENT_QUOTES, 'UTF-8') . '</p>'
        . '<ul style="margin:0 0 8px;padding:0 0 0 16px;font-size:11px;color:#065f46;">' . $inclHtml . '</ul>'
        . '<p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#991b1b;">' . htmlspecialchars($L['excluded'], ENT_QUOTES, 'UTF-8') . '</p>'
        . '<ul style="margin:0;padding:0 0 0 16px;font-size:11px;color:#991b1b;">' . $exclHtml . '</ul></div>'
        . '<p style="margin:0;font-size:11px;color:#64748b;">' . htmlspecialchars($L['emitted'], ENT_QUOTES, 'UTF-8') . ': ' . htmlspecialchars($emitted, ENT_QUOTES, 'UTF-8') . ' · ' . htmlspecialchars($L['contact'], ENT_QUOTES, 'UTF-8') . ': +55 62 98250-6891</p></div>';

    $appUrl = rtrim((string)($_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com'), '/');
    $lookupBase = $loc === 'en' ? '/en/consultar-reserva.html' : ($loc === 'es' ? '/es/consultar-reserva.html' : '/consultar-reserva.html');
    $confirmBase = $loc === 'en' ? '/en/confirmacao.html' : ($loc === 'es' ? '/es/confirmacao.html' : '/confirmacao.html');
    $buyerEmail = trim((string)($rec['email'] ?? $rec['buyer_email'] ?? ''));
    $lookupUrl = $appUrl . $lookupBase . '?id=' . rawurlencode($code);
    if ($buyerEmail !== '') {
        $lookupUrl .= '&email=' . rawurlencode($buyerEmail) . '&auto=1';
    }
    $confirmUrl = $appUrl . $confirmBase . '?id=' . rawurlencode($code);

    $footer = '<div style="max-width:640px;margin:24px auto 0;padding:16px 20px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;">'
        . '<p style="margin:0;">'
        . '<a href="' . htmlspecialchars($confirmUrl, ENT_QUOTES, 'UTF-8') . '" style="display:inline-block;margin:0 8px 6px 0;padding:10px 14px;background:#064e3b;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">'
        . htmlspecialchars($L['confirm'], ENT_QUOTES, 'UTF-8') . '</a>'
        . '<a href="' . htmlspecialchars($lookupUrl, ENT_QUOTES, 'UTF-8') . '" style="display:inline-block;margin:0 0 6px;padding:10px 14px;background:#fff;color:#064e3b;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;border:2px solid #064e3b;">'
        . htmlspecialchars($L['lookup'], ENT_QUOTES, 'UTF-8') . '</a></p></div>';

    return '<!DOCTYPE html><html lang="' . htmlspecialchars($loc, ENT_QUOTES, 'UTF-8') . '"><head><meta charset="utf-8"></head>'
        . '<body style="margin:0;padding:24px 16px;background:#f5f5f5;">' . $body . $footer . '</body></html>';
}

function gcv_pix_receipt_email_subject(string $code, string $locale): string
{
    $prefix = match ($locale) {
        'en' => 'Pix receipt — Reservation ',
        'es' => 'Recibo Pix — Reserva ',
        default => 'Recibo Pix — Reserva ',
    };
    return $prefix . strtoupper(trim($code));
}
