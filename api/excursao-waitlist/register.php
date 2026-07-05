<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

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

function gcv_waitlist_json_error(int $status, string $message): void
{
    http_response_code($status);
    echo json_encode(['ok' => false, 'message' => $message]);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);
if (!is_array($data)) {
    gcv_waitlist_json_error(400, 'Invalid JSON');
}

$email = strtolower(trim((string)($data['email'] ?? '')));
$cartId = trim((string)($data['cart_id'] ?? ''));

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    gcv_waitlist_json_error(422, 'Invalid email');
}

try {
    gcv_waitlist_safe_cart_id($cartId);
} catch (Throwable $e) {
    gcv_waitlist_json_error(422, 'Invalid cart_id');
}

$ok = gcv_waitlist_add_entry($cartId, [
    'email' => $email,
    'locale' => $data['locale'] ?? 'pt',
    'destino' => $data['destino'] ?? '',
    'date_label' => $data['date_label'] ?? '',
    'date_iso' => $data['date_iso'] ?? '',
]);

if (!$ok) {
    gcv_waitlist_json_error(500, 'Could not save');
}

echo json_encode([
    'ok' => true,
    'message' => 'registered',
    'cart_id' => gcv_waitlist_safe_cart_id($cartId),
]);
