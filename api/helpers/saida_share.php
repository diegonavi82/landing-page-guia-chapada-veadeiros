<?php
declare(strict_types=1);

/**
 * Link público de uma saída: /s/{cartId}
 * A prévia do WhatsApp é arara (esquerda) + foto do guia (direita).
 * O clique cai na home com o card de reserva aberto.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/excursion_status.php';
require_once __DIR__ . '/excursion_attractions.php';

if (!function_exists('gcv_guide_name_parts')) {
    /** @return array{0:string,1:string} */
    function gcv_guide_name_parts(string $legal): array
    {
        $particles = ['de', 'da', 'do', 'dos', 'das', 'e', 'di', 'du', 'del', 'van', 'von', 'y'];
        $parts = preg_split('/\s+/u', trim($legal)) ?: [];
        $parts = array_values(array_filter($parts, static fn ($part) => $part !== ''));
        if (!$parts) {
            return ['', ''];
        }
        $first = (string)$parts[0];
        $surname = '';
        for ($i = 1, $n = count($parts); $i < $n; $i++) {
            if (in_array(mb_strtolower((string)$parts[$i]), $particles, true)) {
                continue;
            }
            $surname = (string)$parts[$i];
            break;
        }
        return [$first, $surname];
    }
}

if (!function_exists('gcv_guide_initials')) {
    function gcv_guide_initials(string $legal): string
    {
        [$first, $surname] = gcv_guide_name_parts($legal);
        $a = $first !== '' ? mb_strtoupper(mb_substr($first, 0, 1)) : '';
        $b = $surname !== '' ? mb_strtoupper(mb_substr($surname, 0, 1)) : '';
        $letters = $a . $b;
        return $letters !== '' ? $letters . '.' : '';
    }
}

function gcv_saida_site_origin(): string
{
    return 'https://www.guiachapadaveadeiros.com';
}

function gcv_saida_slug(string $raw): string
{
    $slug = strtolower(trim($raw));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
    return trim($slug, '-');
}

function gcv_saida_city(string $name): string
{
    $map = [
        'Alto Paraíso de Goiás' => 'Alto Paraíso',
        'São João d\'Aliança' => 'São João d\'Aliança',
        'Teresina de Goiás' => 'Teresina de Goiás',
    ];
    $name = trim($name);
    return $map[$name] ?? $name;
}

/**
 * Tira a data repetida. O cart_slug já traz o dia; o id do card prefixa o mesmo dia de novo.
 * 2026-11-14-destino-2026-11-14-0820 → 2026-11-14-destino-0820
 */
function gcv_saida_collapse_cart_id(string $id): string
{
    $id = gcv_saida_slug($id);
    if (!preg_match('/^(\d{4}-\d{2}-\d{2})-(.+)$/', $id, $m)) {
        return $id;
    }
    $iso = $m[1];
    $rest = $m[2];
    if (!str_contains($rest, $iso)) {
        return $id;
    }
    $rest = str_replace('-' . $iso . '-', '-', $rest);
    if (str_ends_with($rest, '-' . $iso)) {
        $rest = substr($rest, 0, -strlen('-' . $iso));
    }
    $rest = trim($rest, '-');
    return $rest === '' ? $iso : ($iso . '-' . $rest);
}

/** Id público da saída: a data aparece uma vez. */
function gcv_saida_public_cart_id(array $exc): string
{
    $iso = substr((string)($exc['date_iso'] ?? ''), 0, 10);
    $slug = trim((string)($exc['cart_slug'] ?? ''));
    if ($slug === '') {
        $attrSlug = '';
        $id = (int)($exc['id'] ?? 0);
        if ($id > 0) {
            $attrs = gcv_excursion_load_attractions($id);
            $attrSlug = trim((string)($attrs[0]['slug'] ?? ''));
        }
        $hora = substr((string)($exc['departure_time'] ?? ''), 0, 5);
        $slug = ($attrSlug !== '' ? $attrSlug : 'excursao') . '-' . $iso . '-' . str_replace(':', '', $hora);
    }
    $slug = gcv_saida_slug($slug);
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $iso) && $slug !== '') {
        return gcv_saida_collapse_cart_id($iso . '-' . $slug);
    }
    return gcv_saida_collapse_cart_id($slug);
}

function gcv_saida_share_url(string $cartId, string $lang = 'pt'): string
{
    $cartId = gcv_saida_slug($cartId);
    if ($cartId === '') {
        return '';
    }
    $prefix = $lang === 'en' ? '/en' : ($lang === 'es' ? '/es' : '');
    return gcv_saida_site_origin() . $prefix . '/s/' . rawurlencode($cartId);
}

function gcv_saida_home_url(string $cartId, string $lang = 'pt'): string
{
    $cartId = gcv_saida_slug($cartId);
    $prefix = $lang === 'en' ? '/en/' : ($lang === 'es' ? '/es/' : '/');
    if ($cartId === '') {
        return gcv_saida_site_origin() . $prefix;
    }
    return gcv_saida_site_origin() . $prefix . '?saida=' . rawurlencode($cartId);
}

function gcv_saida_lang(string $lang): string
{
    return in_array($lang, ['pt', 'en', 'es'], true) ? $lang : 'pt';
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_saida_rows_on_date(string $date): array
{
    if (!function_exists('gcv_teste_logada')) {
        require_once __DIR__ . '/teste_acesso.php';
    }
    $verTeste = gcv_teste_logada();
    $select = 'SELECT e.id, e.status, e.date_iso, e.departure_time, e.cart_slug, e.attraction_id, e.guide_user_id,
            c.name AS city_name,
            u.name AS guide_name,
            g.full_name AS guide_full_name,
            g.photo_url AS guide_photo, g.photo_3x4_url AS guide_photo_3x4
         FROM gcv_excursions e
         INNER JOIN gcv_cities c ON c.id = e.departure_city_id
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         LEFT JOIN gcv_guides g ON g.user_id = e.guide_user_id
         WHERE e.date_iso = ? AND ';
    try {
        $stmt = db()->prepare($select . gcv_excursion_sql_public_live('e', $verTeste) . ' ORDER BY e.id ASC, g.id DESC');
        $stmt->execute([$date]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $rows = is_array($rows) ? $rows : [];
        return $verTeste ? $rows : gcv_teste_ocultar_excursao_publica($rows);
    } catch (Throwable $e) {
        try {
            $stmt = db()->prepare(
                $select . "e.status IN ('published','soldout') AND e.deleted_at IS NULL ORDER BY e.id ASC, g.id DESC"
            );
            $stmt->execute([$date]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $rows = is_array($rows) ? $rows : [];
            return $verTeste ? $rows : gcv_teste_ocultar_excursao_publica($rows);
        } catch (Throwable $e2) {
            error_log('gcv_saida_rows_on_date: ' . $e2->getMessage());
            return [];
        }
    }
}

/** @return array<string,mixed>|null */
function gcv_saida_find(string $cartId): ?array
{
    $cartId = gcv_saida_slug($cartId);
    if (!preg_match('/(\d{4}-\d{2}-\d{2})/', $cartId, $m)) {
        return null;
    }
    $collapsed = gcv_saida_collapse_cart_id($cartId);
    if (!str_starts_with($collapsed, $m[1] . '-')) {
        $collapsed = gcv_saida_collapse_cart_id($m[1] . '-' . $cartId);
    }
    $wantTransport = str_ends_with($collapsed, '-t');
    $want = $wantTransport ? substr($collapsed, 0, -2) : $collapsed;
    $best = null;
    foreach (gcv_saida_rows_on_date($m[1]) as $row) {
        $base = gcv_saida_public_cart_id($row);
        $match = $want === $base || $collapsed === $base;
        if (!$match) {
            continue;
        }
        $photo = trim((string)($row['guide_photo_3x4'] ?? '')) !== ''
            || trim((string)($row['guide_photo'] ?? '')) !== '';
        if ($best === null || ($photo && empty($best['_has_photo']))) {
            $row['_has_photo'] = $photo;
            $row['_saida_transport'] = $wantTransport;
            $best = $row;
        }
    }
    return $best;
}

function gcv_saida_guide_label(array $row): string
{
    $full = trim((string)($row['guide_full_name'] ?? ''));
    if ($full === '') {
        $full = trim((string)($row['guide_name'] ?? ''));
    }
    $photo = strtolower((string)($row['guide_photo_3x4'] ?? $row['guide_photo'] ?? ''));
    $low = mb_strtolower($full);
    if ($low === 'diego navi' || str_starts_with($low, 'diego navi ') || str_contains($photo, 'guia-diego-navi')) {
        return 'Diego Navi';
    }
    return gcv_guide_initials($full);
}

function gcv_saida_destino(array $row, string $lang): string
{
    $lang = gcv_saida_lang($lang);
    $id = (int)($row['id'] ?? 0);
    if ($id > 0) {
        $joined = trim(gcv_excursion_titles_joined(gcv_excursion_load_attractions($id), $lang));
        if ($joined !== '') {
            return $joined;
        }
    }
    $title = trim((string)($row['attraction_title'] ?? ''));
    return $title !== '' ? $title : 'Passeio';
}

function gcv_saida_date_label(string $iso, string $lang): string
{
    if (!preg_match('/^\d{4}-(\d{2})-(\d{2})$/', substr($iso, 0, 10), $m)) {
        return '';
    }
    $months = [
        'pt' => [1 => 'jan', 2 => 'fev', 3 => 'mar', 4 => 'abr', 5 => 'mai', 6 => 'jun', 7 => 'jul', 8 => 'ago', 9 => 'set', 10 => 'out', 11 => 'nov', 12 => 'dez'],
        'en' => [1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr', 5 => 'May', 6 => 'Jun', 7 => 'Jul', 8 => 'Aug', 9 => 'Sep', 10 => 'Oct', 11 => 'Nov', 12 => 'Dec'],
        'es' => [1 => 'ene', 2 => 'feb', 3 => 'mar', 4 => 'abr', 5 => 'may', 6 => 'jun', 7 => 'jul', 8 => 'ago', 9 => 'sep', 10 => 'oct', 11 => 'nov', 12 => 'dic'],
    ];
    $lang = gcv_saida_lang($lang);
    $mon = (int)$m[1];
    $day = (int)$m[2];
    $name = $months[$lang][$mon] ?? '';
    if ($name === '') {
        return '';
    }
    return $lang === 'en' ? ($name . ' ' . $day) : ($day . ' ' . $name);
}

function gcv_saida_time_label(string $time, string $lang): string
{
    if (!preg_match('/^(\d{2}):(\d{2})/', $time, $m)) {
        return '';
    }
    $h = (int)$m[1];
    $min = $m[2];
    if (gcv_saida_lang($lang) === 'en') {
        return $min === '00' ? ($h . ':00') : ($h . ':' . $min);
    }
    return $min === '00' ? ($h . 'h') : ($h . 'h' . $min);
}

/**
 * @return array{cartId:string,url:string,title:string,description:string,image:string,guideId:int}
 */
function gcv_saida_share_bundle(array $row, string $lang = 'pt'): array
{
    $lang = gcv_saida_lang($lang);
    $cartId = gcv_saida_public_cart_id($row);
    if (!empty($row['_saida_transport']) && $cartId !== '' && !str_ends_with($cartId, '-t')) {
        $cartId .= '-t';
    }
    $destino = gcv_saida_destino($row, $lang);
    $guia = gcv_saida_guide_label($row);
    $data = gcv_saida_date_label((string)($row['date_iso'] ?? ''), $lang);
    $hora = gcv_saida_time_label((string)($row['departure_time'] ?? ''), $lang);
    $cidade = gcv_saida_city((string)($row['city_name'] ?? $row['departure_city_name'] ?? ''));
    $bits = array_values(array_filter([$data, $hora, $cidade], static fn ($v) => $v !== ''));
    $when = implode(', ', $bits);

    if ($lang === 'en') {
        $description = 'Next departure to ' . $destino;
        if ($guia !== '') {
            $description .= ' with guide ' . $guia;
        }
    } elseif ($lang === 'es') {
        $description = 'Próxima salida a ' . $destino;
        if ($guia !== '') {
            $description .= ' con guía ' . $guia;
        }
    } else {
        $description = 'Próxima saída para ' . $destino;
        if ($guia !== '') {
            $description .= ' com guia ' . $guia;
        }
    }
    if ($when !== '') {
        $description .= ', ' . $when;
    }
    $description .= '.';

    $titleBits = array_values(array_filter([$destino, $data, $hora], static fn ($v) => $v !== ''));
    $title = implode(' · ', $titleBits);
    if ($title === '') {
        $title = $destino;
    }

    $guideId = (int)($row['guide_user_id'] ?? 0);
    $photo = trim((string)($row['guide_photo_3x4'] ?? ''));
    if ($photo === '') {
        $photo = trim((string)($row['guide_photo'] ?? ''));
    }
    $bust = substr(sha1($guideId . '|' . $photo), 0, 8);
    $image = gcv_saida_site_origin() . '/api/og-saida.php?id=' . rawurlencode($cartId) . '&g=' . $guideId . '&p=' . $bust;

    return [
        'cartId' => $cartId,
        'url' => gcv_saida_share_url($cartId, $lang),
        'title' => $title,
        'description' => $description,
        'image' => $image,
        'guideId' => $guideId,
    ];
}

/** @return array{cartId:string,url:string,title:string,description:string,image:string,guideId:int} */
function gcv_saida_share_bundle_by_id(int $excursionId, string $lang = 'pt'): array
{
    $empty = ['cartId' => '', 'url' => '', 'title' => '', 'description' => '', 'image' => '', 'guideId' => 0];
    if ($excursionId <= 0) {
        return $empty;
    }
    try {
        $stmt = db()->prepare(
            'SELECT e.id, e.date_iso, e.departure_time, e.cart_slug, e.attraction_id, e.guide_user_id,
                    c.name AS city_name,
                    u.name AS guide_name,
                    g.full_name AS guide_full_name,
                    g.photo_url AS guide_photo, g.photo_3x4_url AS guide_photo_3x4
             FROM gcv_excursions e
             LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
             LEFT JOIN gcv_users u ON u.id = e.guide_user_id
             LEFT JOIN gcv_guides g ON g.user_id = e.guide_user_id
             WHERE e.id = ? AND e.deleted_at IS NULL
             ORDER BY g.id DESC
             LIMIT 1'
        );
        $stmt->execute([$excursionId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        error_log('gcv_saida_share_bundle_by_id: ' . $e->getMessage());
        return $empty;
    }
    if (!$row) {
        return $empty;
    }
    return gcv_saida_share_bundle($row, $lang);
}

function gcv_saida_h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** @return array{binary:string} */
function gcv_saida_read_image(string $ref): array
{
    $empty = ['binary' => ''];
    $ref = trim($ref);
    if ($ref === '') {
        return $empty;
    }
    if (preg_match('#^https?://#i', $ref)) {
        $host = strtolower((string)parse_url($ref, PHP_URL_HOST));
        if (!in_array($host, ['www.guiachapadaveadeiros.com', 'guiachapadaveadeiros.com'], true)) {
            return $empty;
        }
        $path = (string)parse_url($ref, PHP_URL_PATH);
    } else {
        $path = $ref;
    }
    $path = rawurldecode(str_replace('\\', '/', $path));
    $path = ltrim($path, '/');
    if ($path === '' || str_contains($path, '..') || !str_starts_with($path, 'assets/img/')) {
        return $empty;
    }
    $full = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $path);
    if (!is_file($full) || !is_readable($full)) {
        return $empty;
    }
    $size = filesize($full);
    if ($size === false || $size <= 0 || $size > 4000000) {
        return $empty;
    }
    $bin = file_get_contents($full);
    return is_string($bin) && $bin !== '' ? ['binary' => $bin] : $empty;
}
