<?php
/**
 * ONE-SHOT: capa SEO GCV do atrativo Canjica e Águas Lindas.
 * Apague depois de rodar.
 */
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

if ((string)($_GET['key'] ?? '') !== 'GCV-MKT-2026') {
    http_response_code(403);
    echo "Forbidden\n";
    exit;
}

require_once __DIR__ . '/helpers/db.php';

function out(string $m): void
{
    echo $m . "\n";
}

$slug = 'canjica-aguas-lindas-guia-chapada-veadeiros';
$url = '/assets/img/imagens/cachoeira-borda-infinita-canjica-aguas-lindas-guia-chapada-veadeiros-cavalcante.jpg';
$alt = 'Cachoeira da borda infinita no Canjica e Águas Lindas, Cavalcante — Guia Chapada Veadeiros (GCV)';
$excerptPt = 'Cachoeira da borda infinita no Canjica, Cavalcante.';
$excerptEn = 'Infinity-edge waterfall at Canjica, Cavalcante.';
$excerptEs = 'Cascada de borde infinito en Canjica, Cavalcante.';
$seoPt = 'Canjica e Águas Lindas | Guia Chapada Veadeiros (GCV)';
$seoEn = 'Canjica and Águas Lindas | Guia Chapada Veadeiros (GCV)';
$seoEs = 'Canjica y Águas Lindas | Guia Chapada Veadeiros (GCV)';
$seoDesc = 'Cachoeira da borda infinita no Canjica e Águas Lindas, Cavalcante — Guia Chapada Veadeiros (GCV).';

try {
    $pdo = db();
    out('OK: conectado');

    $st = $pdo->prepare('SELECT id, cover_url FROM gcv_attractions WHERE slug = ? LIMIT 1');
    $st->execute([$slug]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        out('ERRO: atrativo não encontrado: ' . $slug);
        http_response_code(404);
        exit;
    }
    $id = (int)$row['id'];
    out('id: ' . $id);
    out('cover_antes: ' . (string)($row['cover_url'] ?? ''));

    $upd = $pdo->prepare(
        'UPDATE gcv_attractions SET
            cover_url = ?,
            excerpt_pt = ?, excerpt_en = ?, excerpt_es = ?,
            seo_title_pt = ?, seo_title_en = ?, seo_title_es = ?,
            seo_desc_pt = ?
         WHERE id = ?'
    );
    $upd->execute([$url, $excerptPt, $excerptEn, $excerptEs, $seoPt, $seoEn, $seoEs, $seoDesc, $id]);
    out('cover_depois: ' . $url);
    out('update_rows: ' . (int)$upd->rowCount());

    $exists = $pdo->prepare('SELECT id FROM gcv_attraction_media WHERE attraction_id = ? AND url = ? LIMIT 1');
    $exists->execute([$id, $url]);
    if ($exists->fetch()) {
        $pdo->prepare('UPDATE gcv_attraction_media SET alt_text = ?, sort_order = 0 WHERE attraction_id = ? AND url = ?')
            ->execute([$alt, $id, $url]);
        out('media: atualizado alt');
    } else {
        $pdo->prepare('INSERT INTO gcv_attraction_media (attraction_id, url, alt_text, sort_order) VALUES (?,?,?,0)')
            ->execute([$id, $url, $alt]);
        out('media: inserido');
    }

    $chk = $pdo->prepare('SELECT cover_url FROM gcv_attractions WHERE id = ?');
    $chk->execute([$id]);
    out('confirm_cover: ' . (string)$chk->fetchColumn());
    out('');
    out('FEITO. Apague api/_migrate_canjica_cover_once.php');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
}
