<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

/**
 * Verifica rate limit por IP e endpoint.
 * Máx 5 tentativas em janela de 15 minutos.
 */
function check_rate_limit(string $endpoint, int $maxAttempts = 5, int $windowMinutes = 15): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

    // Limpar janelas expiradas
    db()->prepare(
        'DELETE FROM gcv_rate_limits WHERE window_start < DATE_SUB(NOW(), INTERVAL ? MINUTE)'
    )->execute([$windowMinutes]);

    $stmt = db()->prepare(
        'SELECT id, attempts FROM gcv_rate_limits WHERE ip = ? AND endpoint = ? AND window_start >= DATE_SUB(NOW(), INTERVAL ? MINUTE)'
    );
    $stmt->execute([$ip, $endpoint, $windowMinutes]);
    $row = $stmt->fetch();

    if ($row) {
        if ($row['attempts'] >= $maxAttempts) {
            json_response(false, null, 'Muitas tentativas. Aguarde ' . $windowMinutes . ' minutos.', 429);
        }
        db()->prepare(
            'UPDATE gcv_rate_limits SET attempts = attempts + 1 WHERE id = ?'
        )->execute([$row['id']]);
    } else {
        db()->prepare(
            'INSERT INTO gcv_rate_limits (ip, endpoint, attempts) VALUES (?, ?, 1)'
        )->execute([$ip, $endpoint]);
    }
}

function reset_rate_limit(string $endpoint): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    db()->prepare('DELETE FROM gcv_rate_limits WHERE ip = ? AND endpoint = ?')->execute([$ip, $endpoint]);
}
