<?php

declare(strict_types=1);

/**
 * Avisos ao admin após compra Pix confirmada (e-mail + WhatsApp quando configurado).
 */

require_once __DIR__ . '/mailer.php';
// Carrega SMTP_* / PURCHASE_NOTIFY_* de api/.env (sem abrir conexão MySQL).
require_once __DIR__ . '/db.php';

/** @return list<string> */
function gcv_admin_notify_emails(): array
{
    $raw = '';

    $envList = trim((string)($_ENV['PURCHASE_NOTIFY_EMAILS'] ?? ''));
    $envOne = trim((string)($_ENV['PURCHASE_NOTIFY_EMAIL'] ?? ''));
    if ($envList !== '') {
        $raw = $envList;
    } elseif ($envOne !== '') {
        $raw = $envOne;
    }

    $cfgPath = dirname(__DIR__) . '/config.local.php';
    if ($raw === '' && is_readable($cfgPath)) {
        $cfg = require $cfgPath;
        if (is_array($cfg)) {
            if (!empty($cfg['purchase_notify_emails']) && is_array($cfg['purchase_notify_emails'])) {
                $raw = implode(',', array_map('strval', $cfg['purchase_notify_emails']));
            } elseif (!empty($cfg['purchase_notify_email'])) {
                $raw = trim((string)$cfg['purchase_notify_email']);
            }
        }
    }

    if ($raw === '') {
        $raw = 'diegonavi82@gmail.com,contato@guiachapadaveadeiros.com';
    }

    $out = [];
    foreach (preg_split('/[,;\s]+/', $raw) ?: [] as $part) {
        $email = strtolower(trim((string)$part));
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) && !in_array($email, $out, true)) {
            $out[] = $email;
        }
    }

    if (!$out) {
        $out = ['diegonavi82@gmail.com', 'contato@guiachapadaveadeiros.com'];
    }

    return $out;
}

/** @deprecated Use gcv_admin_notify_emails() */
function gcv_admin_notify_email(): string
{
    $emails = gcv_admin_notify_emails();
    return $emails[0] ?? 'diegonavi82@gmail.com';
}

function gcv_admin_whatsapp_phone(): string
{
    $phone = preg_replace('/\D+/', '', (string)($_ENV['PURCHASE_NOTIFY_WHATSAPP'] ?? $_ENV['WHATSAPP_PHONE_E164'] ?? '5562982506891')) ?? '';
    if ($phone === '') {
        $phone = '5562982506891';
    }
    return $phone;
}

/** @param array<string, mixed> $t */
function gcv_purchase_clean_destino(array $t): string
{
    $dest = trim((string)($t['destino'] ?? ''));
    $dest = preg_replace('/^\s*(TESTE\s*PIX|PIX\s*TEST|PRUEBA\s*PIX)\s*[-:]\s*/iu', '', $dest) ?? $dest;
    $dest = preg_replace('/^\s*(TESTE\s*PIX|PIX\s*TEST|PRUEBA\s*PIX)\s+/iu', '', $dest) ?? $dest;
    return trim($dest);
}

/** @param array<string, mixed> $t */
function gcv_purchase_trip_date(array $t): string
{
    $date = trim((string)($t['dateShort'] ?? $t['dateLabel'] ?? ''));
    if ($date !== '') {
        return $date;
    }
    $iso = trim((string)($t['dateIso'] ?? $t['dateISO'] ?? ''));
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $iso, $m)) {
        return $m[3] . '/' . $m[2];
    }
    if (!empty($t['dayNum']) && !empty($t['monthName'])) {
        return trim((string)$t['dayNum'] . ' de ' . (string)$t['monthName']);
    }
    return '';
}

/** @param array<string, mixed> $rec */
function gcv_purchase_total_people(array $rec): int
{
    $trips = is_array($rec['trips'] ?? null) ? $rec['trips'] : [];
    $n = 0;
    foreach ($trips as $t) {
        if (!is_array($t)) {
            continue;
        }
        $n += max(1, (int)($t['qty'] ?? 1));
    }
    return max(1, $n);
}

/** @param array<string, mixed> $rec */
function gcv_purchase_trip_lines(array $rec): string
{
    $trips = is_array($rec['trips'] ?? null) ? $rec['trips'] : [];
    $lines = [];
    foreach ($trips as $t) {
        if (!is_array($t)) {
            continue;
        }
        $date = gcv_purchase_trip_date($t);
        $dest = gcv_purchase_clean_destino($t);
        $qty = max(1, (int)($t['qty'] ?? 1));
        $hora = trim((string)($t['hora'] ?? $t['time'] ?? ''));
        $embarque = trim((string)($t['embarque'] ?? $t['boarding'] ?? ''));
        $parts = array_filter([
            $date !== '' ? $date : null,
            $dest !== '' ? $dest : null,
            $hora !== '' ? ('horário ' . $hora) : null,
            $embarque !== '' ? ('embarque ' . $embarque) : null,
            $qty . ' PAX',
        ]);
        if ($parts) {
            $lines[] = '• ' . implode(' · ', $parts);
        }
    }
    return $lines ? implode("\n", $lines) : '• (sem detalhes do passeio)';
}

/**
 * Assunto: RESERVA - DATA: <Nome passeio> <Número de pessoas> <VALOR>
 *
 * @param array<string, mixed> $rec
 */
function gcv_purchase_email_subject(array $rec): string
{
    $trips = is_array($rec['trips'] ?? null) ? $rec['trips'] : [];
    $dates = [];
    $names = [];
    foreach ($trips as $t) {
        if (!is_array($t)) {
            continue;
        }
        $date = gcv_purchase_trip_date($t);
        if ($date !== '' && !in_array($date, $dates, true)) {
            $dates[] = $date;
        }
        $dest = gcv_purchase_clean_destino($t);
        if ($dest !== '' && !in_array($dest, $names, true)) {
            $names[] = $dest;
        }
    }

    $datePart = $dates ? implode(' + ', $dates) : 'SEM DATA';
    $namePart = $names ? implode(' / ', $names) : 'Passeio';
    $people = gcv_purchase_total_people($rec);
    $amount = (float)($rec['amount'] ?? 0);
    $brl = 'R$' . number_format($amount, 2, ',', '.');

    return 'RESERVA (' . $people . ' PAX) - ' . $datePart . ': ' . $namePart . ' ' . $brl;
}

/** @param array<string, mixed> $rec */
function gcv_purchase_notify_message(array $rec): string
{
    $code = strtoupper(trim((string)($rec['reservation_id'] ?? '')));
    $amount = (float)($rec['amount'] ?? 0);
    $buyer = trim((string)($rec['email'] ?? $rec['buyer_email'] ?? ''));
    $buyerPhone = trim((string)($rec['phone'] ?? $rec['telefone'] ?? $rec['buyer_phone'] ?? ''));
    $brl = 'R$ ' . number_format($amount, 2, ',', '.');
    $people = gcv_purchase_total_people($rec);
    $msg = "🛒 Nova reserva confirmada\n\n";
    $msg .= "Código: {$code}\n";
    $msg .= "Valor: {$brl}\n";
    $msg .= "Pessoas: {$people} PAX\n";
    if ($buyer !== '') {
        $msg .= "E-mail: {$buyer}\n";
    }
    if ($buyerPhone !== '') {
        $msg .= "Telefone: {$buyerPhone}\n";
    }
    $paidAt = trim((string)($rec['paid_at'] ?? ''));
    if ($paidAt !== '') {
        $msg .= "Pago em: {$paidAt}\n";
    }
    $msg .= "\nPasseios:\n" . gcv_purchase_trip_lines($rec);
    return $msg;
}

/**
 * @param list<string> $items
 */
function gcv_purchase_list_html(array $items): string
{
    if (!$items) {
        return '<p style="margin:0;color:#64748b;">—</p>';
    }
    $lis = '';
    foreach ($items as $item) {
        $lis .= '<li style="margin:0 0 4px;">' . htmlspecialchars((string)$item, ENT_QUOTES, 'UTF-8') . '</li>';
    }
    return '<ul style="margin:0;padding-left:18px;">' . $lis . '</ul>';
}

/** @param array<string, mixed> $rec */
function gcv_purchase_email_body_html(array $rec): string
{
    $code = strtoupper(trim((string)($rec['reservation_id'] ?? '')));
    $amount = (float)($rec['amount'] ?? 0);
    $brl = 'R$ ' . number_format($amount, 2, ',', '.');
    $buyer = trim((string)($rec['email'] ?? $rec['buyer_email'] ?? ''));
    $buyerPhone = trim((string)($rec['phone'] ?? $rec['telefone'] ?? $rec['buyer_phone'] ?? ''));
    $locale = trim((string)($rec['locale'] ?? 'pt'));
    $status = strtoupper(trim((string)($rec['status'] ?? 'PAID')));
    $txid = trim((string)($rec['txid'] ?? ''));
    $pixMode = trim((string)($rec['pix_mode'] ?? ''));
    $paidAt = trim((string)($rec['paid_at'] ?? ''));
    $paidSource = trim((string)($rec['paid_source'] ?? ''));
    $createdAt = trim((string)($rec['created_at'] ?? ''));
    $ip = trim((string)($rec['ip'] ?? ''));
    $people = gcv_purchase_total_people($rec);
    $tripHtml = nl2br(htmlspecialchars(gcv_purchase_trip_lines($rec), ENT_QUOTES, 'UTF-8'));

    $incl = [];
    $excl = [];
    $inclExcl = is_array($rec['incl_excl'] ?? null) ? $rec['incl_excl'] : [];
    if (is_array($inclExcl['incl'] ?? null)) {
        $incl = array_values(array_filter(array_map('strval', $inclExcl['incl'])));
    }
    if (is_array($inclExcl['excl'] ?? null)) {
        $excl = array_values(array_filter(array_map('strval', $inclExcl['excl'])));
    }

    $packagesHtml = '';
    if (is_array($rec['packages'] ?? null) && $rec['packages']) {
        $pkgLines = [];
        foreach ($rec['packages'] as $pkg) {
            if (!is_array($pkg)) {
                continue;
            }
            $label = trim((string)($pkg['label'] ?? $pkg['name'] ?? $pkg['title'] ?? json_encode($pkg, JSON_UNESCAPED_UNICODE)));
            if ($label !== '') {
                $pkgLines[] = $label;
            }
        }
        if ($pkgLines) {
            $packagesHtml =
                '<p style="margin:12px 0 4px;"><strong>Pacotes / extras:</strong></p>' .
                gcv_purchase_list_html($pkgLines);
        }
    }

    $row = static function (string $label, string $value): string {
        if ($value === '') {
            return '';
        }
        return (
            '<tr>' .
            '<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#64748b;width:160px;vertical-align:top;">' .
            htmlspecialchars($label, ENT_QUOTES, 'UTF-8') .
            '</td>' .
            '<td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#0f172a;vertical-align:top;">' .
            htmlspecialchars($value, ENT_QUOTES, 'UTF-8') .
            '</td></tr>'
        );
    };

    return (
        '<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">' .
        '<h2 style="margin:0 0 12px;color:#0f3d2e;">Reserva confirmada no site</h2>' .
        '<table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px;">' .
        $row('Código', $code) .
        $row('Status', $status) .
        $row('Valor total', $brl) .
        $row('Nº de pessoas', $people . ' PAX') .
        $row('E-mail do cliente', $buyer) .
        $row('Telefone do cliente', $buyerPhone) .
        $row('Idioma', $locale) .
        $row('Pago em', $paidAt) .
        $row('Origem do pagamento', $paidSource) .
        $row('TXID Pix', $txid) .
        $row('Modo Pix', $pixMode) .
        $row('Criada em', $createdAt) .
        $row('IP', $ip) .
        '</table>' .
        '<p style="margin:12px 0 4px;"><strong>Passeios:</strong></p>' .
        '<div style="margin:0 0 12px;padding:12px;background:#f8fafc;border-radius:8px;font-size:14px;line-height:1.5;">' .
        $tripHtml .
        '</div>' .
        ($incl
            ? '<p style="margin:12px 0 4px;"><strong>Incluso:</strong></p>' . gcv_purchase_list_html($incl)
            : '') .
        ($excl
            ? '<p style="margin:12px 0 4px;"><strong>Não incluso:</strong></p>' . gcv_purchase_list_html($excl)
            : '') .
        $packagesHtml .
        '<p style="margin:16px 0 0;font-size:12px;color:#64748b;">Aviso automático do site Guia Chapada Veadeiros.</p></div>'
    );
}

/**
 * Envia texto via API CallMeBot (opcional).
 * Configure em api/.env:
 *   CALLMEBOT_APIKEY=...
 *   CALLMEBOT_PHONE=5562982506891
 *
 * Cadastro: https://www.callmebot.com/blog/free-api-whatsapp-send-messages/
 */
function gcv_whatsapp_send_text(string $phone, string $text): bool
{
    $apiKey = trim((string)($_ENV['CALLMEBOT_APIKEY'] ?? ''));
    if ($apiKey === '') {
        return false;
    }
    $phone = preg_replace('/\D+/', '', $phone) ?? '';
    if ($phone === '') {
        return false;
    }
    $url =
        'https://api.callmebot.com/whatsapp.php?phone=' .
        rawurlencode($phone) .
        '&text=' .
        rawurlencode($text) .
        '&apikey=' .
        rawurlencode($apiKey);

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        if ($ch === false) {
            return false;
        }
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 8,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);
        $body = curl_exec($ch);
        $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return $http >= 200 && $http < 300 && $body !== false;
    }

    $ctx = stream_context_create(['http' => ['timeout' => 8]]);
    $body = @file_get_contents($url, false, $ctx);
    return $body !== false;
}

/** @param array<string, mixed> $rec */
function gcv_notify_admin_purchase(array $rec, bool $force = false): array
{
    $code = strtoupper(trim((string)($rec['reservation_id'] ?? '')));
    $out = [
        'email' => false,
        'emails' => [],
        'whatsapp' => false,
        'wa_link' => '',
        'skipped' => false,
    ];

    if ($code === '') {
        return $out;
    }

    if (!$force && !empty($rec['admin_notified_at'])) {
        $out['skipped'] = true;
        return $out;
    }

    $adminEmails = gcv_admin_notify_emails();
    $subject = gcv_purchase_email_subject($rec);
    $body = gcv_purchase_email_body_html($rec);
    $emailOk = false;
    $sentTo = [];

    foreach ($adminEmails as $adminEmail) {
        try {
            $ok = send_mail($adminEmail, $subject, $body);
            if ($ok) {
                $emailOk = true;
                $sentTo[] = $adminEmail;
            } else {
                error_log('purchase_notify email failed for ' . $adminEmail);
            }
        } catch (Throwable $e) {
            error_log('purchase_notify email (' . $adminEmail . '): ' . $e->getMessage());
        }
    }

    $out['email'] = $emailOk;
    $out['emails'] = $sentTo;

    $waText = gcv_purchase_notify_message($rec);
    $waPhone = gcv_admin_whatsapp_phone();
    $out['wa_link'] = 'https://wa.me/' . $waPhone . '?text=' . rawurlencode($waText);
    try {
        $out['whatsapp'] = gcv_whatsapp_send_text($waPhone, $waText);
    } catch (Throwable $e) {
        error_log('purchase_notify whatsapp: ' . $e->getMessage());
        $out['whatsapp'] = false;
    }

    $rec['admin_notified_at'] = gmdate('c');
    $rec['admin_notify'] = [
        'email' => $out['email'],
        'emails' => $out['emails'],
        'recipients' => $adminEmails,
        'subject' => $subject,
        'whatsapp' => $out['whatsapp'],
        'wa_link' => $out['wa_link'],
    ];
    if (function_exists('gcv_pix_write_reservation')) {
        gcv_pix_write_reservation($rec);
    }

    return $out;
}
