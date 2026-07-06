<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/helpers/db.php';
require_once dirname(__DIR__) . '/helpers/mailer.php';
require_once dirname(__DIR__) . '/helpers/pix_reservation_store.php';
require_once dirname(__DIR__) . '/helpers/pix_receipt_html.php';

gcv_pix_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => 'Invalid JSON']);
    exit;
}

$email = strtolower(trim((string)($data['email'] ?? '')));
$locale = in_array($data['locale'] ?? 'pt', ['pt', 'en', 'es'], true) ? $data['locale'] : 'pt';

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Invalid email']);
    exit;
}

$genericOk = [
    'ok' => true,
    'found' => true,
];

$reservations = gcv_pix_find_all_by_email($email, 15);
if (!$reservations) {
    echo json_encode(['ok' => true, 'found' => false]);
    exit;
}

$smtpUser = trim((string)($_ENV['SMTP_USER'] ?? ''));
$smtpPass = trim((string)($_ENV['SMTP_PASS'] ?? ''));
if ($smtpUser === '' || $smtpPass === '') {
    error_log('recover-by-email: SMTP não configurado');
    echo json_encode($genericOk);
    exit;
}

$appUrl = rtrim((string)($_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com'), '/');
$labels = [
    'pt' => [
        'subject' => 'Seus códigos de reserva — Guia Chapada Veadeiros',
        'hello' => 'Olá!',
        'lead' => 'Encontramos reserva(s) Pix vinculada(s) a este e-mail:',
        'status' => 'Status',
        'amount' => 'Valor',
        'consult' => 'Consultar reserva',
        'confirm' => 'Ver confirmação',
        'pending' => 'Aguardando pagamento',
        'paid' => 'Pagamento confirmado',
        'expired' => 'Pix expirado',
        'footer' => 'Use o mesmo e-mail ao consultar no site. Se não reconhece estas reservas, ignore este e-mail.',
    ],
    'en' => [
        'subject' => 'Your reservation codes — Guia Chapada Veadeiros',
        'hello' => 'Hello!',
        'lead' => 'We found Pix reservation(s) linked to this email:',
        'status' => 'Status',
        'amount' => 'Amount',
        'consult' => 'Look up reservation',
        'confirm' => 'View confirmation',
        'pending' => 'Awaiting payment',
        'paid' => 'Payment confirmed',
        'expired' => 'Pix expired',
        'footer' => 'Use the same email when looking up on the site. If you do not recognize these, ignore this email.',
    ],
    'es' => [
        'subject' => 'Sus códigos de reserva — Guia Chapada Veadeiros',
        'hello' => '¡Hola!',
        'lead' => 'Encontramos reserva(s) Pix vinculada(s) a este correo:',
        'status' => 'Estado',
        'amount' => 'Valor',
        'consult' => 'Consultar reserva',
        'confirm' => 'Ver confirmación',
        'pending' => 'Esperando pago',
        'paid' => 'Pago confirmado',
        'expired' => 'Pix expirado',
        'footer' => 'Use el mismo correo al consultar en el sitio. Si no reconoce estas reservas, ignore este correo.',
    ],
];
$L = $labels[$locale] ?? $labels['pt'];

$statusLabel = static function (string $status) use ($L): string {
    $st = strtoupper($status);
    if ($st === 'PAID') {
        return $L['paid'];
    }
    if ($st === 'EXPIRED') {
        return $L['expired'];
    }
    return $L['pending'];
};

$lookupBase = $locale === 'en' ? '/en/consultar-reserva.html' : ($locale === 'es' ? '/es/consultar-reserva.html' : '/consultar-reserva.html');
$confirmBase = $locale === 'en' ? '/en/confirmacao.html' : ($locale === 'es' ? '/es/confirmacao.html' : '/confirmacao.html');

$rowsHtml = '';
foreach ($reservations as $res) {
    $code = gcv_pix_safe_id((string)($res['reservation_id'] ?? ''));
    if ($code === '') {
        continue;
    }
    $st = gcv_pix_effective_status($res);
    $amount = isset($res['amount']) ? 'R$ ' . number_format((float)$res['amount'], 2, ',', '.') : '';
    $lookupUrl = $appUrl . $lookupBase . '?id=' . rawurlencode($code) . '&email=' . rawurlencode($email) . '&auto=1';
    $confirmUrl = $appUrl . $confirmBase . '?id=' . rawurlencode($code);
    $safeCode = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');
    $rowsHtml .= '<div style="margin:0 0 16px;padding:14px 16px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;">'
        . '<p style="margin:0 0 6px;font-size:18px;font-weight:800;color:#064e3b;">' . $safeCode . '</p>'
        . '<p style="margin:0 0 4px;font-size:14px;color:#334155;"><strong>' . htmlspecialchars($L['status'], ENT_QUOTES, 'UTF-8') . ':</strong> '
        . htmlspecialchars($statusLabel($st), ENT_QUOTES, 'UTF-8') . '</p>';
    if ($amount !== '') {
        $rowsHtml .= '<p style="margin:0 0 10px;font-size:14px;color:#334155;"><strong>' . htmlspecialchars($L['amount'], ENT_QUOTES, 'UTF-8') . ':</strong> '
            . htmlspecialchars($amount, ENT_QUOTES, 'UTF-8') . '</p>';
    }
    $rowsHtml .= '<p style="margin:0;">'
        . '<a href="' . htmlspecialchars($lookupUrl, ENT_QUOTES, 'UTF-8') . '" style="display:inline-block;margin:0 8px 6px 0;padding:10px 14px;background:#064e3b;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;">'
        . htmlspecialchars($L['consult'], ENT_QUOTES, 'UTF-8') . '</a>'
        . '<a href="' . htmlspecialchars($confirmUrl, ENT_QUOTES, 'UTF-8') . '" style="display:inline-block;margin:0 0 6px;padding:10px 14px;background:#fff;color:#064e3b;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px;border:2px solid #064e3b;">'
        . htmlspecialchars($L['confirm'], ENT_QUOTES, 'UTF-8') . '</a></p></div>';
}

if ($rowsHtml === '') {
    echo json_encode(['ok' => true, 'found' => false]);
    exit;
}

$body = '<p style="margin:0 0 12px;font-size:16px;">' . htmlspecialchars($L['hello'], ENT_QUOTES, 'UTF-8') . '</p>'
    . '<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#334155;">' . htmlspecialchars($L['lead'], ENT_QUOTES, 'UTF-8') . '</p>'
    . $rowsHtml
    . '<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#64748b;">' . htmlspecialchars($L['footer'], ENT_QUOTES, 'UTF-8') . '</p>';

$sent = send_mail($email, $L['subject'], $body);
if (!$sent) {
    error_log('recover-by-email: falha ao enviar códigos para ' . $email);
}

foreach ($reservations as $res) {
    $code = gcv_pix_safe_id((string)($res['reservation_id'] ?? ''));
    if ($code === '') {
        continue;
    }
    $receiptHtml = gcv_build_pix_receipt_email_html($res, $locale);
    $receiptSubject = gcv_pix_receipt_email_subject($code, $locale);
    $receiptSent = send_mail($email, $receiptSubject, $receiptHtml, '', false);
    if (!$receiptSent) {
        error_log('recover-by-email: falha ao enviar recibo ' . $code . ' para ' . $email);
    }
}

echo json_encode($genericOk);
