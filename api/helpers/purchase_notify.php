<?php

declare(strict_types=1);

/**
 * Avisos ao admin após compra Pix confirmada (e-mail + WhatsApp quando configurado).
 */

require_once __DIR__ . '/mailer.php';

function gcv_admin_notify_email(): string
{
    $cfgEmail = '';
    $cfgPath = dirname(__DIR__) . '/config.local.php';
    if (is_readable($cfgPath)) {
        $cfg = require $cfgPath;
        if (is_array($cfg) && !empty($cfg['purchase_notify_email'])) {
            $cfgEmail = trim((string)$cfg['purchase_notify_email']);
        }
    }
    $envEmail = trim((string)($_ENV['PURCHASE_NOTIFY_EMAIL'] ?? ''));
    $email = $envEmail !== '' ? $envEmail : ($cfgEmail !== '' ? $cfgEmail : 'diogonavi82@gmail.com');
    return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : 'diogonavi82@gmail.com';
}

function gcv_admin_whatsapp_phone(): string
{
    $phone = preg_replace('/\D+/', '', (string)($_ENV['PURCHASE_NOTIFY_WHATSAPP'] ?? $_ENV['WHATSAPP_PHONE_E164'] ?? '5562982506891')) ?? '';
    if ($phone === '') {
        $phone = '5562982506891';
    }
    return $phone;
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
        $date = trim((string)($t['dateShort'] ?? $t['dateLabel'] ?? $t['dateIso'] ?? $t['dateISO'] ?? ''));
        if ($date === '' && !empty($t['dayNum']) && !empty($t['monthName'])) {
            $date = trim((string)$t['dayNum'] . ' de ' . (string)$t['monthName']);
        }
        $dest = trim((string)($t['destino'] ?? ''));
        $dest = preg_replace('/^\s*(TESTE\s*PIX|PIX\s*TEST|PRUEBA\s*PIX)\s*[-:]\s*/iu', '', $dest) ?? $dest;
        $dest = preg_replace('/^\s*(TESTE\s*PIX|PIX\s*TEST|PRUEBA\s*PIX)\s+/iu', '', $dest) ?? $dest;
        $qty = max(1, (int)($t['qty'] ?? 1));
        $parts = array_filter([$date, $dest, $qty . ' pessoa(s)']);
        if ($parts) {
            $lines[] = '• ' . implode(' · ', $parts);
        }
    }
    return $lines ? implode("\n", $lines) : '• (sem detalhes do passeio)';
}

/** @param array<string, mixed> $rec */
function gcv_purchase_notify_message(array $rec): string
{
    $code = strtoupper(trim((string)($rec['reservation_id'] ?? '')));
    $amount = (float)($rec['amount'] ?? 0);
    $buyer = trim((string)($rec['email'] ?? $rec['buyer_email'] ?? ''));
    $brl = 'R$ ' . number_format($amount, 2, ',', '.');
    $msg = "🛒 Nova compra Pix confirmada\n\n";
    $msg .= "Código: {$code}\n";
    $msg .= "Valor: {$brl}\n";
    if ($buyer !== '') {
        $msg .= "Cliente: {$buyer}\n";
    }
    $msg .= "\nPasseios:\n" . gcv_purchase_trip_lines($rec);
    return $msg;
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
    $out = ['email' => false, 'whatsapp' => false, 'wa_link' => '', 'skipped' => false];

    if ($code === '') {
        return $out;
    }

    if (!$force && !empty($rec['admin_notified_at'])) {
        $out['skipped'] = true;
        return $out;
    }

    $amount = (float)($rec['amount'] ?? 0);
    $buyer = trim((string)($rec['email'] ?? $rec['buyer_email'] ?? ''));
    $brl = 'R$ ' . number_format($amount, 2, ',', '.');
    $tripHtml = nl2br(htmlspecialchars(gcv_purchase_trip_lines($rec), ENT_QUOTES, 'UTF-8'));
    $adminEmail = gcv_admin_notify_email();
    $subject = $code . ' - Reserva';
    $body =
        '<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">' .
        '<h2 style="margin:0 0 12px;color:#0f3d2e;">Nova compra Pix confirmada</h2>' .
        '<p style="margin:0 0 8px;"><strong>Código:</strong> ' . htmlspecialchars($code, ENT_QUOTES, 'UTF-8') . '</p>' .
        '<p style="margin:0 0 8px;"><strong>Valor:</strong> ' . htmlspecialchars($brl, ENT_QUOTES, 'UTF-8') . '</p>' .
        ($buyer !== ''
            ? '<p style="margin:0 0 8px;"><strong>Cliente:</strong> ' . htmlspecialchars($buyer, ENT_QUOTES, 'UTF-8') . '</p>'
            : '') .
        '<p style="margin:12px 0 4px;"><strong>Passeios:</strong></p>' .
        '<div style="margin:0 0 12px;padding:12px;background:#f8fafc;border-radius:8px;font-size:14px;line-height:1.5;">' .
        $tripHtml .
        '</div>' .
        '<p style="margin:0;font-size:12px;color:#64748b;">Aviso automático do site Guia Chapada Veadeiros.</p></div>';

    try {
        $out['email'] = send_mail($adminEmail, $subject, $body);
    } catch (Throwable $e) {
        error_log('purchase_notify email: ' . $e->getMessage());
        $out['email'] = false;
    }

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
        'whatsapp' => $out['whatsapp'],
        'wa_link' => $out['wa_link'],
    ];
    if (function_exists('gcv_pix_write_reservation')) {
        gcv_pix_write_reservation($rec);
    }

    return $out;
}
