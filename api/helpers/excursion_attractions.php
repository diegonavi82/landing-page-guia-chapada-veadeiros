<?php
declare(strict_types=1);

/**
 * Helpers: 1 a 4 atrativos por excursão (gcv_excursion_attractions).
 * gcv_excursions.attraction_id permanece como o primeiro (compatível com APIs antigas).
 */

/**
 * Remove pastas de data do WordPress (/YYYY/MM/) em URLs de mídia flat do site.
 * Ex.: /assets/img/imagens/2019/10/foto.jpg → /assets/img/imagens/foto.jpg
 */
function gcv_normalize_media_url(?string $url): string
{
    $url = trim((string)$url);
    if ($url === '') {
        return '';
    }
    $url = preg_replace('#(/assets/img/imagens)/\d{4}/\d{2}/#', '$1/', $url) ?? $url;
    $url = preg_replace('#(/imagens)/\d{4}/\d{2}/#', '$1/', $url) ?? $url;
    $url = preg_replace('#(/wp-content/uploads)/\d{4}/\d{2}/#', '/assets/img/imagens/', $url) ?? $url;
    return $url;
}

function gcv_excursion_normalize_attraction_ids(array $body): array
{
    $ids = [];
    if (isset($body['attraction_ids']) && is_array($body['attraction_ids'])) {
        foreach ($body['attraction_ids'] as $raw) {
            $id = (int)$raw;
            if ($id > 0 && !in_array($id, $ids, true)) {
                $ids[] = $id;
            }
        }
    } elseif (!empty($body['attraction_id'])) {
        $ids[] = (int)$body['attraction_id'];
    }
    return array_slice($ids, 0, 4);
}

function gcv_excursion_validate_attraction_ids(array $ids): ?string
{
    $n = count($ids);
    if ($n < 1) {
        return 'Selecione pelo menos 1 atrativo';
    }
    if ($n > 4) {
        return 'No máximo 4 atrativos por dia';
    }
    return null;
}

/** @return list<array{id:int,title_pt:?string,slug:?string,cover_url:?string,sort_order:int}> */
function gcv_excursion_load_attractions(int $excursionId): array
{
    $stmt = db()->prepare(
        'SELECT a.id, a.title_pt, a.title_en, a.title_es, a.slug, a.cover_url, a.entry_price_cents, x.sort_order
         FROM gcv_excursion_attractions x
         INNER JOIN gcv_attractions a ON a.id = x.attraction_id
         WHERE x.excursion_id = ?
         ORDER BY x.sort_order ASC, a.title_pt ASC'
    );
    $stmt->execute([$excursionId]);
    $rows = $stmt->fetchAll();
    if ($rows) {
        return array_map('gcv_excursion_map_attraction_row', $rows);
    }
    // Fallback legado
    $stmt = db()->prepare(
        'SELECT a.id, a.title_pt, a.title_en, a.title_es, a.slug, a.cover_url, a.entry_price_cents, 0 AS sort_order
         FROM gcv_excursions e
         INNER JOIN gcv_attractions a ON a.id = e.attraction_id
         WHERE e.id = ?'
    );
    $stmt->execute([$excursionId]);
    $one = $stmt->fetch();
    return $one ? [gcv_excursion_map_attraction_row($one)] : [];
}

/** @param array<string,mixed> $row */
function gcv_excursion_map_attraction_row(array $row): array
{
    if (isset($row['cover_url'])) {
        $row['cover_url'] = gcv_normalize_media_url((string)$row['cover_url']);
    }
    return $row;
}

function gcv_excursion_save_attractions(int $excursionId, array $attractionIds): void
{
    $ids = [];
    foreach ($attractionIds as $raw) {
        $id = (int)$raw;
        if ($id > 0 && !in_array($id, $ids, true)) {
            $ids[] = $id;
        }
    }
    $ids = array_slice($ids, 0, 4);
    if ($ids === []) {
        throw new InvalidArgumentException('Selecione pelo menos 1 atrativo');
    }

    db()->prepare('DELETE FROM gcv_excursion_attractions WHERE excursion_id = ?')->execute([$excursionId]);
    $ins = db()->prepare(
        'INSERT INTO gcv_excursion_attractions (excursion_id, attraction_id, sort_order) VALUES (?,?,?)'
    );
    foreach ($ids as $i => $aid) {
        $ins->execute([$excursionId, $aid, $i]);
    }
    // Principal = primeiro
    db()->prepare('UPDATE gcv_excursions SET attraction_id = ? WHERE id = ?')->execute([$ids[0], $excursionId]);
}

function gcv_excursion_titles_joined(array $attrRows, string $lang = 'pt'): string
{
    $key = 'title_' . $lang;
    $parts = [];
    foreach ($attrRows as $a) {
        $t = trim((string)($a[$key] ?? ''));
        if ($t === '') {
            $t = trim((string)($a['title_pt'] ?? ''));
        }
        if ($t !== '') {
            $parts[] = $t;
        }
    }
    return implode(' + ', $parts);
}

function gcv_attraction_is_combo(?string $title): bool
{
    return str_contains((string)$title, ' + ');
}

/** Catálogo: A–Z, com roteiros duplos por último. */
function gcv_sort_attractions_catalog(array $rows): array
{
    usort($rows, static function ($a, $b) {
        $ta = (string)($a['title_pt'] ?? '');
        $tb = (string)($b['title_pt'] ?? '');
        $ca = gcv_attraction_is_combo($ta) ? 1 : 0;
        $cb = gcv_attraction_is_combo($tb) ? 1 : 0;
        if ($ca !== $cb) {
            return $ca <=> $cb;
        }
        if (class_exists('Collator')) {
            $cmp = (new Collator('pt_BR'))->compare($ta, $tb);
            return is_int($cmp) ? $cmp : 0;
        }
        return strcasecmp($ta, $tb);
    });
    return $rows;
}

/** Caminho público do atrativo, ou vazio se não existir página HTML. */
function gcv_attraction_public_html_path(?string $slug): string
{
    $slug = trim((string)$slug);
    if ($slug === '' || !preg_match('/^[a-z0-9-]+$/i', $slug)) {
        return '';
    }
    $file = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'atrativos' . DIRECTORY_SEPARATOR . $slug . '.html';
    return is_file($file) ? ('atrativos/' . $slug . '.html') : '';
}

function gcv_attraction_fold_name(string $s): string
{
    $s = trim(mb_strtolower($s, 'UTF-8'));
    $map = [
        'á'=>'a','à'=>'a','ã'=>'a','â'=>'a','ä'=>'a',
        'é'=>'e','ê'=>'e','è'=>'e',
        'í'=>'i','ì'=>'i',
        'ó'=>'o','ô'=>'o','õ'=>'o','ò'=>'o',
        'ú'=>'u','ü'=>'u',
        'ç'=>'c',
    ];
    $s = strtr($s, $map);
    $s = preg_replace('/[^a-z0-9]+/', ' ', $s) ?? $s;
    return trim($s);
}

/**
 * Atrativos do catálogo extra (sem HTML próprio) e nomes de combo → página + foto.
 *
 * @return array<string, array{path:string, img:string}>
 */
function gcv_attraction_card_aliases(): array
{
    static $map = null;
    if ($map !== null) {
        return $map;
    }
    $img = static function (string $file): string {
        return '/assets/img/imagens/' . $file;
    };
    $page = static function (string $slug): string {
        return 'atrativos/' . $slug . '.html';
    };
    $complexo = 'cachoeira-complexo-rio-prata-guia-chapada-veadeiros-cavalcante';
    $complexoPage = $page($complexo);
    $rows = [
        'pratinha' => [$complexoPage, $img('complexo-cachoeiras-rio-prata-guia-chapada-veadeiros-cavalcante-1.jpg')],
        'rei do prata' => [$complexoPage, $img('complexo-rio-prata-cachoeira-rei-guia-chapada-veadeiros-cavalcante.jpg')],
        'pratinha-guia-chapada-veadeiros' => [$complexoPage, $img('complexo-cachoeiras-rio-prata-guia-chapada-veadeiros-cavalcante-1.jpg')],
        'rei-do-prata-guia-chapada-veadeiros' => [$complexoPage, $img('complexo-rio-prata-cachoeira-rei-guia-chapada-veadeiros-cavalcante.jpg')],
        'almecegas' => [$page('cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros'), $img('cachoeira-almecegas-guia-chapada-veadeiros-alto-paraiso-10.jpg')],
        'loquinhas' => [$page('cachoeira-loquinhas-guia-chapada-veadeiros-alto-paraiso'), $img('cachoeira-loquinhas-guia-chapada-veadeiros-alto-paraiso.jpg')],
        'anjos e arcanjos' => [$page('cachoeira-anjos-arcanjos-guia-chapada-veadeiros-alto-paraiso'), $img('cachoeira-arcanjos-anjos-guia-chapada-veadeiros-alto-paraiso.jpg')],
        'vale da lua' => [$page('vale-lua-guia-chapada-veadeiros-sao-jorge'), $img('vale-lua-guia-chapada-veadeiros-sao-jorge-1.jpg')],
        'segredo' => [$page('cachoeira-segredo-guia-chapada-veadeiros-sao-jorge'), $img('cachoeira-segredo-guia-chapada-veadeiros-sao-jorge-10.jpg')],
        'cordovil' => [$page('cachoeira-cordovil-poco-esmeralda-guia-chapada-veadeiros'), $img('cachoeira-cordovil-poco-esmeralda-guia-chapada-veadeiros-1.jpg')],
        'santa barbara' => [$page('cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante'), $img('cachoeira-santa-barbara-guia-chapada-veadeiros-cavalcante.jpg')],
        'cristais' => [$page('cachoeira-cristais-guia-chapada-veadeiros-alto-paraiso'), $img('cachoeira-cristais-veu-noiva-guia-chapada-veadeiros-alto-paraiso.jpg')],
        'cataratas dos couros' => [$page('cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso'), $img('cataratas-couros-guia-chapada-veadeiros-alto-paraiso-1.webp')],
    ];
    $map = [];
    foreach ($rows as $key => $pair) {
        $map[$key] = ['path' => $pair[0], 'img' => $pair[1]];
    }
    return $map;
}

/** @return array{path:string, img:string}|null */
function gcv_attraction_lookup_card_alias(string $titleOrSlug): ?array
{
    $folded = gcv_attraction_fold_name($titleOrSlug);
    if ($folded === '') {
        return null;
    }
    $aliases = gcv_attraction_card_aliases();
    return $aliases[$folded] ?? null;
}

/**
 * @param list<array<string,mixed>> $attrs
 * @return list<array<string,mixed>>
 */
function gcv_excursion_card_destinos(array $attrs, string $lang): array
{
    $out = [];
    foreach ($attrs as $a) {
        $key = 'title_' . $lang;
        $t = trim((string)($a[$key] ?? ''));
        if ($t === '') {
            $t = trim((string)($a['title_pt'] ?? ''));
        }
        $slug = (string)($a['slug'] ?? '');
        $page = gcv_attraction_public_html_path($slug);
        $cover = gcv_normalize_media_url((string)($a['cover_url'] ?? ''));
        $entryRaw = $a['entry_price_cents'] ?? null;
        $parts = preg_split('/\s*\+\s*/u', $t) ?: [];
        $parts = array_values(array_filter(array_map('trim', $parts), static fn($p) => $p !== ''));
        if (!$parts) {
            $parts = [$t !== '' ? $t : $slug];
        }
        $split = count($parts) > 1;
        foreach ($parts as $part) {
            $useCover = $split ? '' : $cover;
            $usePage = $split ? '' : $page;
            $alias = gcv_attraction_lookup_card_alias($part) ?? gcv_attraction_lookup_card_alias($slug);
            if ($alias) {
                if ($usePage === '') {
                    $usePage = $alias['path'];
                }
                if ($useCover === '') {
                    $useCover = $alias['img'];
                }
            }
            $item = [
                'destino' => $part,
                'cardImg' => $useCover,
                'atrativoPath' => $usePage,
                'title' => $part,
                'slug' => $slug,
                'path' => $usePage,
            ];
            if ($entryRaw !== null) {
                $item['valorIngresso'] = (int)round(((int)$entryRaw) / 100);
            }
            $out[] = $item;
            if (count($out) >= 4) {
                return $out;
            }
        }
    }
    return $out;
}
