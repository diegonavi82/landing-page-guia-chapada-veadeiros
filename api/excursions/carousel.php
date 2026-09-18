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
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/excursion_status.php';
require_once __DIR__ . '/../helpers/marketplace_schema.php';
require_once __DIR__ . '/../helpers/excursion_attractions.php';
require_once __DIR__ . '/../helpers/google_places.php';
require_once __DIR__ . '/../helpers/guide_languages.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=60');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    json_response(false, null, 'Método não permitido', 405);
}

try {
    gcv_cms_ensure_schema();
    if (function_exists('gcv_marketplace_ensure_schema')) {
        gcv_marketplace_ensure_schema();
    }
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
                e.preconfirmed_people,
                e.include_transport, e.include_entry, e.cart_slug, e.attraction_id, e.meeting_point,
                e.meeting_point_place_id, e.meeting_point_lat, e.meeting_point_lng,
                e.offer_transport, e.price_transport_cents, e.quorum_transport, e.max_people_transport,
                e.booked_people_transport,
                e.created_by_origin, e.business_mode, e.approved_at, e.approved_by, e.created_by, e.guide_user_id, e.deleted_at,
                c.name AS city_name,
                u.name AS guide_name,
                g.nickname AS guide_nickname, g.full_name AS guide_full_name,
                g.photo_url AS guide_photo, g.photo_3x4_url AS guide_photo_3x4,
                g.phone AS guide_phone, g.phone_ddi AS guide_phone_ddi,
                g.bio_pt AS guide_bio_pt, g.bio_en AS guide_bio_en, g.bio_es AS guide_bio_es,
                g.languages_json AS guide_languages_json, g.user_id AS guide_user_id
         FROM gcv_excursions e
         INNER JOIN gcv_cities c ON c.id = e.departure_city_id
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         LEFT JOIN gcv_guides g ON g.user_id = e.guide_user_id
         WHERE ' . gcv_excursion_sql_public_live('e') . '
           AND e.date_iso >= CURDATE()
         ORDER BY e.date_iso ASC, e.departure_time ASC
         LIMIT 100'
    )->fetchAll();
} catch (Throwable $e) {
    try {
        $rows = db()->query(
            'SELECT e.id, e.status, e.date_iso, e.departure_time, e.price_cents, e.quorum, e.max_people, e.booked_people,
                    0 AS preconfirmed_people,
                    e.include_transport, e.include_entry, e.cart_slug, e.attraction_id, e.meeting_point,
                    NULL AS meeting_point_place_id, NULL AS meeting_point_lat, NULL AS meeting_point_lng,
                    c.name AS city_name,
                    u.name AS guide_name,
                    g.nickname AS guide_nickname, g.full_name AS guide_full_name,
                    g.photo_url AS guide_photo, g.photo_3x4_url AS guide_photo_3x4,
                    g.phone AS guide_phone, g.phone_ddi AS guide_phone_ddi,
                    g.bio_pt AS guide_bio_pt, g.bio_en AS guide_bio_en, g.bio_es AS guide_bio_es,
                    g.languages_json AS guide_languages_json, g.user_id AS guide_user_id
             FROM gcv_excursions e
             INNER JOIN gcv_cities c ON c.id = e.departure_city_id
             LEFT JOIN gcv_users u ON u.id = e.guide_user_id
             LEFT JOIN gcv_guides g ON g.user_id = e.guide_user_id
             WHERE e.status IN ("published","soldout")
               AND e.date_iso >= CURDATE()
               AND e.deleted_at IS NULL
             ORDER BY e.date_iso ASC, e.departure_time ASC
             LIMIT 100'
        )->fetchAll();
    } catch (Throwable $e2) {
        try {
            $rows = db()->query(
                'SELECT e.id, e.status, e.date_iso, e.departure_time, e.price_cents, e.quorum, e.max_people, e.booked_people,
                        0 AS preconfirmed_people,
                        e.include_transport, e.include_entry, NULL AS cart_slug, e.attraction_id, NULL AS meeting_point,
                        NULL AS meeting_point_place_id, NULL AS meeting_point_lat, NULL AS meeting_point_lng,
                        c.name AS city_name,
                        u.name AS guide_name,
                        g.nickname AS guide_nickname, g.full_name AS guide_full_name,
                        g.photo_url AS guide_photo, g.photo_3x4_url AS guide_photo_3x4,
                        g.phone AS guide_phone, g.phone_ddi AS guide_phone_ddi,
                        g.bio_pt AS guide_bio_pt, g.bio_en AS guide_bio_en, g.bio_es AS guide_bio_es,
                        g.languages_json AS guide_languages_json, g.user_id AS guide_user_id
                 FROM gcv_excursions e
                 INNER JOIN gcv_cities c ON c.id = e.departure_city_id
                 LEFT JOIN gcv_users u ON u.id = e.guide_user_id
                 LEFT JOIN gcv_guides g ON g.user_id = e.guide_user_id
                 WHERE e.status IN ("published","soldout")
                   AND e.date_iso >= CURDATE()
                 ORDER BY e.date_iso ASC, e.departure_time ASC
                 LIMIT 100'
            )->fetchAll();
        } catch (Throwable $e3) {
            json_response(true, ['pt' => [], 'en' => [], 'es' => []]);
        }
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

function gcv_format_guide_phone(?string $ddi, ?string $phone): string
{
    $digits = preg_replace('/\D+/', '', (string)$phone);
    if ($digits === '') {
        return '';
    }
    $ddi = trim((string)$ddi);
    if ($ddi === '') {
        $ddi = '+55';
    }
    if ($ddi[0] !== '+') {
        $ddi = '+' . ltrim($ddi, '+');
    }
    // Formato BR comum: +55 (62) 98250-6891
    if ($ddi === '+55' && strlen($digits) >= 10) {
        $ddd = substr($digits, 0, 2);
        $rest = substr($digits, 2);
        if (strlen($rest) === 9) {
            return $ddi . ' (' . $ddd . ') ' . substr($rest, 0, 5) . '-' . substr($rest, 5);
        }
        if (strlen($rest) === 8) {
            return $ddi . ' (' . $ddd . ') ' . substr($rest, 0, 4) . '-' . substr($rest, 4);
        }
    }
    return $ddi . ' ' . $digits;
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
    $occupied = gcv_excursion_occupied_people($r);
    $inscriptions = gcv_excursion_platform_inscriptions($r);
    $max = max(1, (int)$r['max_people']);
    $quorum = max(0, (int)$r['quorum']);
    $vagas = max(0, $max - $occupied);
    $destino = gcv_excursion_titles_joined($attrs, $lang);
    $primary = $attrs[0] ?? null;
    $slug = (string)($primary['slug'] ?? '');
    $page = gcv_attraction_public_html_path($slug);
    $cover = (string)($primary['cover_url'] ?? '');
    $entryRaw = $primary['entry_price_cents'] ?? null;
    $cartSlug = trim((string)($r['cart_slug'] ?? ''));
    if ($cartSlug === '') {
        $cartSlug = ($slug !== '' ? $slug : 'excursao') . '-' . $r['date_iso'] . '-' . str_replace(':', '', $hora);
    }
    $guideName = (string)($r['guide_nickname'] ?: $r['guide_name'] ?: '');
    $guidePhoto = (string)($r['guide_photo'] ?: $r['guide_photo_3x4'] ?: '');
    $guidePhone = gcv_format_guide_phone(
        isset($r['guide_phone_ddi']) ? (string)$r['guide_phone_ddi'] : null,
        isset($r['guide_phone']) ? (string)$r['guide_phone'] : null
    );
    $meetingPoint = trim((string)($r['meeting_point'] ?? ''));
    $meetingPlaceId = trim((string)($r['meeting_point_place_id'] ?? ''));
    $meetingLat = isset($r['meeting_point_lat']) && $r['meeting_point_lat'] !== null && $r['meeting_point_lat'] !== ''
        ? (float)$r['meeting_point_lat'] : null;
    $meetingLng = isset($r['meeting_point_lng']) && $r['meeting_point_lng'] !== null && $r['meeting_point_lng'] !== ''
        ? (float)$r['meeting_point_lng'] : null;
    $meetingMapsUrl = $meetingPoint !== ''
        ? gcv_maps_url_from_meeting($meetingPoint, $meetingLat, $meetingLng, $meetingPlaceId !== '' ? $meetingPlaceId : null)
        : '';
    $entry = $entryRaw !== null ? ((int)$entryRaw / 100) : null;

    $card = [
        'id' => (int)$r['id'],
        'dayNum' => $day,
        'monthName' => $months[$lang][$m] ?? $months['pt'][$m],
        'weekday' => $weekdays[$lang][$w] ?? $weekdays['pt'][$w],
        'dateISO' => (string)$r['date_iso'],
        'embarque' => gcv_short_city((string)$r['city_name']),
        // Só usado após compra (recibo/e-mail/reserva) — não exibir no card público
        'meetingPoint' => $meetingPoint,
        'meetingLat' => $meetingLat,
        'meetingLng' => $meetingLng,
        'meetingMapsUrl' => $meetingMapsUrl,
        'destino' => $destino,
        'destinos' => array_map(static function ($a) use ($lang) {
            $key = 'title_' . $lang;
            $t = trim((string)($a[$key] ?? ''));
            if ($t === '') $t = (string)($a['title_pt'] ?? '');
            $slug = (string)($a['slug'] ?? '');
            $page = gcv_attraction_public_html_path($slug);
            $cover = (string)($a['cover_url'] ?? '');
            $entryRaw = $a['entry_price_cents'] ?? null;
            $item = [
                // Campos que o carrossel JS já usa (payload estático)
                'destino' => $t,
                'cardImg' => $cover,
                'atrativoPath' => $page,
                // Aliases (compat)
                'title' => $t,
                'slug' => $slug,
                'path' => $page,
            ];
            if ($entryRaw !== null) {
                $item['valorIngresso'] = (int)round(((int)$entryRaw) / 100);
            }
            return $item;
        }, $attrs),
        'cartSlug' => $cartSlug,
        'hora' => $hora,
        'valor' => (int)round(((int)$r['price_cents']) / 100),
        'confirmada' => gcv_excursion_quorum_met($r),
        'pessoasInscritas' => $occupied,
        'grupoMaximo' => $max,
        'quorumMin' => $quorum,
        'faltamPessoas' => max(0, $quorum - $inscriptions),
        'vagasRestantes' => $vagas,
        'cardImg' => $cover,
        'atrativoPath' => $page,
        'status' => (string)$r['status'],
    ];
    if ($guideName !== '') {
        $card['guiaNome'] = $guideName;
        if ($guidePhoto !== '') $card['guiaFoto'] = $guidePhoto;
        if ($guidePhone !== '') $card['guiaTelefone'] = $guidePhone;
        $fullName = trim((string)($r['guide_full_name'] ?? ''));
        if ($fullName !== '') {
            $card['guiaNomeCompleto'] = $fullName;
        }
        $card['guiaSlug'] = gcv_guide_public_slug($guideName, (int)($r['guide_user_id'] ?? 0));
        $card['guiaIdiomas'] = gcv_guide_languages_normalize($r['guide_languages_json'] ?? null);
        $bio = gcv_guide_bio_i18n(
            isset($r['guide_bio_pt']) ? (string)$r['guide_bio_pt'] : null,
            isset($r['guide_bio_en']) ? (string)$r['guide_bio_en'] : null,
            isset($r['guide_bio_es']) ? (string)$r['guide_bio_es'] : null
        );
        if ($bio['pt'] || $bio['en'] || $bio['es']) {
            $card['guiaBio'] = $bio;
        }
    }
    if (!empty($r['include_transport'])) {
        $card['comTransporte'] = true;
    }
    if (!empty($r['include_entry'])) {
        $card['inclEntradas'] = true;
    }
    if ($entry !== null) {
        $card['valorIngresso'] = $entry;
    }
    return $card;
}

/**
 * Uma saída pode virar 2 cards: a pé e com van. O filtro do site mostra só uma modalidade.
 *
 * @return list<array<string,mixed>>
 */
function gcv_row_to_cards(array $r, string $lang, array $months, array $weekdays): array
{
    $walk = gcv_row_to_card($r, $lang, $months, $weekdays);
    $offer = gcv_excursion_offers_transport($r);
    $legacyTransportOnly = !empty($r['include_transport']) && !$offer;
    $occ = gcv_excursion_group_occupancy($r);
    $walkInscriptions = $occ['walk'];
    $walkQuorum = max(0, (int)($r['quorum'] ?? 0));
    $walkMet = gcv_excursion_walking_quorum_met($r);
    $vanMet = gcv_excursion_transport_quorum_met($r);

    $walk['pessoasInscritas'] = $walkInscriptions;
    $walk['grupoMaximo'] = max(1, $occ['walk_slots']);
    $walk['quorumMin'] = $walkQuorum;
    $walk['faltamPessoas'] = max(0, $walkQuorum - $walkInscriptions);
    $walk['vagasRestantes'] = $occ['remaining'];
    $walk['confirmada'] = $walkMet || $vanMet;

    if ($legacyTransportOnly) {
        $walk['comTransporte'] = true;
        return [$walk];
    }

    $walk['comTransporte'] = false;
    $walk['walkGuideSeatOk'] = gcv_walk_has_spare_guide_seat($r);
    $cards = [$walk];
    if (!$offer || !empty($occ['transport_cancelled'])) {
        return $cards;
    }

    $van = $walk;
    $van['comTransporte'] = true;
    $van['valor'] = (int)round(((int)($r['price_transport_cents'] ?? 0)) / 100);
    $van['cartSlug'] = (string)($walk['cartSlug'] ?? '') . '-t';
    $vanBooked = $occ['transport'];
    $vanSlots = max(0, $occ['transport_slots']);
    $vanQuorum = max(0, (int)($r['quorum_transport'] ?? 0));
    $van['pessoasInscritas'] = $vanBooked;
    $van['grupoMaximo'] = max(1, $vanSlots);
    $van['quorumMin'] = $vanQuorum;
    $van['faltamPessoas'] = max(0, $vanQuorum - $vanBooked);
    $van['vagasRestantes'] = max(0, $vanSlots - $vanBooked);
    $van['confirmada'] = $vanMet;
    $van['walkGuideSeatOk'] = true;
    $cards[] = $van;
    return $cards;
}

$out = ['pt' => [], 'en' => [], 'es' => []];
$rows = array_values(array_filter(is_array($rows ?? null) ? $rows : [], 'gcv_excursion_is_publicly_bookable'));
foreach ($rows as $r) {
    foreach (['pt', 'en', 'es'] as $lang) {
        foreach (gcv_row_to_cards($r, $lang, $months, $weekdays) as $card) {
            $out[$lang][] = $card;
        }
    }
}

json_response(true, $out);
