<?php
declare(strict_types=1);

/**
 * Helpers: 1 a 3 experiências por excursão (gcv_excursion_attractions).
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
    $url = preg_replace('#https?://(?:www\.)?guiachapadaveadeiros\.com#i', '', $url) ?? $url;
    $url = preg_replace('#(/assets/img/imagens)/\d{4}/\d{2}/#', '$1/', $url) ?? $url;
    $url = preg_replace('#(?<!/assets/img)(/imagens)(?:/\d{4}/\d{2})?/#', '/assets/img/imagens/', $url) ?? $url;
    $url = preg_replace('#(/wp-content/uploads)(?:/\d{4}/\d{2})?/#', '/assets/img/imagens/', $url) ?? $url;
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
    return $ids;
}

function gcv_excursion_validate_attraction_ids(array $ids): ?string
{
    $n = count($ids);
    if ($n < 1) {
        return 'Selecione pelo menos 1 atrativo';
    }
    if ($n > 3) {
        return 'No máximo 3 experiências por dia';
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

/**
 * Atrativos de várias saídas numa consulta só.
 *
 * @param list<int> $excursionIds
 * @return array<int,list<array<string,mixed>>>
 */
function gcv_excursion_load_attractions_map(array $excursionIds): array
{
    $ids = [];
    foreach ($excursionIds as $raw) {
        $id = (int)$raw;
        if ($id > 0) {
            $ids[$id] = $id;
        }
    }
    $ids = array_values($ids);
    $map = [];
    if (!$ids) {
        return $map;
    }
    $in = implode(',', $ids);
    $rows = db()->query(
        'SELECT x.excursion_id, a.id, a.title_pt, a.title_en, a.title_es, a.slug, a.cover_url, a.entry_price_cents, x.sort_order
         FROM gcv_excursion_attractions x
         INNER JOIN gcv_attractions a ON a.id = x.attraction_id
         WHERE x.excursion_id IN (' . $in . ')
         ORDER BY x.excursion_id ASC, x.sort_order ASC, a.title_pt ASC'
    )->fetchAll();
    foreach ($rows as $row) {
        $eid = (int)$row['excursion_id'];
        unset($row['excursion_id']);
        $map[$eid][] = gcv_excursion_map_attraction_row($row);
    }
    $missing = [];
    foreach ($ids as $id) {
        if (empty($map[$id])) {
            $missing[] = $id;
        }
    }
    if ($missing) {
        $legacy = db()->query(
            'SELECT e.id AS excursion_id, a.id, a.title_pt, a.title_en, a.title_es, a.slug, a.cover_url, a.entry_price_cents, 0 AS sort_order
             FROM gcv_excursions e
             INNER JOIN gcv_attractions a ON a.id = e.attraction_id
             WHERE e.id IN (' . implode(',', $missing) . ')'
        )->fetchAll();
        foreach ($legacy as $row) {
            $eid = (int)$row['excursion_id'];
            if (!empty($map[$eid])) {
                continue;
            }
            unset($row['excursion_id']);
            $map[$eid] = [gcv_excursion_map_attraction_row($row)];
        }
    }
    return $map;
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
    if ($ids === []) {
        throw new InvalidArgumentException('Selecione pelo menos 1 atrativo');
    }
    if (count($ids) > 3) {
        throw new InvalidArgumentException('No máximo 3 experiências por dia');
    }

    db()->prepare('DELETE FROM gcv_excursion_attractions WHERE excursion_id = ?')->execute([$excursionId]);
    $ins = db()->prepare(
        'INSERT INTO gcv_excursion_attractions (excursion_id, attraction_id, sort_order) VALUES (?,?,?)'
    );
    foreach ($ids as $i => $aid) {
        $ins->execute([$excursionId, $aid, $i]);
    }
    // Principal = primeiro. A excursão aponta para o passeio desse conjunto.
    db()->prepare('UPDATE gcv_excursions SET attraction_id = ? WHERE id = ?')->execute([$ids[0], $excursionId]);
    try {
        if (!function_exists('gcv_excursion_bind_passeio')) {
            require_once __DIR__ . '/experiencias.php';
        }
        gcv_excursion_bind_passeio(db(), $excursionId);
    } catch (Throwable $e) {
        error_log('bind passeio: ' . $e->getMessage());
    }
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
        'caracol' => [$page('caracol-guia-chapada-veadeiros'), $img('cachoeira-caracol-poco-guia-chapada-veadeiros-alto-paraiso.jpg')],
        'caracol guia chapada veadeiros' => [$page('caracol-guia-chapada-veadeiros'), $img('cachoeira-caracol-poco-guia-chapada-veadeiros-alto-paraiso.jpg')],
        'cachoeira caracol' => [$page('caracol-guia-chapada-veadeiros'), $img('cachoeira-caracol-poco-guia-chapada-veadeiros-alto-paraiso.jpg')],
        'caracol-guia-chapada-veadeiros' => [$page('caracol-guia-chapada-veadeiros'), $img('cachoeira-caracol-poco-guia-chapada-veadeiros-alto-paraiso.jpg')],
        'canjica e aguas lindas' => [$page('canjica-aguas-lindas-guia-chapada-veadeiros'), $img('complexo-aguas-lindas-canjica-guia-chapada-veadeiros-cavalcante.jpg')],
        'aguas lindas e canjica' => [$page('canjica-aguas-lindas-guia-chapada-veadeiros'), $img('complexo-aguas-lindas-canjica-guia-chapada-veadeiros-cavalcante.jpg')],
        'canjica-aguas-lindas-guia-chapada-veadeiros' => [$page('canjica-aguas-lindas-guia-chapada-veadeiros'), $img('complexo-aguas-lindas-canjica-guia-chapada-veadeiros-cavalcante.jpg')],
        'dragao' => [$page('dragao-4x4-guia-chapada-veadeiros'), $img('cachoeira-do-dragao-guia-chapada-veadeiros.jpg')],
        'cachoeira do dragao' => [$page('dragao-4x4-guia-chapada-veadeiros'), $img('cachoeira-do-dragao-guia-chapada-veadeiros.jpg')],
        'dragao-4x4-guia-chapada-veadeiros' => [$page('dragao-4x4-guia-chapada-veadeiros'), $img('cachoeira-do-dragao-guia-chapada-veadeiros.jpg')],
        'simao correia' => [$page('simao-correia-guia-chapada-veadeiros'), $img('cachoeira-simao-correia-guia-chapada-veadeiros.jpg')],
        'simao-correia-guia-chapada-veadeiros' => [$page('simao-correia-guia-chapada-veadeiros'), $img('cachoeira-simao-correia-guia-chapada-veadeiros.jpg')],
        'bocaina de farias' => [$page('bocaina-de-farias-guia-chapada-veadeiros'), $img('cachoeira-bocaina-de-farias-guia-chapada-veadeiros.jpg')],
        'bocaina de farias guia chapada veadeiros' => [$page('bocaina-de-farias-guia-chapada-veadeiros'), $img('cachoeira-bocaina-de-farias-guia-chapada-veadeiros.jpg')],
        'boqueirao' => [$page('boqueirao-guia-chapada-veadeiros'), $img('cachoeira-boqueirao-guia-chapada-veadeiros-cavalcante.jpg')],
        'boqueirao guia chapada veadeiros' => [$page('boqueirao-guia-chapada-veadeiros'), $img('cachoeira-boqueirao-guia-chapada-veadeiros-cavalcante.jpg')],
        'candaru' => [$page('candaru-guia-chapada-veadeiros'), $img('cachoeira-candaru-guia-chapada-veadeiros-cavalcante.jpg')],
        'candaru guia chapada veadeiros' => [$page('candaru-guia-chapada-veadeiros'), $img('cachoeira-candaru-guia-chapada-veadeiros-cavalcante.jpg')],
        'capivara' => [$page('capivara-guia-chapada-veadeiros'), $img('cachoeira-capivara-guia-chapada-veadeiros-cavalcante.jpg')],
        'capivara guia chapada veadeiros' => [$page('capivara-guia-chapada-veadeiros'), $img('cachoeira-capivara-guia-chapada-veadeiros-cavalcante.jpg')],
        'catoa' => [$page('catoa-guia-chapada-veadeiros'), $img('cachoeira-catoa-guia-chapada-veadeiros-cavalcante.jpg')],
        'catoa guia chapada veadeiros' => [$page('catoa-guia-chapada-veadeiros'), $img('cachoeira-catoa-guia-chapada-veadeiros-cavalcante.jpg')],
        'chapada alta' => [$page('chapada-alta-guia-chapada-veadeiros'), $img('chapada-alta-guia-chapada-veadeiros-alto-paraiso.jpg')],
        'chapada alta guia chapada veadeiros' => [$page('chapada-alta-guia-chapada-veadeiros'), $img('chapada-alta-guia-chapada-veadeiros-alto-paraiso.jpg')],
        'guardiao' => [$page('guardiao-4x4-guia-chapada-veadeiros'), $img('cachoeira-do-guardiao-guia-chapada-veadeiros-cavalcante.jpg')],
        'guardiao 4x4 guia chapada veadeiros' => [$page('guardiao-4x4-guia-chapada-veadeiros'), $img('cachoeira-do-guardiao-guia-chapada-veadeiros-cavalcante.jpg')],
        'lajeado' => [$page('lajeado-guia-chapada-veadeiros'), $img('cachoeira-do-lajeado-guia-chapada-veadeiros-sao-jorge.jpg')],
        'lajeado guia chapada veadeiros' => [$page('lajeado-guia-chapada-veadeiros'), $img('cachoeira-do-lajeado-guia-chapada-veadeiros-sao-jorge.jpg')],
        'morada do sol' => [$page('morada-do-sol-guia-chapada-veadeiros'), $img('complexo-morada-do-sol-guia-chapada-veadeiros-sao-jorge.jpg')],
        'morada do sol guia chapada veadeiros' => [$page('morada-do-sol-guia-chapada-veadeiros'), $img('complexo-morada-do-sol-guia-chapada-veadeiros-sao-jorge.jpg')],
        'parque nacional noturno' => [$page('parque-nacional-noturno-guia-chapada-veadeiros'), $img('parque-nacional-noturno-guia-chapada-veadeiros-sao-jorge.jpg')],
        'parque nacional noturno guia chapada veadeiros' => [$page('parque-nacional-noturno-guia-chapada-veadeiros'), $img('parque-nacional-noturno-guia-chapada-veadeiros-sao-jorge.jpg')],
        'raizama' => [$page('raizama-guia-chapada-veadeiros'), $img('santuario-raizama-guia-chapada-veadeiros-sao-jorge.jpg')],
        'raizama guia chapada veadeiros' => [$page('raizama-guia-chapada-veadeiros'), $img('santuario-raizama-guia-chapada-veadeiros-sao-jorge.jpg')],
        'sertao zen' => [$page('sertao-zen-guia-chapada-veadeiros'), $img('sertao-zen-guia-chapada-veadeiros-alto-paraiso-2.jpg')],
        'sertao zen guia chapada veadeiros' => [$page('sertao-zen-guia-chapada-veadeiros'), $img('sertao-zen-guia-chapada-veadeiros-alto-paraiso-2.jpg')],
        'veredas' => [$page('veredas-guia-chapada-veadeiros'), $img('complexo-veredas-guia-chapada-veadeiros-cavalcante.jpg')],
        'veredas guia chapada veadeiros' => [$page('veredas-guia-chapada-veadeiros'), $img('complexo-veredas-guia-chapada-veadeiros-cavalcante.jpg')],
        'sao felix' => [$page('sao-felix-guia-chapada-veadeiros'), $img('cachoeira-sao-felix-guia-chapada-veadeiros-cavalcante.jpg')],
        'sao felix guia chapada veadeiros' => [$page('sao-felix-guia-chapada-veadeiros'), $img('cachoeira-sao-felix-guia-chapada-veadeiros-cavalcante.jpg')],
        'cachoeira sao felix' => [$page('sao-felix-guia-chapada-veadeiros'), $img('cachoeira-sao-felix-guia-chapada-veadeiros-cavalcante.jpg')],
        'mirante da janela' => [
            $page('mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge'),
            $img('mirante-janela-guia-chapada-veadeiros-sao-jorge-parque-nacional-1.jpg'),
        ],
        'mirante da janela noturno' => [
            $page('mirante-da-janela-noturno-guia-chapada-veadeiros'),
            $img('mirante-da-janela-noturno-guia-chapada-veadeiros-sao-jorge.jpg'),
        ],
        'mirante-da-janela-noturno-guia-chapada-veadeiros' => [
            $page('mirante-da-janela-noturno-guia-chapada-veadeiros'),
            $img('mirante-da-janela-noturno-guia-chapada-veadeiros-sao-jorge.jpg'),
        ],
        'mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge' => [
            $page('mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge'),
            $img('mirante-janela-guia-chapada-veadeiros-sao-jorge-parque-nacional-1.jpg'),
        ],
    ];
    $map = [];
    foreach ($rows as $key => $pair) {
        $map[gcv_attraction_fold_name($key)] = ['path' => $pair[0], 'img' => $pair[1]];
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

/** Capa do catálogo. Se o banco está vazio, usa a foto da página. Recorte de mapa não entra. */
function gcv_attraction_catalog_image(string $cover, string $title = '', string $slug = ''): string
{
    $cover = gcv_normalize_media_url($cover);
    if ($cover !== '') {
        return $cover;
    }
    foreach ([$slug, $title] as $key) {
        $alias = gcv_attraction_lookup_card_alias($key);
        $img = (string)($alias['img'] ?? '');
        if ($img !== '' && !str_contains($img, '-mapa.')) {
            return $img;
        }
    }
    return '';
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
        $altSuffix = [
            'pt' => ' — Guia Chapada Veadeiros (GCV)',
            'en' => ' — Guia Chapada Veadeiros (GCV)',
            'es' => ' — Guia Chapada Veadeiros (GCV)',
        ];
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
                'cardImgAlt' => $part !== ''
                    ? ($part . ($altSuffix[$lang] ?? $altSuffix['pt']))
                    : 'Guia Chapada Veadeiros (GCV)',
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
