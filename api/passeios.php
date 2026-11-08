<?php
declare(strict_types=1);

/**
 * Preços públicos do site, sempre vindos do Tarifário do admin.
 * GET ?slug=<atrativo>  dados do widget "Meu roteiro" na página do atrativo
 * GET                   catálogo da página Passeios
 */

require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/related_tours.php';
require_once __DIR__ . '/helpers/tarifarios.php';
require_once __DIR__ . '/helpers/site_launch.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
header('Vary: Cookie');
header('X-LiteSpeed-Cache-Control: no-cache');

function gcv_passeios_catalog_cache_path(): string
{
    return __DIR__ . '/cache/passeios-public.json';
}

/** @return array<string,mixed>|null */
function gcv_passeios_catalog_cache_read(): ?array
{
    $path = gcv_passeios_catalog_cache_path();
    if (!is_file($path)) {
        return null;
    }
    $age = time() - (int) filemtime($path);
    if ($age < 0 || $age > 45) {
        return null;
    }
    $data = json_decode((string) file_get_contents($path), true);
    if (!is_array($data) || !isset($data['tours']) || !is_array($data['tours'])) {
        return null;
    }
    return $data;
}

/** @param array<string,mixed> $catalog */
function gcv_passeios_catalog_cache_write(array $catalog): void
{
    unset($catalog['preview']);
    $dir = dirname(gcv_passeios_catalog_cache_path());
    if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
        return;
    }
    $json = json_encode($catalog, JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        return;
    }
    $tmp = gcv_passeios_catalog_cache_path() . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
        return;
    }
    if (!@rename($tmp, gcv_passeios_catalog_cache_path())) {
        @unlink($tmp);
    }
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
    exit;
}

try {
    if (!gcv_passeios_visiveis()) {
        $slug = trim((string) ($_GET['slug'] ?? ''));
        if ($slug === '') {
            echo json_encode(['ok' => true, 'data' => [
                'tours' => [],
                'categories' => [],
                'max_atrativos' => 1,
                'oculto' => true,
            ]], JSON_UNESCAPED_UNICODE);
            exit;
        }
        echo json_encode(['ok' => true, 'data' => ['tem_passeio' => false, 'oculto' => true]], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $pdo = db();
    $slug = trim((string)($_GET['slug'] ?? ''));
    if ($slug === '') {
        $catalog = gcv_passeios_catalog_cache_read();
        if ($catalog === null) {
            $catalog = [
                'tours' => gcv_tarifario_public_catalog($pdo),
                'categories' => GCV_PASSEIO_CATEGORIAS,
                'max_atrativos' => gcv_passeio_max_atrativos($pdo),
            ];
            gcv_passeios_catalog_cache_write($catalog);
        }
        if (gcv_passeios_so_preview()) {
            $catalog['preview'] = true;
        }
        echo json_encode(['ok' => true, 'data' => $catalog], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!preg_match('/^[a-z0-9-]{1,190}$/', $slug)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'slug inválido']);
        exit;
    }
    $data = gcv_tarifario_public_attraction($pdo, $slug);
    if (!$data) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Atrativo não encontrado']);
        exit;
    }
    echo json_encode(['ok' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('passeios.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Erro ao carregar os preços']);
}
