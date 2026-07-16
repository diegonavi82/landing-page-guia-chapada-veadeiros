<?php
declare(strict_types=1);

/**
 * Lista pública de excursões (próximas saídas) no formato do carrossel da home.
 * GET /api/excursions/carousel.php?lang=pt
 *
 * Resposta: { ok, data: { pt: [...], en: [...], es: [...] } }
 * Se não houver publicadas no MySQL, retorna ok + arrays vazios (o JS usa o payload estático).
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/excursion_attractions.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=60');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_response(false, null, 'Método não permitido', 405);
}

try {
    gcv_cms_ensure_schema();
} catch (Throwable $e) {
    json_response(true, ['pt' => [], 'en' => [], 'es' => []]);
}

$months = [
    'pt' => [1=>'janeiro',2=>'fevereiro',3=>'março',4=>'abril',5=>'maio',6=>'junho',7=>'julho',8=>'agosto',9=>'setembro',10=>'outubro',11=>'novembro',12=>'dezembro'],
    'en' => [1=>'January',2=>'February',3=>'March',4=>'April',5=>'May',6=>'June',7=>'July',8=>'August',9=>'September',10=>'October',11=>'November',12=>'December'],
    'es' => [1=>'enero',2=>'febrero',3=>'marzo',4=>'abril',5=>'mayo',6=>'junio',7=>'julio',8=>'agosto',9=>'septiembre',10=>'octubre',11=>'noviembre',12=>'diciembre'],
];
$weekdays = [
    'pt' => ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'],
    'en' => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
    'es' => ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'],
];

try {
    $rows = db()->query(
        'SELECT e.id, e.status, e.date_iso, e.departure_time, e.price_cents, e.quorum, e.max_people, e.booked_people,
                e.include_entry, e.cart_slug, e.attraction_id,
                c.name AS city_name,
                u.name AS guide_name,
                g.nickname AS guide_nickname, g.photo_url AS guide_photo, g.photo_3x4_url AS guide_photo_3x4
         FROM gcv_excursions e
         INNER JOIN gcv_cities c ON c.id = e.departure_city_id
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         LEFT JOIN gcv_guides g ON g.user_id = e.guide_user_id
         WHERE e.status IN ("published","soldout")
           AND e.date_iso >= CURDATE()
         ORDER BY e.date_iso ASC, e.departure_time ASC
         LIMIT 100'
    )->fetchAll();
} catch (Throwable $e) {
    try {
        $rows = db()->query(
            'SELECT e.id, e.status, e.date_iso, e.departure_time, e.price_cents, e.quorum, e.max_people, e.booked_people,
                    e.include_entry, NULL AS cart_slug, e.attraction_id,
                    c.name AS city_name,
                    u.name AS guide_name,
                    g.nickname AS guide_nickname, g.photo_url AS guide_photo, g.photo_3x4_url AS guide_photo_3x4
             FROM gcv_excursions e
             INNER JOIN gcv_cities c ON c.id = e.departure_city_id
             LEFT JOIN gcv_users u ON u.id = e.guide_user_id
             LEFT JOIN gcv_guides g ON g.user_id = e.guide_user_id
             WHERE e.status IN ("published","soldout")
               AND e.date_iso >= CURDATE()
             ORDER BY e.date_iso ASC, e.departure_time ASC
             LIMIT 100'
        )->fetchAll();
    } catch (Throwable $e2) {
        json_response(true, ['pt' => [], 'en' => [], 'es' => []]);
    }
}

function gcv_short_city(string $name): string
{
    $map = [
        'Alto Paraíso de Goiás' => 'Alto Paraíso',
        'São João d\'Aliança' => 'São João d\'Aliança',
        'Teresina de Goiás' => 'Teresina de Goiás',
    ];
    return $map[$name] ?? $name;
}

function gcv_row_to_card(array $r, string $lang, array $months, array $weekdays): array
{
    $attrs = gcv_excursion_load_attractions((int)$r['id']);
    $ts = strtotime((string)$r['date_iso'] . ' 12:00:00');
    if ($ts === false) $ts = time();
    $m = (int)date('n', $ts);
    $w = (int)date('w', $ts);
    $day = (string)((int)date('j', $ts));
    $hora = substr((string)$r['departure_time'], 0, 5);
    $booked = (int)$r['booked_people'];
    $max = max(1, (int)$r['max_people']);
    $quorum = max(1, (int)$r['quorum']);
    $vagas = max(0, $max - $booked);
    $destino = gcv_excursion_titles_joined($attrs, $lang);
    $primary = $attrs[0] ?? null;
    $slug = (string)($primary['slug'] ?? '');
    $cover = (string)($primary['cover_url'] ?? '');
    $entryRaw = $primary['entry_price_cents'] ?? null;
    $cartSlug = trim((string)($r['cart_slug'] ?? ''));
    if ($cartSlug === '') {
        $cartSlug = ($slug !== '' ? $slug : 'excursao') . '-' . $r['date_iso'] . '-' . str_replace(':', '', $hora);
    }
    $guideName = (string)($r['guide_nickname'] ?: $r['guide_name'] ?: '');
    $guidePhoto = (string)($r['guide_photo'] ?: $r['guide_photo_3x4'] ?: '');
    $entry = $entryRaw !== null ? ((int)$entryRaw / 100) : null;

    $card = [
        'id' => (int)$r['id'],
        'dayNum' => $day,
        'monthName' => $months[$lang][$m] ?? $months['pt'][$m],
        'weekday' => $weekdays[$lang][$w] ?? $weekdays['pt'][$w],
        'dateISO' => (string)$r['date_iso'],
        'embarque' => gcv_short_city((string)$r['city_name']),
        'destino' => $destino,
        'destinos' => array_map(static function ($a) use ($lang) {
            $key = 'title_' . $lang;
            $t = trim((string)($a[$key] ?? ''));
            if ($t === '') $t = (string)($a['title_pt'] ?? '');
            $slug = (string)($a['slug'] ?? '');
            $cover = (string)($a['cover_url'] ?? '');
            $entryRaw = $a['entry_price_cents'] ?? null;
            $item = [
                // Campos que o carrossel JS já usa (payload estático)
                'destino' => $t,
                'cardImg' => $cover,
                'atrativoPath' => $slug !== '' ? ('atrativos/' . $slug . '.html') : '',
                // Aliases (compat)
                'title' => $t,
                'slug' => $slug,
                'path' => $slug !== '' ? ('atrativos/' . $slug . '.html') : '',
            ];
            if ($entryRaw !== null) {
                $item['valorIngresso'] = (int)round(((int)$entryRaw) / 100);
            }
            return $item;
        }, $attrs),
        'cartSlug' => $cartSlug,
        'hora' => $hora,
        'valor' => (int)round(((int)$r['price_cents']) / 100),
        'confirmada' => $booked >= $quorum,
        'pessoasInscritas' => $booked,
        'grupoMaximo' => $max,
        'vagasRestantes' => $vagas,
        'cardImg' => $cover,
        'atrativoPath' => $slug !== '' ? ('atrativos/' . $slug . '.html') : '',
        'status' => (string)$r['status'],
    ];
    if ($guideName !== '') {
        $card['guiaNome'] = $guideName;
        if ($guidePhoto !== '') $card['guiaFoto'] = $guidePhoto;
    }
    if ($entry !== null) {
        $card['valorIngresso'] = $entry;
        if (!empty($r['include_entry'])) $card['inclEntradas'] = true;
    }
    return $card;
}

$out = ['pt' => [], 'en' => [], 'es' => []];
foreach ($rows as $r) {
    foreach (['pt', 'en', 'es'] as $lang) {
        $out[$lang][] = gcv_row_to_card($r, $lang, $months, $weekdays);
    }
}

json_response(true, $out);
