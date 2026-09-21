<?php
/**
 * ONE-SHOT: capa SEO GCV do atrativo Caracol (Complexo Caldeira).
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

$slug = 'caracol-guia-chapada-veadeiros';
$url = '/assets/img/imagens/cachoeira-caracol-complexo-caldeira-guia-chapada-veadeiros-alto-paraiso.jpg';
$alt = 'Cachoeira Caracol no Complexo Caldeira, Alto Paraíso de Goiás — Guia Chapada Veadeiros (GCV)';
$excerptPt = 'Cachoeira Caracol no Complexo Caldeira, Alto Paraíso de Goiás.';
$excerptEn = 'Caracol waterfall at Complexo Caldeira, Alto Paraíso de Goiás.';
$excerptEs = 'Cascada Caracol en el Complejo Caldeira, Alto Paraíso de Goiás.';
$seoPt = 'Cachoeira Caracol | Complexo Caldeira | Guia Chapada Veadeiros (GCV)';
$seoEn = 'Caracol Waterfall | Complexo Caldeira | Guia Chapada Veadeiros (GCV)';
$seoEs = 'Cascada Caracol | Complejo Caldeira | Guia Chapada Veadeiros (GCV)';
$seoDescPt = 'Cachoeira Caracol no Complexo Caldeira, Alto Paraíso de Goiás — poço para banho e queda em gruta. Guia Chapada Veadeiros (GCV).';
$seoDescEn = 'Caracol waterfall at Complexo Caldeira, Alto Paraíso de Goiás — swimming pool and cave fall. Guia Chapada Veadeiros (GCV).';
$seoDescEs = 'Cascada Caracol en el Complejo Caldeira, Alto Paraíso de Goiás — poza para baño y salto en gruta. Guia Chapada Veadeiros (GCV).';

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

    $cityId = null;
    try {
        $cityId = $pdo->query(
            "SELECT id FROM gcv_cities WHERE name LIKE '%Alto Paraíso%' AND status = 'active' LIMIT 1"
        )->fetchColumn();
    } catch (Throwable $e) {
        $cityId = null;
    }

    $sql = 'UPDATE gcv_attractions SET
            cover_url = ?,
            excerpt_pt = ?, excerpt_en = ?, excerpt_es = ?,
            seo_title_pt = ?, seo_title_en = ?, seo_title_es = ?,
            seo_desc_pt = ?, seo_desc_en = ?, seo_desc_es = ?';
    $params = [
        $url,
        $excerptPt, $excerptEn, $excerptEs,
        $seoPt, $seoEn, $seoEs,
        $seoDescPt, $seoDescEn, $seoDescEs,
    ];
    if ($cityId) {
        $sql .= ', city_id = ?';
        $params[] = (int)$cityId;
        out('city_id: ' . (int)$cityId);
    }
    $sql .= ' WHERE id = ?';
    $params[] = $id;

    $upd = $pdo->prepare($sql);
    $upd->execute($params);
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
    out('FEITO. Apague api/_migrate_caracol_cover_once.php');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO: ' . $e->getMessage());
}
