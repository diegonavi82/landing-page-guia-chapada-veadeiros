<?php

declare(strict_types=1);

/**
 * Limite simples de tentativas por IP (arquivo em storage/ratelimit), contra teste de
 * cartões roubados ("card testing") e abuso dos endpoints de checkout.
 */

function gcv_rate_limit_or_fail(string $bucket, int $max, int $windowSeconds): void
{
    $ip = (string) ($_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '0');
    $dir = dirname(__DIR__, 2) . '/storage/ratelimit';
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $file = $dir . '/' . preg_replace('/[^a-z0-9_]/i', '', $bucket) . '-' . substr(hash('sha256', $ip), 0, 24) . '.json';
    $now = time();
    $hits = [];
    $fh = @fopen($file, 'c+');
    if (!$fh) {
        return; // sem disco: não bloqueia o cliente
    }
    flock($fh, LOCK_EX);
    $raw = stream_get_contents($fh);
    $hits = array_values(array_filter(json_decode((string) $raw, true) ?: [], static fn ($t) => is_int($t) && $t > $now - $windowSeconds));
    if (count($hits) >= $max) {
        flock($fh, LOCK_UN);
        fclose($fh);
        http_response_code(429);
        header('Retry-After: ' . $windowSeconds);
        echo json_encode(['success' => false, 'message' => 'Muitas tentativas. Aguarde alguns minutos e tente de novo.', 'error' => 'rate_limited']);
        exit;
    }
    $hits[] = $now;
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($hits));
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
}
