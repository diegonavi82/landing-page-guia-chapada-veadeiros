<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/helpers/db.php';
require_once dirname(__DIR__) . '/helpers/mailer.php';
require_once dirname(__DIR__) . '/helpers/pix_receipt_html.php';
require_once dirname(__DIR__) . '/helpers/pix_reservation_store.php';
require_once dirname(__DIR__) . '/helpers/purchase_notify.php';

gcv_pix_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Method not allowed']);
    exit;
}

function gcv_json_error(int $status, string $message, array $extra = []): void
{
    http_response_code($status);
    echo json_encode(array_merge(['ok' => false, 'message' => $message], $extra));
    exit;
}

function gcv_clean_string(?string $value, int $max): string
{
    $value = trim((string) $value);
    if (mb_strlen($value) > $max) {
        $value = mb_substr($value, 0, $max);
    }
    return $value;
}

function gcv_sanitize_receipt_html(string $html): string
{
    $html = preg_replace('/<script\b[^>]*>.*?<\/script>/is', '', $html) ?? $html;
    $html = preg_replace('/\son\w+\s*=\s*(["\']).*?\1/i', '', $html) ?? $html;
    $html = preg_replace('/\s(href|src)\s*=\s*(["\'])\s*javascript:.*?\2/i', '', $html) ?? $html;
    return $html;
}

function gcv_receipt_email_links_footer(string $code, string $locale): string
{
    $appUrl = rtrim((string)($_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com'), '/');
    $safeCode = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');
    $confirmPt = $appUrl . '/confirmacao.html?id=' . rawurlencode($code);
    $confirmEn = $appUrl . '/en/confirmacao.html?id=' . rawurlencode($code);
    $confirmEs = $appUrl . '/es/confirmacao.html?id=' . rawurlencode($code);
    $lookupPt = $appUrl . '/consultar-reserva.html?id=' . rawurlencode($code);
    $lookupEn = $appUrl . '/en/consultar-reserva.html?id=' . rawurlencode($code);
    $lookupEs = $appUrl . '/es/consultar-reserva.html?id=' . rawurlencode($code);

    $labels = [
        'pt' => [
            'title' => 'Acompanhe sua reserva',
            'confirm' => 'Ver confirmação de pagamento',
            'lookup' => 'Consultar reserva depois',
            'hint' => 'Guarde este e-mail. Use os links acima para verificar o status do Pix a qualquer momento.',
        ],
        'en' => [
            'title' => 'Track your reservation',
            'confirm' => 'View payment confirmation',
            'lookup' => 'Look up reservation later',
            'hint' => 'Keep this email. Use the links above to check your Pix status anytime.',
        ],
        'es' => [
            'title' => 'Siga su reserva',
            'confirm' => 'Ver confirmación de pago',
            'lookup' => 'Consultar reserva después',
            'hint' => 'Guarde este correo. Use los enlaces para verificar el estado del Pix cuando quiera.',
        ],
    ];
    $loc = in_array($locale, ['pt', 'en', 'es'], true) ? $locale : 'pt';
    $L = $labels[$loc];
    $confirmUrl = $loc === 'en' ? $confirmEn : ($loc === 'es' ? $confirmEs : $confirmPt);
    $lookupUrl = $loc === 'en' ? $lookupEn : ($loc === 'es' ? $lookupEs : $lookupPt);

    return '<div style="max-width:640px;margin:24px auto 0;padding:20px 24px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;font-family:Arial,Helvetica,sans-serif;">'
        . '<p style="margin:0 0 12px;font-size:16px;font-weight:800;color:#064e3b;">' . htmlspecialchars($L['title'], ENT_QUOTES, 'UTF-8') . '</p>'
        . '<p style="margin:0 0 8px;font-size:14px;color:#334155;">Código: <strong>' . $safeCode . '</strong></p>'
        . '<p style="margin:0 0 16px;">'
        . '<a href="' . htmlspecialchars($confirmUrl, ENT_QUOTES, 'UTF-8') . '" style="display:inline-block;margin:0 12px 8px 0;padding:12px 18px;background:#064e3b;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">'
        . htmlspecialchars($L['confirm'], ENT_QUOTES, 'UTF-8') . '</a>'
        . '<a href="' . htmlspecialchars($lookupUrl, ENT_QUOTES, 'UTF-8') . '" style="display:inline-block;margin:0 0 8px;padding:12px 18px;background:#fff;color:#064e3b;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;border:2px solid #064e3b;">'
        . htmlspecialchars($L['lookup'], ENT_QUOTES, 'UTF-8') . '</a></p>'
        . '<p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">' . htmlspecialchars($L['hint'], ENT_QUOTES, 'UTF-8') . '</p>'
        . '</div>';
}

$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);
if (!is_array($data)) {
    gcv_json_error(400, 'Invalid JSON body');
}

$locale = gcv_clean_string($data['locale'] ?? 'pt', 8);
if (!in_array($locale, ['pt', 'en', 'es'], true)) {
    $locale = 'pt';
}

$email = gcv_clean_string($data['email'] ?? '', 190);
$code = gcv_clean_string($data['code'] ?? '', 32);
$html = gcv_clean_string($data['html'] ?? '', 200000);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    gcv_json_error(422, 'Invalid email');
}

if (!preg_match('/^GCV-[A-Z0-9]{6}$/', $code)) {
    gcv_json_error(422, 'Invalid reservation code');
}

if ($html === '' || mb_strlen($html) < 200) {
    gcv_json_error(422, 'Invalid receipt HTML');
}

$html = gcv_sanitize_receipt_html($html);
$html = preg_replace('/<style\b[^>]*>.*?<\/style>/is', '', $html) ?? $html;
$html = preg_replace('/<div\b[^>]*display\s*:\s*none[^>]*>.*?<\/div>/is', '', $html) ?? $html;

// Mantém documento completo (css + body) — e-mails precisam do markup completo.
if (!preg_match('/<html[\s>]/i', $html)) {
    $html = '<!DOCTYPE html><html lang="' . htmlspecialchars($locale, ENT_QUOTES, 'UTF-8') . '"><head><meta charset="utf-8"></head><body>'
        . $html
        . '</body></html>';
}

$subject = gcv_pix_receipt_email_subject($code, $locale);

$hellos = [
    'pt' => 'Olá. Guia Chapada Veadeiros confirma a sua reserva na Chapada dos Veadeiros. O roteiro está neste e-mail. Guarde a mensagem.',
    'en' => 'Hello. Guia Chapada Veadeiros confirms your reservation at Chapada dos Veadeiros. The itinerary is in this email. Please keep it.',
    'es' => 'Hola. Guia Chapada Veadeiros confirma su reserva en Chapada dos Veadeiros. El itinerario está en este correo. Guárdelo.',
];
if (!str_contains($html, 'gcv-mail-hello')) {
    $hello = '<p style="margin:0;padding:16px 28px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#0f172a;"><!-- gcv-mail-hello -->'
        . htmlspecialchars($hellos[$locale] ?? $hellos['pt'], ENT_QUOTES, 'UTF-8')
        . '</p>';
    $html = preg_replace('/<body\b[^>]*>/i', '$0' . $hello, $html, 1) ?? ($hello . $html);
}

$footer = gcv_receipt_email_links_footer($code, $locale);
if (stripos($html, '</body>') !== false) {
    $wrapped = preg_replace('/<\/body>/i', $footer . '</body>', $html, 1) ?? ($html . $footer);
} else {
    $wrapped = $html . $footer;
}

$confirmPath = $locale === 'en' ? '/en/confirmacao.html' : ($locale === 'es' ? '/es/confirmacao.html' : '/confirmacao.html');
$lookupPath = $locale === 'en' ? '/en/consultar-reserva.html' : ($locale === 'es' ? '/es/consultar-reserva.html' : '/consultar-reserva.html');
$appUrl = rtrim((string)($_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com'), '/');
$altLines = [
    'pt' => [
        'Sua reserva ' . $code . ' na Chapada dos Veadeiros',
        '',
        'Guia Chapada Veadeiros confirma esta reserva.',
        'Código: ' . $code,
        '',
        'Ver confirmação: ' . $appUrl . $confirmPath . '?id=' . rawurlencode($code),
        'Consultar reserva: ' . $appUrl . $lookupPath . '?id=' . rawurlencode($code),
        '',
        'contato@guiachapadaveadeiros.com',
        '+55 62 98250-6891',
    ],
    'en' => [
        'Your reservation ' . $code . ' at Chapada dos Veadeiros',
        '',
        'Guia Chapada Veadeiros confirms this reservation.',
        'Code: ' . $code,
        '',
        'View confirmation: ' . $appUrl . $confirmPath . '?id=' . rawurlencode($code),
        'Look up reservation: ' . $appUrl . $lookupPath . '?id=' . rawurlencode($code),
        '',
        'contato@guiachapadaveadeiros.com',
        '+55 62 98250-6891',
    ],
    'es' => [
        'Su reserva ' . $code . ' en Chapada dos Veadeiros',
        '',
        'Guia Chapada Veadeiros confirma esta reserva.',
        'Código: ' . $code,
        '',
        'Ver confirmación: ' . $appUrl . $confirmPath . '?id=' . rawurlencode($code),
        'Consultar reserva: ' . $appUrl . $lookupPath . '?id=' . rawurlencode($code),
        '',
        'contato@guiachapadaveadeiros.com',
        '+55 62 98250-6891',
    ],
];
$altBody = implode("\n", $altLines[$locale] ?? $altLines['pt']);

$smtpUser = trim((string)($_ENV['SMTP_USER'] ?? ''));
$smtpPass = trim((string)($_ENV['SMTP_PASS'] ?? ''));
if ($smtpUser === '' || $smtpPass === '') {
    error_log('excursao-receipt: SMTP não configurado em api/.env (SMTP_USER / SMTP_PASS)');
    gcv_json_error(503, 'Mail service not configured');
}

$sent = send_mail($email, $subject, $wrapped, '', false, [], $altBody);

if (!$sent) {
    gcv_json_error(500, 'Mail send failed');
}

$resRecord = gcv_pix_read_reservation($code);
if ($resRecord) {
    $resRecord['email'] = strtolower($email);
    // O recibo manda o trip sem cartId. Trocar aqui apagava o vínculo da compra.
    if (isset($data['amount']) && is_numeric($data['amount'])) {
        $resRecord['amount'] = (float)$data['amount'];
    }
    gcv_pix_write_reservation($resRecord);

    // Aviso admin também no envio do recibo (quando o pagamento já está PAID).
    if (strtoupper((string)($resRecord['status'] ?? '')) === 'PAID') {
        try {
            gcv_notify_admin_purchase($resRecord);
        } catch (Throwable $e) {
            error_log('excursao-receipt admin notify: ' . $e->getMessage());
        }
    }
}

echo json_encode([
    'ok' => true,
    'message' => 'Sent',
    'code' => $code,
    'attachment' => false,
]);
