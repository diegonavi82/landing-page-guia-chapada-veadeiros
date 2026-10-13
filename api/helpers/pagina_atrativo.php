<?php
declare(strict_types=1);

/**
 * Texto visível da página do atrativo.
 * Corpo: .gcv-detail-content. Lateral: .gcv-detail-info.
 * Arquivos: atrativos/, en/atrativos/, es/atrativos/.
 */

function gcv_pagina_atrativo_root(): string
{
    return dirname(__DIR__, 2);
}

function gcv_pagina_atrativo_slug(string $slug): string
{
    $slug = trim($slug);
    return preg_match('/^[a-z0-9-]+$/i', $slug) ? $slug : '';
}

function gcv_pagina_atrativo_arquivos(string $slug): array
{
    $slug = gcv_pagina_atrativo_slug($slug);
    if ($slug === '') {
        return [];
    }
    $root = gcv_pagina_atrativo_root();
    return [
        'pt' => $root . DIRECTORY_SEPARATOR . 'atrativos' . DIRECTORY_SEPARATOR . $slug . '.html',
        'en' => $root . DIRECTORY_SEPARATOR . 'en' . DIRECTORY_SEPARATOR . 'atrativos' . DIRECTORY_SEPARATOR . $slug . '.html',
        'es' => $root . DIRECTORY_SEPARATOR . 'es' . DIRECTORY_SEPARATOR . 'atrativos' . DIRECTORY_SEPARATOR . $slug . '.html',
    ];
}

function gcv_pagina_atrativo_miolo(string $html, string $className): string
{
    if (!preg_match('/<div\s+class="' . preg_quote($className, '/') . '"[^>]*>/i', $html, $open, PREG_OFFSET_CAPTURE)) {
        return '';
    }
    $start = $open[0][1] + strlen($open[0][0]);
    $lower = strtolower($html);
    $i = $start;
    $depth = 1;
    $len = strlen($html);
    while ($i < $len && $depth > 0) {
        $nextOpen = strpos($lower, '<div', $i);
        $nextClose = strpos($lower, '</div>', $i);
        if ($nextClose === false) {
            return '';
        }
        if ($nextOpen !== false && $nextOpen < $nextClose) {
            $depth++;
            $i = $nextOpen + 4;
            continue;
        }
        $depth--;
        if ($depth === 0) {
            return trim(substr($html, $start, $nextClose - $start));
        }
        $i = $nextClose + 6;
    }
    return '';
}

function gcv_pagina_atrativo_trocar_miolo(string $html, string $className, string $inner): string
{
    if (!preg_match('/<div\s+class="' . preg_quote($className, '/') . '"[^>]*>/i', $html, $open, PREG_OFFSET_CAPTURE)) {
        return $html;
    }
    $start = $open[0][1] + strlen($open[0][0]);
    $lower = strtolower($html);
    $i = $start;
    $depth = 1;
    $len = strlen($html);
    while ($i < $len && $depth > 0) {
        $nextOpen = strpos($lower, '<div', $i);
        $nextClose = strpos($lower, '</div>', $i);
        if ($nextClose === false) {
            return $html;
        }
        if ($nextOpen !== false && $nextOpen < $nextClose) {
            $depth++;
            $i = $nextOpen + 4;
            continue;
        }
        $depth--;
        if ($depth === 0) {
            return substr($html, 0, $start) . $inner . substr($html, $nextClose);
        }
        $i = $nextClose + 6;
    }
    return $html;
}

function gcv_pagina_atrativo_ler(string $slug): array
{
    $out = [];
    foreach (gcv_pagina_atrativo_arquivos($slug) as $lang => $file) {
        if (!is_file($file)) {
            continue;
        }
        $html = file_get_contents($file);
        if (!is_string($html) || $html === '') {
            continue;
        }
        $out[$lang] = [
            'bodyHtml' => gcv_pagina_atrativo_miolo($html, 'gcv-detail-content'),
            'sidebarHtml' => gcv_pagina_atrativo_miolo($html, 'gcv-detail-info'),
            'subtitle' => gcv_pagina_atrativo_subtitulo($html),
        ];
    }
    return $out;
}

function gcv_pagina_atrativo_completar(array $row): array
{
    $paginas = gcv_pagina_atrativo_ler((string)($row['slug'] ?? ''));
    foreach (['pt', 'en', 'es'] as $lang) {
        if (empty($paginas[$lang])) {
            continue;
        }
        $bodyKey = 'content_' . $lang;
        $sideKey = 'sidebar_html_' . $lang;
        if (trim(strip_tags((string)($row[$bodyKey] ?? ''))) === '' && ($paginas[$lang]['bodyHtml'] ?? '') !== '') {
            $row[$bodyKey] = $paginas[$lang]['bodyHtml'];
        }
        if (trim((string)($row[$sideKey] ?? '')) === '' && ($paginas[$lang]['sidebarHtml'] ?? '') !== '') {
            $row[$sideKey] = $paginas[$lang]['sidebarHtml'];
        }
        $sub = trim((string)($paginas[$lang]['subtitle'] ?? ''));
        if ($sub !== '') {
            $exp = is_array($row['experiencia'] ?? null) ? $row['experiencia'] : [];
            $subKey = 'subtitulo_' . $lang;
            if (trim((string)($exp[$subKey] ?? '')) === '') {
                $exp[$subKey] = $sub;
                $row['experiencia'] = $exp;
            }
        }
    }
    return $row;
}

function gcv_pagina_atrativo_subtitulo(string $html): string
{
    if (!preg_match('/<p class="gcv-detail-subtitle">([\s\S]*?)<\/p>/i', $html, $m)) {
        return '';
    }
    $texto = trim(strip_tags($m[1]));
    return html_entity_decode($texto, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function gcv_pagina_atrativo_trocar_subtitulo(string $html, string $subtitle): string
{
    $subtitle = trim($subtitle);
    $bloco = $subtitle !== ''
        ? "\n      " . '<p class="gcv-detail-subtitle">' . gcv_pagina_atrativo_escapar($subtitle) . '</p>'
        : '';
    $out = preg_replace(
        '/(<header class="gcv-detail-title">\s*<h1>[\s\S]*?<\/h1>)(?:\s*<p class="gcv-detail-subtitle">[\s\S]*?<\/p>)?/',
        '$1' . $bloco,
        $html,
        1
    );
    return is_string($out) ? $out : $html;
}

function gcv_pagina_atrativo_escapar(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

function gcv_pagina_atrativo_gravar(string $slug, array $idiomas): array
{
    $arquivos = [];
    $edits = [];
    $editsFile = gcv_pagina_atrativo_root() . DIRECTORY_SEPARATOR . 'tools' . DIRECTORY_SEPARATOR . 'attraction-page-edits.json';
    if (is_file($editsFile)) {
        $decoded = json_decode((string)file_get_contents($editsFile), true);
        if (is_array($decoded)) {
            $edits = $decoded;
        }
    }
    $id = gcv_pagina_atrativo_slug($slug);
    if ($id === '') {
        return [];
    }
    $atual = isset($edits[$id]) && is_array($edits[$id]) ? $edits[$id] : [];
    foreach (gcv_pagina_atrativo_arquivos($id) as $lang => $file) {
        $dados = $idiomas[$lang] ?? null;
        if (!is_array($dados) || !is_file($file)) {
            continue;
        }
        $html = file_get_contents($file);
        if (!is_string($html)) {
            continue;
        }
        $body = isset($dados['bodyHtml']) ? (string)$dados['bodyHtml'] : '';
        $side = isset($dados['sidebarHtml']) ? (string)$dados['sidebarHtml'] : '';
        $title = isset($dados['title']) ? trim((string)$dados['title']) : '';
        if (trim($body) !== '') {
            $html = gcv_pagina_atrativo_trocar_miolo($html, 'gcv-detail-content', $body);
        }
        if (trim($side) !== '') {
            $html = gcv_pagina_atrativo_trocar_miolo($html, 'gcv-detail-info', $side);
        }
        if ($title !== '') {
            $safe = gcv_pagina_atrativo_escapar($title);
            $html = preg_replace(
                '/(<header class="gcv-detail-title">\s*<h1>)[\s\S]*?(<\/h1>)/',
                '$1' . $safe . '$2',
                $html,
                1
            ) ?? $html;
            $html = preg_replace(
                '/(<span aria-current="page">)[\s\S]*?(<\/span>)/',
                '$1' . $safe . '$2',
                $html,
                1
            ) ?? $html;
        }
        if (array_key_exists('subtitle', $dados)) {
            $html = gcv_pagina_atrativo_trocar_subtitulo($html, (string)$dados['subtitle']);
        }
        file_put_contents($file, $html);
        $rel = str_replace('\\', '/', substr($file, strlen(gcv_pagina_atrativo_root()) + 1));
        $arquivos[] = $rel;
        $prev = isset($atual[$lang]) && is_array($atual[$lang]) ? $atual[$lang] : [];
        if (trim($body) !== '') {
            $prev['bodyHtml'] = $body;
        }
        if (trim($side) !== '') {
            $prev['sidebarHtml'] = $side;
        }
        if ($title !== '') {
            $prev['title'] = $title;
        }
        if (array_key_exists('subtitle', $dados)) {
            $prev['subtitle'] = trim((string)$dados['subtitle']);
        }
        if ($prev) {
            $atual[$lang] = $prev;
        }
    }
    if ($atual) {
        $edits[$id] = $atual;
        $dir = dirname($editsFile);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        file_put_contents($editsFile, json_encode($edits, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
    }
    return $arquivos;
}
