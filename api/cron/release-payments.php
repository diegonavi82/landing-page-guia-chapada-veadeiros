<?php
declare(strict_types=1);

/**
 * Cron Job — Rodar diariamente às 6h no Hostinger:
 * 0 6 * * * php /home/u431245201/public_html/api/cron/release-payments.php
 *
 * O MP libera o valor ao guia automaticamente via money_release_date.
 * Este script apenas atualiza o banco de dados e notifica os guias.
 */

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/mailer.php';

// Carregar .env
$envFile = dirname(__DIR__, 2) . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$k, $v] = explode('=', $line, 2);
        $_ENV[trim($k)] = trim($v);
    }
}

$stmt = db()->prepare(
    'SELECT b.id, b.mp_guide_amount_cents,
            t.title_pt AS tour_title,
            g.name AS guide_name, g.email AS guide_email
     FROM gcv_bookings b
     JOIN gcv_tours t ON t.id = b.tour_id
     JOIN gcv_users g ON g.id = t.guide_id
     WHERE b.status = \'paid\'
       AND b.released_at IS NULL
       AND b.release_date <= CURDATE()'
);
$stmt->execute();
$bookings = $stmt->fetchAll();

$count = 0;
foreach ($bookings as $booking) {
    db()->prepare(
        'UPDATE gcv_bookings SET released_at = NOW() WHERE id = ?'
    )->execute([$booking['id']]);

    mail_payment_released(
        $booking['guide_email'],
        $booking['guide_name'],
        $booking['tour_title'],
        (int)$booking['mp_guide_amount_cents']
    );
    $count++;
    echo date('Y-m-d H:i:s') . " — Booking #{$booking['id']} marcado como liberado\n";
}

echo "Total processado: {$count}\n";
