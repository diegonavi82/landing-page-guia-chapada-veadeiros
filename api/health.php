<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/db.php';

try {
    $pdo = gcv_db();
    gcv_ensure_schema($pdo);
    $pdo->query('SELECT 1');
    echo json_encode(['ok' => true, 'database' => 'connected']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Database connection failed']);
}
