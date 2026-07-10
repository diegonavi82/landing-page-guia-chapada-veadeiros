<?php

declare(strict_types=1);

/**
 * Recibo Pix em HTML para e-mail (recover-by-email e similares).
 */

function gcv_pix_receipt_format_brl(float $amount): string
{
    return 'R$ ' . number_format($amount, 2, ',', '.');
}

/** @param array<string, mixed> $t */
function gcv_pix_trip_date_label(array $t): string
{
    $short = trim((string)($t['dateShort'] ?? ''));
    if ($short !== '' && preg_match('/^\d{1,2}\/\d{1,2}\/\d{4}$/', $short)) {
        return $short;
    }
    $iso = trim((string)($t['dateIso'] ?? $t['dateISO'] ?? ''));
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $iso, $m)) {
        return $m[3] . '/' . $m[2] . '/' . $m[1];
    }
    $day = trim((string)($t['dayNum'] ?? ''));
    $month = trim((string)($t['monthName'] ?? ''));
    if ($day !== '' && $month !== '') {
        $year = preg_match('/^(\d{4})/', $iso, $ym) ? $ym[1] : date('Y');
        return $day . ' de ' . $month . '/' . $year;
    }
    $label = trim((string)($t['dateLabel'] ?? ''));
    if ($label !== '' && !preg_match('/teste\s*pix|pix\s*test/i', $label)) {
        return $label;
    }
    return $short !== '' ? $short : '—';
}

/** @param array<string, mixed> $t */
function gcv_pix_trip_destino(array $t): string
{
    $dest = trim((string)($t['destino'] ?? ''));
    $dest = preg_replace('/^\s*(TESTE\s*PIX|PIX\s*TEST|PRUEBA\s*PIX)\s*[-:]\s*/iu', '', $dest) ?? $dest;
    $dest = preg_replace('/^\s*(TESTE\s*PIX|PIX\s*TEST|PRUEBA\s*PIX)\s+/iu', '', $dest) ?? $dest;
    return $dest !== '' ? $dest : '—';
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
        $weekday = trim((string)($t['weekday'] ?? ''));
        $dateCell = gcv_pix_trip_date_label($t);
        if ($weekday !== '') {
            $dateCell .= ' · ' . $weekday;
        }
        $tripRows .= '<tr>'
            . '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;">' . htmlspecialchars($dateCell, ENT_QUOTES, 'UTF-8') . '</td>'
            . '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;">' . htmlspecialchars(gcv_pix_trip_destino($t), ENT_QUOTES, 'UTF-8') . '</td>'
            . '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;">' . htmlspecialchars((string)($t['guiaNome'] ?? '—'), ENT_QUOTES, 'UTF-8') . '</td>'
            . '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;">' . htmlspecialchars($dep !== '' ? $dep : '—', ENT_QUOTES, 'UTF-8') . '</td>'
            . '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:12px;">' . htmlspecialchars((string)$qty, ENT_QUOTES, 'UTF-8') . '</td>'
            . '<td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:12px;font-weight:700;">' . htmlspecialchars(gcv_pix_receipt_format_brl($unit * $qty), ENT_QUOTES, 'UTF-8') . '</td>'
            . '</tr>';
    }
    if ($tripRows === '') {
        $tripRows = '<tr><td colspan="6" style="padding:8px;color:#64748b;">—</td></tr>';
    }

    $inclHtml = '';
    foreach ($incl as $item) {
        $inclHtml .= '<li style="margin:0 0 4px;">' . htmlspecialchars((string)$item, ENT_QUOTES, 'UTF-8') . '</li>';
    }
    $exclHtml = '';
    foreach ($excl as $item) {
        $exclHtml .= '<li style="margin:0 0 4px;">' . htmlspecialchars((string)$item, ENT_QUOTES, 'UTF-8') . '</li>';
    }

    $received = $st === 'PAID' ? gcv_pix_receipt_format_brl($amount) : gcv_pix_receipt_format_brl(0);
    $receivedLabel = $st === 'PAID' ? $L['finReceived'] : $L['finTotal'];

    $body = '<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #d7e2db;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">'
        . '<div style="background:#0f3d2e;padding:22px 24px;">'
        . '<p style="margin:0 0 4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#a7f3d0;">Código</p>'
        . '<p style="margin:0 0 10px;font-size:22px;font-weight:800;color:#fff;">' . htmlspecialchars($code, ENT_QUOTES, 'UTF-8') . '</p>'
        . '<h1 style="margin:0;font-size:18px;color:#fff;">' . htmlspecialchars($L['docTitle'], ENT_QUOTES, 'UTF-8') . '</h1></div>'
        . '<div style="padding:22px 24px;">'
        . '<p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:#334155;">' . htmlspecialchars($intro, ENT_QUOTES, 'UTF-8') . '</p>'
        . '<h2 style="margin:0 0 8px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#064e3b;">' . htmlspecialchars($L['itinerary'], ENT_QUOTES, 'UTF-8') . '</h2>'
        . '<table style="width:100%;border-collapse:collapse;margin:0 0 16px;border:1px solid #0f3d2e;"><thead><tr style="background:#0f3d2e;color:#fff;">'
        . '<th style="padding:10px 8px;text-align:left;font-size:11px;">' . htmlspecialchars($L['colDate'], ENT_QUOTES, 'UTF-8') . '</th>'
        . '<th style="padding:10px 8px;text-align:left;font-size:11px;">' . htmlspecialchars($L['colDest'], ENT_QUOTES, 'UTF-8') . '</th>'
        . '<th style="padding:10px 8px;text-align:left;font-size:11px;">' . htmlspecialchars($L['colGuide'], ENT_QUOTES, 'UTF-8') . '</th>'
        . '<th style="padding:10px 8px;text-align:left;font-size:11px;">' . htmlspecialchars($L['colDeparture'], ENT_QUOTES, 'UTF-8') . '</th>'
        . '<th style="padding:10px 8px;text-align:center;font-size:11px;">' . htmlspecialchars($L['colPeople'], ENT_QUOTES, 'UTF-8') . '</th>'
        . '<th style="padding:10px 8px;text-align:right;font-size:11px;">' . htmlspecialchars($L['colTotal'], ENT_QUOTES, 'UTF-8') . '</th>'
        . '</tr></thead><tbody>' . $tripRows . '</tbody></table>'
        . '<div style="margin:0 0 16px;padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">'
        . '<p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#064e3b;">' . htmlspecialchars($L['financial'], ENT_QUOTES, 'UTF-8') . '</p>'
        . '<p style="margin:0 0 4px;font-size:13px;"><span>' . htmlspecialchars($L['finTotal'], ENT_QUOTES, 'UTF-8') . ':</span> <strong>' . htmlspecialchars(gcv_pix_receipt_format_brl($amount), ENT_QUOTES, 'UTF-8') . '</strong></p>'
        . '<p style="margin:0;font-size:13px;"><span>' . htmlspecialchars($receivedLabel, ENT_QUOTES, 'UTF-8') . ':</span> <strong>' . htmlspecialchars($received, ENT_QUOTES, 'UTF-8') . '</strong></p></div>'
        . '<div style="margin:0 0 16px;padding:14px;background:#f8fafc;border-radius:12px;">'
        . '<p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#065f46;">' . htmlspecialchars($L['included'], ENT_QUOTES, 'UTF-8') . '</p>'
        . '<ul style="margin:0 0 8px;padding:0 0 0 16px;font-size:12px;color:#065f46;">' . $inclHtml . '</ul>'
        . '<p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#991b1b;">' . htmlspecialchars($L['excluded'], ENT_QUOTES, 'UTF-8') . '</p>'
        . '<ul style="margin:0;padding:0 0 0 16px;font-size:12px;color:#991b1b;">' . $exclHtml . '</ul></div>'
        . '<p style="margin:0;font-size:11px;color:#64748b;">' . htmlspecialchars($L['emitted'], ENT_QUOTES, 'UTF-8') . ': ' . htmlspecialchars($emitted, ENT_QUOTES, 'UTF-8') . ' · ' . htmlspecialchars($L['contact'], ENT_QUOTES, 'UTF-8') . ': +55 62 98250-6891</p></div></div>';

    $appUrl = rtrim((string)($_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com'), '/');
    $lookupBase = $loc === 'en' ? '/en/consultar-reserva.html' : ($loc === 'es' ? '/es/consultar-reserva.html' : '/consultar-reserva.html');
    $confirmBase = $loc === 'en' ? '/en/confirmacao.html' : ($loc === 'es' ? '/es/confirmacao.html' : '/confirmacao.html');
    $buyerEmail = trim((string)($rec['email'] ?? $rec['buyer_email'] ?? ''));
    $lookupUrl = $appUrl . $lookupBase . '?id=' . rawurlencode($code);
    if ($buyerEmail !== '') {
        $lookupUrl .= '&email=' . rawurlencode($buyerEmail) . '&auto=1';
    }
    $confirmUrl = $appUrl . $confirmBase . '?id=' . rawurlencode($code);

    $footer = '<div style="max-width:640px;margin:24px auto 0;padding:16px 20px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;">'
        . '<p style="margin:0;">'
        . '<a href="' . htmlspecialchars($confirmUrl, ENT_QUOTES, 'UTF-8') . '" style="display:inline-block;margin:0 8px 6px 0;padding:10px 14px;background:#064e3b;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">'
        . htmlspecialchars($L['confirm'], ENT_QUOTES, 'UTF-8') . '</a>'
        . '<a href="' . htmlspecialchars($lookupUrl, ENT_QUOTES, 'UTF-8') . '" style="display:inline-block;margin:0 0 6px;padding:10px 14px;background:#fff;color:#064e3b;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;border:2px solid #064e3b;">'
        . htmlspecialchars($L['lookup'], ENT_QUOTES, 'UTF-8') . '</a></p></div>';

    return '<!DOCTYPE html><html lang="' . htmlspecialchars($loc, ENT_QUOTES, 'UTF-8') . '"><head><meta charset="utf-8"></head>'
        . '<body style="margin:0;padding:24px 16px;background:#eef2f0;">' . $body . $footer . '</body></html>';
}

function gcv_pix_receipt_email_subject(string $code, string $locale): string
{
    return strtoupper(trim($code)) . ' - Reserva';
}
