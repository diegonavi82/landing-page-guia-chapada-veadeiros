<?php
/**
 * Cria tabelas CMS (admin logado).
 * Abrir logado: /api/admin/setup-cms.php
 * Depois pode apagar este arquivo se quiser.
 */
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/attractions_seed.php';
require_once __DIR__ . '/../helpers/guides_seed.php';

header('Content-Type: text/plain; charset=utf-8');

$admin = require_admin();

try {
    gcv_cms_ensure_schema();
    $pdo = db();
    $need = ['gcv_media', 'gcv_cities', 'gcv_articles', 'gcv_attractions', 'gcv_attraction_media', 'gcv_excursions', 'gcv_excursion_attractions'];
    echo "Admin: {$admin['email']}\n\n";
    foreach ($need as $t) {
        try {
            $n = (int)$pdo->query("SELECT COUNT(*) FROM `{$t}`")->fetchColumn();
            echo "OK {$t}: {$n} linhas\n";
        } catch (Throwable $e) {
            echo "FALTA {$t}: {$e->getMessage()}\n";
        }
    }

    // pasta uploads
    $root = dirname(__DIR__, 2) . '/assets/img/uploads';
    foreach (['atrativos', 'revista', 'guias', 'geral'] as $folder) {
        $dir = $root . '/' . $folder;
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        echo (is_dir($dir) && is_writable($dir) ? 'OK write ' : 'SEM ESCRITA ') . $dir . "\n";
    }

    echo "\n--- Seed atrativos do site ---\n";
    try {
        $seed = gcv_seed_attractions_from_json();
        echo "Importados: {$seed['imported']} | Já existiam: {$seed['skipped']} | No seed: {$seed['total']}\n";
        foreach ($seed['titles'] as $t) {
            echo "  + {$t}\n";
        }
        $nAttr = (int)$pdo->query('SELECT COUNT(*) FROM gcv_attractions')->fetchColumn();
        echo "Total gcv_attractions agora: {$nAttr}\n";
    } catch (Throwable $e) {
        echo "Seed atrativos: " . $e->getMessage() . "\n";
    }

    echo "\n--- Seed guia Diego Navi + multi-papéis ---\n";
    try {
        $g = gcv_seed_diego_navi_guide();
        echo ($g['created'] ? 'Criado' : 'Atualizado') . ": {$g['name']} <{$g['email']}> user_id={$g['user_id']}\n";
        echo "PIX: {$g['pix_key']} | idiomas: " . implode(',', $g['languages']) . "\n";
        echo "Papéis: " . implode(',', $g['roles'] ?? []) . "\n";
    } catch (Throwable $e) {
        echo "Seed guia: " . $e->getMessage() . "\n";
    }

    echo "\nPronto. Saia e entre de novo: /login.html (cliente), /guia/login.html (guia), /admin/login.html (admin).\n";
} catch (Throwable $e) {
    http_response_code(500);
    echo 'ERRO: ' . $e->getMessage() . "\n";
}
