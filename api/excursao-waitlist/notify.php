<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once dirname(__DIR__) . '/helpers/db.php';
require_once dirname(__DIR__) . '/helpers/mailer.php';
require_once dirname(__DIR__) . '/helpers/pix_reservation_store.php';
require_once dirname(__DIR__) . '/helpers/excursao_waitlist_store.php';

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

$cartId = trim((string)($data['cart_id'] ?? ''));
$vagas = (int)($data['vagas_available'] ?? 0);

try {
    gcv_waitlist_safe_cart_id($cartId);
} catch (Throwable $e) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Invalid cart_id']);
    exit;
}

if ($vagas < 1) {
    echo json_encode(['ok' => true, 'sent' => 0, 'message' => 'No spots open']);
    exit;
}

$waiters = gcv_waitlist_take_all($cartId);
if (!$waiters) {
    echo json_encode(['ok' => true, 'sent' => 0, 'message' => 'Empty waitlist']);
    exit;
}

$smtpUser = trim((string)($_ENV['SMTP_USER'] ?? ''));
$smtpPass = trim((string)($_ENV['SMTP_PASS'] ?? ''));
if ($smtpUser === '' || $smtpPass === '') {
    http_response_code(503);
    echo json_encode(['ok' => false, 'message' => 'Mail service not configured']);
    exit;
}

$appUrl = rtrim((string)($_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com'), '/');
$sent = 0;
$seen = [];

foreach ($waiters as $row) {
    $email = strtolower(trim((string)($row['email'] ?? '')));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || isset($seen[$email])) {
        continue;
    }
    $seen[$email] = true;

    $locale = in_array($row['locale'] ?? 'pt', ['pt', 'en', 'es'], true) ? $row['locale'] : 'pt';
    $destino = trim((string)($row['destino'] ?? 'excursão'));
    $dateLabel = trim((string)($row['date_label'] ?? ''));

    $subjects = [
        'pt' => 'Vaga disponível — ' . $destino,
        'en' => 'Spot available — ' . $destino,
        'es' => 'Plaza disponible — ' . $destino,
    ];
    $subject = $subjects[$locale] ?? $subjects['pt'];

    $lines = [
        'pt' => [
            'title' => 'Abriu vaga na excursão!',
            'lead' => 'Uma vaga foi liberada para o passeio que você pediu para acompanhar.',
            'trip' => 'Passeio',
            'date' => 'Data',
            'cta' => 'Reservar agora',
            'note' => 'As vagas são limitadas — garanta a sua o quanto antes.',
        ],
        'en' => [
            'title' => 'A spot opened up!',
            'lead' => 'A spot was released for the tour you asked us to watch.',
            'trip' => 'Tour',
            'date' => 'Date',
            'cta' => 'Book now',
            'note' => 'Spots are limited — secure yours as soon as you can.',
        ],
        'es' => [
            'title' => '¡Se liberó una plaza!',
            'lead' => 'Se liberó una plaza para el paseo que pediste seguir.',
            'trip' => 'Paseo',
            'date' => 'Fecha',
            'cta' => 'Reservar ahora',
            'note' => 'Las plazas son limitadas — asegura la tuya cuanto antes.',
        ],
    ];
    $L = $lines[$locale] ?? $lines['pt'];

    $body =
        '<p><strong>' . htmlspecialchars($L['title'], ENT_QUOTES, 'UTF-8') . '</strong></p>' .
        '<p>' . htmlspecialchars($L['lead'], ENT_QUOTES, 'UTF-8') . '</p>' .
        '<ul>' .
        '<li><strong>' . htmlspecialchars($L['trip'], ENT_QUOTES, 'UTF-8') . ':</strong> ' .
        htmlspecialchars($destino, ENT_QUOTES, 'UTF-8') . '</li>' .
        ($dateLabel !== ''
            ? '<li><strong>' . htmlspecialchars($L['date'], ENT_QUOTES, 'UTF-8') . ':</strong> ' .
                htmlspecialchars($dateLabel, ENT_QUOTES, 'UTF-8') . '</li>'
            : '') .
        '</ul>' .
        '<p><a href="' . htmlspecialchars($appUrl . '/#excursoes-junho', ENT_QUOTES, 'UTF-8') .
        '" style="background:#0f3d2e;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;display:inline-block;">' .
        htmlspecialchars($L['cta'], ENT_QUOTES, 'UTF-8') . '</a></p>' .
        '<p style="color:#64748b;font-size:13px;">' . htmlspecialchars($L['note'], ENT_QUOTES, 'UTF-8') . '</p>';

    if (send_mail($email, $subject, $body)) {
        $sent++;
    }
}

echo json_encode([
    'ok' => true,
    'sent' => $sent,
    'waitlist_size' => count($waiters),
]);
