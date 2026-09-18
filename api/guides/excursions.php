<?php
declare(strict_types=1);

/**
 * Agenda / publicar / cancelar excursões do guia (gcv_excursions).
 * GET  — lista minhas saídas + opções (atrativos, cidades)
 * POST — publica saída (preço/pessoa, quórum da caminhada até as vagas, van 0–4, confirmados por fora 0–5, máximo 12)
 * PUT  — cancela saída futura (status=cancelled)
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/excursion_status.php';
require_once __DIR__ . '/../helpers/marketplace_schema.php';
require_once __DIR__ . '/../helpers/marketplace/publish_service.php';
require_once __DIR__ . '/../helpers/marketplace/pricing_service.php';
require_once __DIR__ . '/../helpers/marketplace/commission_service.php';
require_once __DIR__ . '/../helpers/marketplace/guide_financial_service.php';
require_once __DIR__ . '/../helpers/guide_profile.php';
require_once __DIR__ . '/../helpers/meeting_point.php';
require_once __DIR__ . '/../helpers/pix_reservation_store.php';
require_once __DIR__ . '/../helpers/excursion_attractions.php';
require_once __DIR__ . '/../helpers/guide_agenda.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$user = require_role('guide');
gcv_cms_ensure_schema();
gcv_marketplace_ensure_schema();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$accountStatus = (string)($user['status'] ?? '');
if (in_array($accountStatus, ['suspended', 'cancelled'], true)) {
    json_response(false, null, 'Conta recusada ou cancelada', 403);
}
if ($accountStatus !== 'active') {
    json_response(
        false,
        null,
        $accountStatus === 'inactive'
            ? 'Perfil inativo. Peça reativação ao administrador para publicar.'
            : 'Complete o perfil e aguarde a aprovação para acessar agenda e publicações.',
        403
    );
}
$MIN_QUORUM = 0;
$MAX_PEOPLE_CAP = 12;

function gcv_map_excursion_row(array $r): array
{
    $life = gcv_resolve_excursion_lifecycle($r);
    $r['lifecycle'] = $life;
    $r['lifecycle_label'] = gcv_excursion_lifecycle_label($life);
    $r['can_cancel'] = in_array($life, ['em_formacao', 'confirmada'], true)
        && (string)($r['date_iso'] ?? '') >= (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d')
        && (string)($r['status'] ?? '') !== 'cancelled';
    $r['walk_guide_seat_ok'] = function_exists('gcv_walk_sale_has_spare_client_seat')
        ? gcv_walk_sale_has_spare_client_seat($r)
        : false;
    if (function_exists('gcv_excursion_group_occupancy')) {
        $occ = gcv_excursion_group_occupancy($r);
        $r['group_occupancy'] = $occ;
        $r['transport_cancelled'] = !empty($occ['transport_cancelled']);
    }
    if (function_exists('gcv_guide_agenda_flags')) {
        $r = array_merge($r, gcv_guide_agenda_flags($r));
    }
    return $r;
}

function gcv_guide_client_whatsapp(string $phone): string
{
    $digits = preg_replace('/\D+/', '', $phone) ?? '';
    if (strlen($digits) < 10) {
        return '';
    }
    if (strlen($digits) <= 11) {
        $digits = '55' . $digits;
    }
    return 'https://wa.me/' . $digits;
}

/**
 * @param array<string,mixed> $sale
 * @param array<string,mixed>|null $reservation
 * @return array<string,mixed>
 */
function gcv_guide_normalize_client(array $sale, ?array $reservation = null): array
{
    $res = $reservation ?? [];
    $name = trim((string)($sale['tourist_name'] ?? $res['name'] ?? $res['nome'] ?? $res['customer_name'] ?? $res['full_name'] ?? ''));
    $email = strtolower(trim((string)($sale['tourist_email'] ?? $res['email'] ?? '')));
    if ($name === '' && $email !== '') {
        $name = explode('@', $email)[0];
    }
    $phone = trim((string)($sale['tourist_phone'] ?? $res['phone'] ?? $res['telefone'] ?? ''));
    $spots = (int)($sale['spots'] ?? 0);
    if ($spots < 1 && is_array($res['trips'] ?? null)) {
        foreach ($res['trips'] as $trip) {
            if (is_array($trip)) {
                $spots += max(1, (int)($trip['qty'] ?? 1));
            }
        }
    }
    if ($spots < 1) {
        $spots = max(1, (int)($res['qty'] ?? $res['people'] ?? 1));
    }
    $status = strtoupper((string)($sale['sale_status'] ?? $res['status'] ?? 'PAID'));
    if ($reservation && function_exists('gcv_pix_effective_status')) {
        $status = gcv_pix_effective_status($reservation);
    }
    return [
        'name' => $name !== '' ? $name : 'Cliente',
        'email' => $email,
        'phone' => $phone,
        'whatsapp' => $phone !== '' ? gcv_guide_client_whatsapp($phone) : '',
        'spots' => $spots,
        'people' => $spots,
        'status' => $status,
        'reservation_id' => (string)($sale['reservation_id'] ?? $res['reservation_id'] ?? ''),
        'paid_at' => $sale['paid_at'] ?? $res['paid_at'] ?? null,
        'total_cents' => isset($sale['sold_price_cents']) ? (int)$sale['sold_price_cents'] : null,
        'attendance_status' => strtolower(trim((string)($sale['attendance_status'] ?? 'pending'))) ?: 'pending',
        'checked_in_at' => $sale['checked_in_at'] ?? null,
    ];
}

function gcv_guide_trip_matches_excursion(array $trip, array $exc): bool
{
    $excId = (int)($exc['id'] ?? 0);
    $slug = strtolower(trim((string)($exc['cart_slug'] ?? '')));
    $date = (string)($exc['date_iso'] ?? '');
    $title = mb_strtolower(trim((string)($exc['attraction_title'] ?? '')));
    $cid = strtolower(trim((string)($trip['cartId'] ?? $trip['cart_id'] ?? '')));
    $tid = (int)($trip['excursion_id'] ?? $trip['id'] ?? 0);
    $tdate = trim((string)($trip['dateIso'] ?? $trip['date_iso'] ?? ''));
    $tdest = mb_strtolower(trim((string)($trip['destino'] ?? '')));
    if ($excId > 0 && ($tid === $excId || $cid === (string)$excId)) {
        return true;
    }
    if ($slug !== '' && $cid === $slug) {
        return true;
    }
    if ($date !== '' && $tdate === $date && $title !== '' && $tdest !== ''
        && (str_contains($tdest, $title) || str_contains($title, $tdest))) {
        return true;
    }
    return false;
}

/**
 * @param array<string,mixed> $reservation
 * @param array<string,mixed> $exc
 */
function gcv_guide_reservation_matches_excursion(array $reservation, array $exc): bool
{
    $excId = (int)($exc['id'] ?? 0);
    $resExc = (int)($reservation['excursion_id'] ?? $reservation['cms_excursion_id'] ?? 0);
    if ($excId > 0 && $resExc === $excId) {
        return true;
    }
    $trips = is_array($reservation['trips'] ?? null) ? $reservation['trips'] : [];
    foreach ($trips as $trip) {
        if (is_array($trip) && gcv_guide_trip_matches_excursion($trip, $exc)) {
            return true;
        }
    }
    return false;
}

function gcv_guide_people_for_excursion(array $sale, ?array $reservation, array $exc): int
{
    $qty = 0;
    $trips = is_array(($reservation ?? [])['trips'] ?? null) ? $reservation['trips'] : [];
    foreach ($trips as $trip) {
        if (is_array($trip) && gcv_guide_trip_matches_excursion($trip, $exc)) {
            $qty += max(1, (int)($trip['qty'] ?? $trip['people'] ?? 1));
        }
    }
    if ($qty > 0) {
        return $qty;
    }
    $fromSale = (int)($sale['spots'] ?? 0);
    if ($fromSale > 0) {
        return $fromSale;
    }
    return max(1, (int)(($reservation ?? [])['qty'] ?? ($reservation ?? [])['people'] ?? 1));
}

/**
 * @param list<array<string,mixed>> $rows
 * @return list<array<string,mixed>>
 */
function gcv_guide_attach_clients(array $rows, int $guideUserId): array
{
    if (!$rows) {
        return $rows;
    }
    $byExc = [];
    $seen = [];

    $ids = [];
    $excById = [];
    foreach ($rows as $r) {
        $id = (int)($r['id'] ?? 0);
        if ($id > 0) {
            $ids[] = $id;
            $excById[$id] = $r;
        }
    }

    try {
        if ($ids) {
            $stmt = db()->prepare(
                "SELECT id, reservation_id, excursion_id, tourist_name, tourist_email, tourist_phone, tourist_cpf,
                        spots, sale_status, sold_price_cents, paid_at, sold_at, attendance_status, checked_in_at,
                        include_transport
                 FROM gcv_sales
                 WHERE guide_user_id = ?
                   AND deleted_at IS NULL
                   AND sale_status IN ('PAID','PENDING')
                 ORDER BY sold_at ASC"
            );
            $stmt->execute([$guideUserId]);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) ?: [] as $sale) {
                $res = null;
                $rid = (string)($sale['reservation_id'] ?? '');
                if ($rid !== '') {
                    $res = gcv_pix_read_reservation($rid);
                }
                $client = gcv_guide_normalize_client($sale, $res);
                $key = $rid !== '' ? $rid : ('sale-' . (int)$sale['id']);
                $excId = (int)($sale['excursion_id'] ?? 0);
                $targets = [];
                if ($res) {
                    foreach ($rows as $exc) {
                        if (gcv_guide_reservation_matches_excursion($res, $exc)) {
                            $targets[] = (int)$exc['id'];
                        }
                    }
                }
                if (!$targets && $excId > 0 && isset($excById[$excId])) {
                    $targets[] = $excId;
                }
                $targets = array_values(array_unique(array_filter($targets)));
                foreach ($targets as $tid) {
                    $seenKey = $tid . ':' . $key;
                    if (isset($seen[$seenKey])) {
                        continue;
                    }
                    $seen[$seenKey] = true;
                    $item = $client;
                    $excRow = $excById[$tid] ?? null;
                    if ($excRow) {
                        $people = gcv_guide_people_for_excursion($sale, $res, $excRow);
                        $item['spots'] = $people;
                        $item['people'] = $people;
                    }
                    $saleForT = $sale;
                    $saleForT['sale_include_transport'] = $sale['include_transport'] ?? 0;
                    $item['with_transport'] = function_exists('gcv_sale_row_has_transport')
                        ? gcv_sale_row_has_transport($saleForT, $res)
                        : !empty($sale['include_transport']);
                    $byExc[$tid][] = $item;
                }
            }
        }
    } catch (Throwable $e) {
        error_log('guide_attach_clients sales: ' . $e->getMessage());
    }

    try {
        $dir = gcv_pix_storage_dir();
        foreach (glob($dir . '/GCV-*.json') ?: [] as $path) {
            $raw = file_get_contents($path);
            if ($raw === false || $raw === '') {
                continue;
            }
            $res = json_decode($raw, true);
            if (!is_array($res)) {
                continue;
            }
            $st = gcv_pix_effective_status($res);
            if (!in_array($st, ['PAID', 'PENDING'], true)) {
                continue;
            }
            $rid = (string)($res['reservation_id'] ?? '');
            $saleRow = ['sale_status' => $st, 'reservation_id' => $rid];
            if ($rid !== '') {
                try {
                    $find = db()->prepare(
                        "SELECT tourist_name, tourist_email, tourist_phone, spots, sale_status, sold_price_cents,
                                paid_at, attendance_status, checked_in_at, reservation_id, include_transport
                         FROM gcv_sales
                         WHERE reservation_id = ? AND deleted_at IS NULL
                         LIMIT 1"
                    );
                    $find->execute([$rid]);
                    $found = $find->fetch(PDO::FETCH_ASSOC);
                    if ($found) {
                        $saleRow = $found;
                    }
                } catch (Throwable $e) {
                    // segue com o JSON
                }
            }
            $client = gcv_guide_normalize_client($saleRow, $res);
            foreach ($rows as $exc) {
                if (!gcv_guide_reservation_matches_excursion($res, $exc)) {
                    continue;
                }
                $tid = (int)$exc['id'];
                $seenKey = $tid . ':' . ($rid !== '' ? $rid : basename($path));
                if (isset($seen[$seenKey])) {
                    continue;
                }
                $seen[$seenKey] = true;
                $item = $client;
                $people = gcv_guide_people_for_excursion([], $res, $exc);
                $item['spots'] = $people;
                $item['people'] = $people;
                $saleForT = $saleRow;
                $saleForT['sale_include_transport'] = $saleRow['include_transport'] ?? 0;
                $item['with_transport'] = function_exists('gcv_sale_row_has_transport')
                    ? gcv_sale_row_has_transport($saleForT, $res)
                    : gcv_reservation_has_transport($res);
                $byExc[$tid][] = $item;
            }
        }
    } catch (Throwable $e) {
        error_log('guide_attach_clients pix: ' . $e->getMessage());
    }

    $emails = [];
    foreach ($byExc as $list) {
        foreach ($list as $c) {
            $em = strtolower(trim((string)($c['email'] ?? '')));
            if ($em !== '') {
                $emails[$em] = true;
            }
        }
    }
    $nameByEmail = [];
    if ($emails) {
        try {
            $keys = array_keys($emails);
            $ph = implode(',', array_fill(0, count($keys), '?'));
            $st = db()->prepare("SELECT email, name FROM gcv_users WHERE email IN ({$ph})");
            $st->execute($keys);
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $u) {
                $em = strtolower(trim((string)$u['email']));
                $nm = trim((string)($u['name'] ?? ''));
                if ($em !== '' && $nm !== '') {
                    $nameByEmail[$em] = $nm;
                }
            }
        } catch (Throwable $e) {
            // ignore
        }
    }
    if ($nameByEmail) {
        foreach ($byExc as &$list) {
            foreach ($list as &$c) {
                $em = strtolower(trim((string)($c['email'] ?? '')));
                if ($em !== '' && isset($nameByEmail[$em])) {
                    $current = trim((string)($c['name'] ?? ''));
                    if ($current === '' || $current === 'Cliente' || $current === explode('@', $em)[0]) {
                        $c['name'] = $nameByEmail[$em];
                    }
                }
            }
            unset($c);
        }
        unset($list);
    }

    foreach ($rows as &$r) {
        $list = $byExc[(int)$r['id']] ?? [];
        $r['clients'] = $list;
        $r['clients_count'] = count($list);
        $spots = 0;
        foreach ($list as $c) {
            $spots += (int)($c['spots'] ?? 1);
        }
        $r['clients_spots'] = $spots;
    }
    unset($r);
    return $rows;
}

if ($method === 'GET') {
    $stmt = db()->prepare(
        'SELECT e.*, a.title_pt AS attraction_title, a.slug AS attraction_slug,
                c.name AS departure_city_name
         FROM gcv_excursions e
         LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         WHERE e.guide_user_id = ?
         ORDER BY e.date_iso ASC, e.departure_time ASC'
    );
    $stmt->execute([(int)$user['id']]);
    $rows = array_map('gcv_map_excursion_row', $stmt->fetchAll(PDO::FETCH_ASSOC) ?: []);
    $rows = gcv_guide_attach_clients($rows, (int)$user['id']);

    $today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
    $upcoming = [];
    $archived = [];
    foreach ($rows as $e) {
        if (gcv_guide_tour_is_archived($e, $today)) {
            $archived[] = $e;
        } else {
            $upcoming[] = $e;
        }
    }

    $attrs = db()->query(
        "SELECT id, title_pt, slug, city_id, entry_price_cents
         FROM gcv_attractions
         WHERE status = 'published'
         ORDER BY title_pt ASC"
    )->fetchAll(PDO::FETCH_ASSOC);
    $attrs = gcv_sort_attractions_catalog($attrs);
    foreach ($attrs as &$a) {
        $a['guide_net_max'] = gcv_guide_net_max_cents(
            (int)($a['id'] ?? 0),
            (string)($a['slug'] ?? ''),
            (string)($a['title_pt'] ?? '')
        ) / 100;
    }
    unset($a);

    $cities = gcv_filter_guide_base_cities(db()->query(
        "SELECT id, name FROM gcv_cities WHERE status = 'active' ORDER BY name ASC"
    )->fetchAll(PDO::FETCH_ASSOC) ?: []);

    $commission = gcv_commission_resolve(null, (int)$user['id'], null, null);

    json_response(true, [
        'excursions' => $rows,
        'upcoming' => $upcoming,
        'archived' => $archived,
        'attractions' => $attrs,
        'cities' => $cities,
        'min_quorum' => $MIN_QUORUM,
        'max_quorum' => $MAX_PEOPLE_CAP,
        'max_people_cap' => $MAX_PEOPLE_CAP,
        'guide_net_min' => gcv_guide_net_min_cents() / 100,
        'guide_net_max' => gcv_guide_net_max_default_cents() / 100,
        'guide_net_max_dragao' => gcv_guide_net_max_dragao_cents() / 100,
        'guide_net_max_transport' => gcv_guide_net_max_transport_cents() / 100,
        'commission_pct' => (float)$commission['pct'],
        'commission_scope' => (string)$commission['scope_type'],
        'profile_complete' => gcv_guide_profile_is_complete((int)$user['id']),
        'financial_ready' => gcv_guide_financial_is_ready((int)$user['id']),
        'business_mode' => 'GUIDE_MARKETPLACE',
        'pricing_hint' => 'Informe apenas o valor líquido desejado (guide_net). O backend calcula comissão, arredondamento e preço final.',
    ]);
}

if ($method === 'POST') {
    if (!gcv_guide_profile_is_complete((int)$user['id'])) {
        json_response(false, null, 'Complete seu perfil antes de publicar passeios', 422);
    }
    if (!gcv_guide_financial_is_ready((int)$user['id'])) {
        json_response(false, null, 'Cadastre CPF/CNPJ e chave PIX em Dados financeiros antes de publicar passeios', 422);
    }
    $data = body_json();
    $date = trim((string)($data['date_iso'] ?? ''));
    $time = trim((string)($data['departure_time'] ?? ''));
    $cityId = (int)($data['departure_city_id'] ?? 0);
    $attrId = (int)($data['attraction_id'] ?? 0);

    // Guia informa APENAS o valor líquido desejado (nunca o preço final da plataforma)
    $guideNetCents = isset($data['guide_net_cents'])
        ? (int)$data['guide_net_cents']
        : (isset($data['guide_net'])
            ? (int)round(((float)$data['guide_net']) * 100)
            : (isset($data['price_cents'])
                ? (int)$data['price_cents'] // legado: price_cents tratado como líquido
                : (int)round(((float)($data['price'] ?? 0)) * 100)));

    $maxPeople = (int)($data['max_people'] ?? 10);
    if ($maxPeople < 1) {
        $maxPeople = 1;
    }
    if ($maxPeople > $MAX_PEOPLE_CAP) {
        $maxPeople = $MAX_PEOPLE_CAP;
    }
    $quorum = gcv_clamp_walk_quorum($data['quorum'] ?? 4, $maxPeople);
    $preconfirmed = gcv_clamp_preconfirmed($data['preconfirmed_people'] ?? 0, $maxPeople, 0);
    $notes = sanitize_textarea((string)($data['notes_pt'] ?? ''), 2000);

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        json_response(false, null, 'Data inválida', 422);
    }
    $today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
    if ($date < $today) {
        json_response(false, null, 'Data deve ser futura', 422);
    }
    $time = gcv_normalize_departure_time($time);
    if ($time === '') {
        json_response(false, null, 'Informe o horário de saída (minutos 00, 10, 20, 30, 40 ou 50)', 422);
    }
    if ($cityId <= 0 || $attrId <= 0) {
        json_response(false, null, 'Cidade e atrativo são obrigatórios', 422);
    }
    $includeTransport = !empty($data['include_transport']) && empty($data['offer_transport']);
    $netRangeErr = gcv_guide_net_range_error($guideNetCents, $attrId, null, $includeTransport);
    if ($netRangeErr !== null) {
        json_response(false, null, $netRangeErr, 422);
    }
    if (!empty($data['offer_transport'])) {
        $netT = isset($data['guide_net_transport_cents'])
            ? (int)$data['guide_net_transport_cents']
            : (int)round(((float)($data['guide_net_transport'] ?? 0)) * 100);
        $netTErr = gcv_guide_net_range_error($netT, $attrId, null, true);
        if ($netTErr !== null) {
            json_response(false, null, $netTErr, 422);
        }
        $maxT = gcv_clamp_max_people_transport($data['max_people_transport'] ?? 4, $maxPeople);
        if ($maxT < 1) {
            json_response(false, null, 'Vagas com transporte: informe de 1 a 4 pessoas', 422);
        }
        $quorumT = gcv_clamp_quorum($data['quorum_transport'] ?? 4);
        if ($quorumT > $maxT) {
            json_response(false, null, 'Quórum do transporte não pode ser maior que as vagas com transporte', 422);
        }
    }
    if ($maxPeople < ($preconfirmed + $quorum)) {
        json_response(false, null, 'Vagas devem caber as pessoas confirmadas por fora e o quórum das novas inscrições', 422);
    }

    $a = db()->prepare("SELECT id FROM gcv_attractions WHERE id = ? AND status = 'published'");
    $a->execute([$attrId]);
    if (!$a->fetch()) {
        json_response(false, null, 'Atrativo inválido ou não publicado pelo admin', 422);
    }
    $c = db()->prepare("SELECT id, name FROM gcv_cities WHERE id = ? AND status = 'active'");
    $c->execute([$cityId]);
    $cityRow = $c->fetch(PDO::FETCH_ASSOC);
    if (!$cityRow || !gcv_is_allowed_guide_base_city((string)($cityRow['name'] ?? ''))) {
        json_response(false, null, gcv_guide_base_city_error(), 422);
    }

    try {
        $mp = gcv_meeting_point_from_body($data, true);
        if (isset($mp['error'])) {
            json_response(false, null, $mp['error'], 400);
        }
        $created = gcv_publish_guide_marketplace([
            'date_iso' => $date,
            'departure_time' => $time,
            'departure_city_id' => $cityId,
            'attraction_id' => $attrId,
            'guide_net_cents' => $guideNetCents,
            'quorum' => $quorum,
            'max_people' => $maxPeople,
            'preconfirmed_people' => $preconfirmed,
            'include_transport' => !empty($data['include_transport']) || !empty($data['offer_transport']),
            'offer_transport' => !empty($data['offer_transport']),
            'guide_net_transport_cents' => isset($data['guide_net_transport_cents'])
                ? (int)$data['guide_net_transport_cents']
                : null,
            'quorum_transport' => $data['quorum_transport'] ?? 0,
            'max_people_transport' => $data['max_people_transport'] ?? 0,
            'include_entry' => !empty($data['include_entry']),
            'include_lunch' => !empty($data['include_lunch']),
            'notes_pt' => $notes !== '' ? $notes : null,
            'meeting_point' => (string)$mp['point'],
            'meeting_point_place_id' => $mp['place_id'] ?? null,
            'meeting_point_lat' => $mp['lat'] ?? null,
            'meeting_point_lng' => $mp['lng'] ?? null,
            'category_key' => $data['category_key'] ?? null,
        ], (int)$user['id']);
        $pricing = $created['pricing'] ?? null;
        $row = gcv_map_excursion_row($created);
        json_response(true, [
            'message' => 'Passeio enviado para aprovação do admin (não publicado automaticamente)',
            'excursion' => $row,
            'pricing' => $pricing,
        ]);
    } catch (InvalidArgumentException $e) {
        json_response(false, null, $e->getMessage(), 422);
    } catch (Throwable $e) {
        json_response(false, null, $e->getMessage(), 500);
    }
}

if ($method === 'PUT') {
    $data = body_json();
    $id = (int)($data['id'] ?? 0);
    $action = strtolower(trim((string)($data['action'] ?? 'cancel')));
    if ($id <= 0) {
        json_response(false, null, 'id obrigatório', 422);
    }

    $stmt = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ? AND guide_user_id = ?');
    $stmt->execute([$id, (int)$user['id']]);
    $ex = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$ex) {
        json_response(false, null, 'Passeio não encontrado', 404);
    }

    if ($action === 'cancel') {
        $mapped = gcv_map_excursion_row($ex);
        if (empty($mapped['can_cancel'])) {
            json_response(false, null, 'Só é possível cancelar passeios futuros ainda não realizados', 409);
        }
        db()->prepare(
            'UPDATE gcv_excursions SET status = \'cancelled\', updated_by = ? WHERE id = ?'
        )->execute([(int)$user['id'], $id]);
        $ex['status'] = 'cancelled';
        try {
            require_once __DIR__ . '/../helpers/notify_ops.php';
            gcv_ops_notify_tour_cancelled($id, 'guia');
        } catch (Throwable $e) {
            error_log('notify tour cancel: ' . $e->getMessage());
        }
        json_response(true, [
            'message' => 'Passeio cancelado. Clientes avisados no WhatsApp.',
            'excursion' => gcv_map_excursion_row($ex),
        ]);
    }

    if ($action === 'update' || $action === 'edit') {
        try {
            $row = gcv_guide_update_excursion($ex, $data, (int)$user['id']);
            json_response(true, [
                'message' => 'Passeio atualizado. O status foi mantido.',
                'excursion' => gcv_map_excursion_row($row),
            ]);
        } catch (InvalidArgumentException $e) {
            json_response(false, null, $e->getMessage(), 422);
        } catch (Throwable $e) {
            json_response(false, null, $e->getMessage(), 500);
        }
    }

    json_response(false, null, 'Ação inválida', 422);
}

json_response(false, null, 'Método não permitido', 405);
