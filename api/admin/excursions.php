<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/excursion_status.php';
require_once __DIR__ . '/../helpers/excursion_attractions.php';
require_once __DIR__ . '/../helpers/marketplace_schema.php';
require_once __DIR__ . '/../helpers/marketplace/constants.php';
require_once __DIR__ . '/../helpers/marketplace/pricing_service.php';
require_once __DIR__ . '/../helpers/marketplace/audit_service.php';
require_once __DIR__ . '/../helpers/meeting_point.php';
require_once __DIR__ . '/../helpers/google_places.php';
require_once __DIR__ . '/../helpers/notify_ops.php';

header('Content-Type: application/json; charset=utf-8');
$admin = require_admin();
gcv_cms_ensure_schema();
gcv_marketplace_ensure_schema();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function gcv_excursion_validate(array $body, bool $creating): ?string
{
    if ($creating || array_key_exists('date_iso', $body)) {
        if (empty($body['date_iso'])) return 'Data obrigatória';
    }
    if ($creating || array_key_exists('departure_time', $body)) {
        if (empty($body['departure_time'])) return 'Hora obrigatória (minutos 00, 10, 20, 30, 40 ou 50)';
    }
    if ($creating || array_key_exists('departure_city_id', $body)) {
        if (empty($body['departure_city_id'])) return 'Cidade de saída obrigatória';
        $st = db()->prepare("SELECT name FROM gcv_cities WHERE id = ? AND status = 'active'");
        $st->execute([(int)$body['departure_city_id']]);
        $cityName = (string)($st->fetchColumn() ?: '');
        if ($cityName === '' || !gcv_is_allowed_guide_base_city($cityName)) {
            return gcv_guide_base_city_error();
        }
    }
    if ($creating || array_key_exists('meeting_point', $body)) {
        $mp = gcv_meeting_point_from_body($body, true);
        if (isset($mp['error'])) return $mp['error'];
    }
    if ($creating || array_key_exists('attraction_ids', $body) || array_key_exists('attraction_id', $body)) {
        $ids = gcv_excursion_normalize_attraction_ids($body);
        $attrErr = gcv_excursion_validate_attraction_ids($ids);
        if ($attrErr) return $attrErr;
    } elseif ($creating) {
        return 'Selecione pelo menos 1 atrativo';
    }
    if ($creating || array_key_exists('price_cents', $body)) {
        if (!isset($body['price_cents']) || (int)$body['price_cents'] <= 0) return 'Valor por pessoa obrigatório';
    }
    if ($creating || array_key_exists('quorum', $body)) {
        $q = (int)($body['quorum'] ?? 4);
        $maxP = (int)($body['max_people'] ?? 10);
        if ($maxP < 1) {
            $maxP = 1;
        }
        if ($maxP > 12) {
            $maxP = 12;
        }
        if ($q < 0 || $q > $maxP) {
            return 'Quórum deve ser 0 (já confirmado) ou até o número de vagas';
        }
    }
    if ($creating || array_key_exists('max_people', $body)) {
        if (!isset($body['max_people']) || (int)$body['max_people'] < 1) return 'Máximo de pessoas obrigatório';
        if ((int)$body['max_people'] > 12) return 'Máximo de pessoas é 12';
    }
    if ($creating || array_key_exists('preconfirmed_people', $body)) {
        $pre = (int)($body['preconfirmed_people'] ?? 0);
        if ($pre < 0 || $pre > 5) return 'Pessoas confirmadas deve ser entre 0 e 5';
    }
    if ($creating || array_key_exists('max_people_transport', $body) || array_key_exists('quorum_transport', $body) || array_key_exists('price_transport_cents', $body)) {
        $maxT = (int)($body['max_people_transport'] ?? 0);
        if ($maxT < 0 || $maxT > 4) {
            return 'Vagas com transporte devem ser de 0 a 4';
        }
        $qT = (int)($body['quorum_transport'] ?? 0);
        if ($qT < 0 || $qT > 4) {
            return 'Quórum do transporte deve ser de 0 a 4';
        }
        if ($maxT > 0 && $qT > $maxT) {
            return 'Quórum do transporte não pode ser maior que as vagas com transporte';
        }
        if (array_key_exists('price_transport_cents', $body) && (int)$body['price_transport_cents'] < 0) {
            return 'Valor com transporte inválido';
        }
    }
    return null;
}

function gcv_admin_notify_guide_published(int $id, string $status): void
{
    if (!in_array($status, ['published', 'soldout'], true) || $id <= 0) {
        return;
    }
    try {
        gcv_ops_notify_guide_approved($id);
    } catch (Throwable $e) {
        error_log('notify guide published: ' . $e->getMessage());
    }
}

function gcv_excursion_require_guide_if_published(array $body, ?array $existing = null): ?string
{
    return null;
}

function gcv_admin_transport_from_body(array $body, array $ex, int $maxPeople): array
{
    $explicitOffer = array_key_exists('offer_transport', $body);
    $explicitMaxT = array_key_exists('max_people_transport', $body);
    $explicitPriceT = array_key_exists('price_transport_cents', $body);
    $explicitQT = array_key_exists('quorum_transport', $body);
    $any = $explicitOffer || $explicitMaxT || $explicitPriceT || $explicitQT;

    $maxT = $explicitMaxT
        ? max(0, min(4, (int)$body['max_people_transport']))
        : max(0, (int)($ex['max_people_transport'] ?? 0));
    if ($maxT > $maxPeople) {
        $maxT = $maxPeople;
    }
    $priceT = $explicitPriceT
        ? max(0, (int)$body['price_transport_cents'])
        : max(0, (int)($ex['price_transport_cents'] ?? 0));
    $qT = $explicitQT
        ? max(0, min(4, (int)$body['quorum_transport']))
        : max(0, (int)($ex['quorum_transport'] ?? 0));

    $includeLegacy = array_key_exists('include_transport', $body)
        ? (!empty($body['include_transport']) ? 1 : 0)
        : (int)($ex['include_transport'] ?? 0);

    if (!$any) {
        $offer = !empty($ex['offer_transport']) || $maxT > 0 || $priceT > 0;
        if (!$offer) {
            return [
                'offer_transport' => 0,
                'include_transport' => $includeLegacy,
                'price_transport_cents' => $priceT > 0 ? $priceT : null,
                'quorum_transport' => $qT,
                'max_people_transport' => $maxT,
            ];
        }
    } elseif ($explicitOffer) {
        $offer = !empty($body['offer_transport']);
    } else {
        $offer = $maxT > 0 || $priceT > 0 || !empty($ex['offer_transport']);
    }

    if ($explicitMaxT && $maxT < 1) {
        $offer = false;
    }

    if (!$offer) {
        return [
            'offer_transport' => 0,
            'include_transport' => $includeLegacy,
            'price_transport_cents' => null,
            'quorum_transport' => 0,
            'max_people_transport' => 0,
        ];
    }

    if ($maxT < 1) {
        $maxT = min(4, max(1, $maxPeople));
    }
    if ($qT > $maxT) {
        $qT = $maxT;
    }
    return [
        'offer_transport' => 1,
        'include_transport' => 1,
        'price_transport_cents' => $priceT > 0 ? $priceT : null,
        'quorum_transport' => $qT,
        'max_people_transport' => $maxT,
    ];
}

function gcv_admin_apply_forming(array $body, int $quorum, int $maxPeople): int
{
    if (array_key_exists('lifecycle', $body) && !array_key_exists('forming', $body)) {
        $life = (string)$body['lifecycle'];
        if ($life === 'confirmada') {
            $body['forming'] = false;
        } elseif ($life === 'em_formacao') {
            $body['forming'] = true;
        }
    }
    if (!array_key_exists('forming', $body)) {
        return $quorum;
    }
    $raw = $body['forming'];
    $wantForming = !($raw === false || $raw === 0 || $raw === '0' || $raw === 'false' || $raw === '');
    if (!$wantForming) {
        return 0;
    }
    if ($quorum < 1) {
        return min(4, max(1, $maxPeople));
    }
    return $quorum;
}

function gcv_excursion_enrich(array $row): array
{
    $id = (int)$row['id'];
    $attrs = gcv_excursion_load_attractions($id);
    $row['attractions'] = $attrs;
    $row['attraction_ids'] = array_map(static fn($a) => (int)$a['id'], $attrs);
    $row['attraction_title'] = gcv_excursion_titles_joined($attrs, 'pt');
    if (!empty($attrs[0])) {
        $row['attraction_id'] = (int)$attrs[0]['id'];
        $row['attraction_slug'] = $attrs[0]['slug'] ?? ($row['attraction_slug'] ?? null);
    }
    foreach ([
        'id', 'price_cents', 'price_transport_cents', 'quorum', 'max_people', 'booked_people',
        'booked_people_transport', 'preconfirmed_people', 'quorum_transport', 'max_people_transport',
        'guide_user_id', 'departure_city_id', 'attraction_id', 'offer_transport', 'include_transport',
        'guide_payout_planned_cents', 'guide_net_cents', 'guide_net_transport_cents',
        'commission_cents', 'commission_transport_cents',
    ] as $k) {
        if (array_key_exists($k, $row) && $row[$k] !== null && $row[$k] !== '') {
            $row[$k] = (int)$row[$k];
        }
    }
    $occ = gcv_excursion_group_occupancy($row);
    $life = gcv_resolve_excursion_lifecycle($row);
    $row['occupancy'] = $occ;
    $row['lifecycle'] = $life;
    $row['lifecycle_label'] = gcv_excursion_lifecycle_label($life);
    $row['forming'] = $life === 'em_formacao';
    $row['offer_transport'] = !empty($row['offer_transport'])
        || (int)($row['price_transport_cents'] ?? 0) > 0
        || (int)($row['max_people_transport'] ?? 0) > 0
        ? 1 : 0;
    return $row;
}

function gcv_admin_is_marketplace_payload(array $body): bool
{
    return array_key_exists('guide_net_cents', $body) || array_key_exists('guide_net', $body);
}

/**
 * Impede dois passeios ativos do mesmo guia no mesmo dia.
 */
function gcv_admin_guide_date_conflict(int $guideId, string $dateIso, int $exceptId): ?string
{
    if ($guideId <= 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateIso)) {
        return null;
    }
    $st = db()->prepare(
        "SELECT e.id, COALESCE(NULLIF(a.title_pt,''), CONCAT('#', e.id)) AS title
         FROM gcv_excursions e
         LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
         WHERE e.guide_user_id = ?
           AND e.date_iso = ?
           AND e.id <> ?
           AND e.deleted_at IS NULL
           AND e.status IN ('draft','pending_approval','published','soldout')
         LIMIT 1"
    );
    $st->execute([$guideId, $dateIso, $exceptId]);
    $hit = $st->fetch(PDO::FETCH_ASSOC);
    if (!$hit) {
        return null;
    }
    $br = substr($dateIso, 8, 2) . '/' . substr($dateIso, 5, 2) . '/' . substr($dateIso, 0, 4);
    return 'Este guia já possui um passeio em ' . $br . ' (' . (string)$hit['title'] . '). Escolha outra data.';
}

/**
 * Atualização pontual da planilha: grava só os campos enviados.
 *
 * @param array<string,mixed> $body
 * @param array<string,mixed> $ex
 * @return array<string,mixed>
 */
function gcv_admin_apply_sheet_patch(array $body, array $ex, int $adminId): array
{
    $id = (int)$ex['id'];
    $sets = ['updated_by = ?'];
    $params = [$adminId];
    $maxPeople = min(12, max(1, (int)($body['max_people'] ?? $ex['max_people'] ?? 10)));

    $nextDate = array_key_exists('date_iso', $body) ? (string)$body['date_iso'] : (string)($ex['date_iso'] ?? '');
    $nextGuide = array_key_exists('guide_user_id', $body)
        ? (!empty($body['guide_user_id']) ? (int)$body['guide_user_id'] : 0)
        : (int)($ex['guide_user_id'] ?? 0);
    if (array_key_exists('date_iso', $body) || array_key_exists('guide_user_id', $body)) {
        $conflict = gcv_admin_guide_date_conflict($nextGuide, $nextDate, $id);
        if ($conflict) {
            throw new InvalidArgumentException($conflict);
        }
    }

    if (array_key_exists('date_iso', $body)) {
        $sets[] = 'date_iso = ?';
        $params[] = (string)$body['date_iso'];
    }
    if (array_key_exists('departure_time', $body)) {
        $time = gcv_normalize_departure_time((string)$body['departure_time']);
        if ($time === '') {
            throw new InvalidArgumentException('Hora obrigatória (minutos 00, 10, 20, 30, 40 ou 50)');
        }
        $sets[] = 'departure_time = ?';
        $params[] = $time;
    }
    if (array_key_exists('guide_user_id', $body)) {
        $sets[] = 'guide_user_id = ?';
        $params[] = !empty($body['guide_user_id']) ? (int)$body['guide_user_id'] : null;
    }
    if (array_key_exists('max_people', $body)) {
        $sets[] = 'max_people = ?';
        $params[] = $maxPeople;
    }
    if (array_key_exists('quorum', $body) || array_key_exists('forming', $body) || array_key_exists('lifecycle', $body)) {
        $quorum = gcv_admin_apply_forming(
            $body,
            gcv_clamp_walk_quorum($body['quorum'] ?? $ex['quorum'], $maxPeople),
            $maxPeople
        );
        $sets[] = 'quorum = ?';
        $params[] = $quorum;
    }
    if (array_key_exists('preconfirmed_people', $body)) {
        $sets[] = 'preconfirmed_people = ?';
        $params[] = gcv_clamp_preconfirmed(
            $body['preconfirmed_people'],
            $maxPeople,
            (int)($ex['booked_people'] ?? 0)
        );
    }
    if (array_key_exists('guide_net_cents', $body)) {
        $newNet = (int)$body['guide_net_cents'];
        if ($newNet < 100) {
            throw new InvalidArgumentException('Informe o valor que o guia pediu (mínimo R$ 1)');
        }
        $cityId = (int)($ex['departure_city_id'] ?? 0);
        $pricingWalk = gcv_pricing_from_guide_net(
            $newNet,
            $id,
            $nextGuide > 0 ? $nextGuide : null,
            null,
            $cityId > 0 ? $cityId : null
        );
        $sets[] = 'guide_net_cents = ?';
        $params[] = $pricingWalk['guide_net_cents'];
        $sets[] = 'price_cents = ?';
        $params[] = $pricingWalk['final_price_cents'];
        $sets[] = 'commission_pct_applied = ?';
        $params[] = $pricingWalk['commission_pct'];
        $sets[] = 'commission_cents = ?';
        $params[] = $pricingWalk['commission_cents'];
        $sets[] = 'price_before_round_cents = ?';
        $params[] = $pricingWalk['price_before_round_cents'];
        $sets[] = 'rounding_diff_cents = ?';
        $params[] = $pricingWalk['rounding_diff_cents'];
        $sets[] = 'guide_payout_planned_cents = ?';
        $params[] = $pricingWalk['guide_net_cents'];
        $sets[] = 'platform_margin_cents = ?';
        $params[] = $pricingWalk['commission_cents'];
        if (!empty($pricingWalk['commission_rule_id'])) {
            $sets[] = 'commission_rule_id = ?';
            $params[] = $pricingWalk['commission_rule_id'];
        }
    } elseif (array_key_exists('price_cents', $body)) {
        $price = (int)$body['price_cents'];
        if ($price <= 0) {
            throw new InvalidArgumentException('Valor por pessoa obrigatório');
        }
        $sets[] = 'price_cents = ?';
        $params[] = $price;
    }

    $pricingTransport = null;
    if (array_key_exists('guide_net_transport_cents', $body)) {
        $netT = (int)$body['guide_net_transport_cents'];
        if ($netT > 0) {
            if ($netT < 100) {
                throw new InvalidArgumentException('Informe o valor com translado que o guia pediu (mínimo R$ 1)');
            }
            $cityIdT = (int)($ex['departure_city_id'] ?? 0);
            $pricingTransport = gcv_pricing_from_guide_net(
                $netT,
                $id,
                $nextGuide > 0 ? $nextGuide : null,
                null,
                $cityIdT > 0 ? $cityIdT : null
            );
            $body['price_transport_cents'] = $pricingTransport['final_price_cents'];
            if (!array_key_exists('offer_transport', $body)) {
                $body['offer_transport'] = 1;
            }
        } else {
            $body['price_transport_cents'] = 0;
        }
    }

    $touchTransport = array_key_exists('offer_transport', $body)
        || array_key_exists('max_people_transport', $body)
        || array_key_exists('price_transport_cents', $body)
        || array_key_exists('guide_net_transport_cents', $body)
        || array_key_exists('quorum_transport', $body);
    if ($touchTransport) {
        $tr = gcv_admin_transport_from_body($body, $ex, $maxPeople);
        $sets[] = 'offer_transport = ?';
        $params[] = $tr['offer_transport'];
        $sets[] = 'include_transport = ?';
        $params[] = $tr['include_transport'];
        $sets[] = 'price_transport_cents = ?';
        $params[] = $tr['price_transport_cents'];
        $sets[] = 'quorum_transport = ?';
        $params[] = $tr['quorum_transport'];
        $sets[] = 'max_people_transport = ?';
        $params[] = $tr['max_people_transport'];
        if (empty($tr['offer_transport']) || ($pricingTransport === null && array_key_exists('guide_net_transport_cents', $body) && (int)$body['guide_net_transport_cents'] <= 0)) {
            $sets[] = 'guide_net_transport_cents = ?';
            $params[] = null;
            $sets[] = 'commission_transport_cents = ?';
            $params[] = null;
        } elseif ($pricingTransport) {
            $sets[] = 'guide_net_transport_cents = ?';
            $params[] = $pricingTransport['guide_net_cents'];
            $sets[] = 'commission_transport_cents = ?';
            $params[] = $pricingTransport['commission_cents'];
        }
    }

    if (array_key_exists('status', $body)) {
        $nextStatus = (string)$body['status'];
        $allowedStatus = ['draft', 'pending_approval', 'published', 'cancelled', 'soldout', 'rejected'];
        if (!in_array($nextStatus, $allowedStatus, true)) {
            throw new InvalidArgumentException('Status inválido');
        }
        $sets[] = 'status = ?';
        $params[] = $nextStatus;
        if (in_array($nextStatus, ['published', 'soldout'], true) && empty($ex['approved_at'])) {
            $sets[] = 'approved_at = NOW()';
            $sets[] = 'approved_by = ?';
            $params[] = $adminId;
        }
    }

    $hasAttr = array_key_exists('attraction_ids', $body) || array_key_exists('attraction_id', $body);
    $attrIds = [];
    if ($hasAttr) {
        $attrIds = gcv_excursion_normalize_attraction_ids($body);
        if ($attrIds === []) {
            throw new InvalidArgumentException('Selecione pelo menos 1 atrativo');
        }
        $sets[] = 'attraction_id = ?';
        $params[] = $attrIds[0];
    }

    if (count($sets) > 1) {
        $params[] = $id;
        db()->prepare('UPDATE gcv_excursions SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($params);
    }
    if ($hasAttr) {
        gcv_excursion_save_attractions($id, $attrIds);
    }

    $stmt = db()->prepare(
        'SELECT e.*, c.name AS departure_city_name, u.name AS guide_name
         FROM gcv_excursions e
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         WHERE e.id = ?'
    );
    $stmt->execute([$id]);
    $after = $stmt->fetch();
    if (!$after) {
        throw new RuntimeException('Excursão não encontrada após salvar');
    }
    gcv_audit_diff('excursion', $id, $ex, $after, $adminId, GcvCreatedBy::ADMIN);
    try {
        gcv_ops_maybe_notify_confirmed($ex, $after);
    } catch (Throwable $e) {
        error_log('notify confirmed sheet: ' . $e->getMessage());
    }
    return gcv_excursion_enrich($after);
}

/**
 * Publica no nome do guia escolhido, com o mesmo cálculo do formulário do guia.
 *
 * @param array<string,mixed> $body
 * @param array<string,mixed> $admin
 * @return array<string,mixed>
 */
function gcv_admin_publish_as_guide(array $body, array $admin): array
{
    require_once __DIR__ . '/../helpers/marketplace/publish_service.php';
    $guideId = (int)($body['guide_user_id'] ?? 0);
    if ($guideId > 0) {
        $st = db()->prepare(
            "SELECT u.id FROM gcv_users u
             LEFT JOIN gcv_guides g ON g.user_id = u.id
             WHERE u.id = ? AND u.status = 'active' LIMIT 1"
        );
        $st->execute([$guideId]);
        if (!$st->fetch()) {
            throw new InvalidArgumentException('Guia inválido');
        }
    }
    $guideNetCents = isset($body['guide_net_cents'])
        ? (int)$body['guide_net_cents']
        : (int)round(((float)($body['guide_net'] ?? 0)) * 100);
    $created = gcv_publish_guide_marketplace($body, $guideId, [
        'status' => 'published',
        'created_by' => (int)$admin['id'],
        'created_by_origin' => GcvCreatedBy::ADMIN,
        'admin_id' => (int)$admin['id'],
    ]);
    $created['guide_net_cents'] = $created['guide_net_cents'] ?? $guideNetCents;
    return $created;
}

if ($method === 'GET' && !empty($_GET['publish_options'])) {
    require_once __DIR__ . '/../helpers/marketplace/commission_service.php';
    $attrs = db()->query(
        "SELECT id, title_pt, slug, city_id, entry_price_cents, cover_url
         FROM gcv_attractions
         WHERE status = 'published'
         ORDER BY title_pt ASC"
    )->fetchAll(PDO::FETCH_ASSOC) ?: [];
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
    $guides = [];
    try {
        $guides = db()->query(
            "SELECT u.id AS user_id,
                    COALESCE(NULLIF(g.full_name,''), NULLIF(g.nickname,''), u.name) AS full_name,
                    g.nickname, u.status
             FROM gcv_users u
             LEFT JOIN gcv_guides g ON g.user_id = u.id
             WHERE u.status = 'active'
               AND (
                 u.role = 'guide'
                 OR EXISTS (SELECT 1 FROM gcv_user_roles r WHERE r.user_id = u.id AND r.role = 'guide')
                 OR g.user_id IS NOT NULL
               )
             ORDER BY full_name ASC"
        )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        try {
            $guides = db()->query(
                "SELECT u.id AS user_id,
                        COALESCE(NULLIF(g.full_name,''), NULLIF(g.nickname,''), u.name) AS full_name,
                        g.nickname, u.status
                 FROM gcv_users u
                 LEFT JOIN gcv_guides g ON g.user_id = u.id
                 WHERE u.status = 'active' AND u.role = 'guide'
                 ORDER BY full_name ASC"
            )->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Throwable $e2) {
            $guides = [];
        }
    }
    $commission = gcv_commission_resolve(null, null, null, null);
    echo json_encode(['ok' => true, 'data' => [
        'attractions' => $attrs,
        'cities' => $cities,
        'guides' => $guides,
        'min_quorum' => 0,
        'max_quorum' => 12,
        'max_people_cap' => 12,
        'guide_net_min' => gcv_guide_net_min_cents() / 100,
        'guide_net_max' => gcv_guide_net_max_default_cents() / 100,
        'guide_net_max_dragao' => gcv_guide_net_max_dragao_cents() / 100,
        'guide_net_max_transport' => gcv_guide_net_max_transport_cents() / 100,
        'commission_pct' => (float)$commission['pct'],
        'commission_scope' => (string)$commission['scope_type'],
        'profile_complete' => true,
        'financial_ready' => true,
        'business_mode' => 'GUIDE_MARKETPLACE',
    ]]);
    exit;
}

if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id > 0) {
        $stmt = db()->prepare(
            'SELECT e.*, c.name AS departure_city_name, u.name AS guide_name
             FROM gcv_excursions e
             LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
             LEFT JOIN gcv_users u ON u.id = e.guide_user_id
             WHERE e.id = ?'
        );
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Excursão não encontrada']);
            exit;
        }
        echo json_encode(['ok' => true, 'data' => gcv_excursion_enrich($row)]);
        exit;
    }
    $rows = db()->query(
        'SELECT e.*, c.name AS departure_city_name, u.name AS guide_name
         FROM gcv_excursions e
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         WHERE e.deleted_at IS NULL
         ORDER BY e.date_iso DESC, e.departure_time DESC, e.id DESC'
    )->fetchAll();
    $out = [];
    foreach ($rows as $row) {
        $out[] = gcv_excursion_enrich($row);
    }
    echo json_encode(['ok' => true, 'data' => ['excursions' => $out]]);
    exit;
}

$body = gcv_cms_json_body();
if (isset($body['departure_time'])) {
    $body['departure_time'] = gcv_normalize_departure_time((string)$body['departure_time']);
}

if ($method === 'POST') {
    if (gcv_admin_is_marketplace_payload($body)) {
        try {
            $created = gcv_admin_publish_as_guide($body, $admin);
            echo json_encode([
                'ok' => true,
                'data' => [
                    'message' => 'Passeio publicado no site.',
                    'excursion' => gcv_excursion_enrich($created),
                ],
            ]);
        } catch (InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        } catch (Throwable $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }
    $err = gcv_excursion_validate($body, true);
    if ($err) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $err]);
        exit;
    }
    $attrIds = gcv_excursion_normalize_attraction_ids($body);
    $status = (string)($body['status'] ?? 'draft');
    if (!in_array($status, ['draft', 'published', 'cancelled', 'soldout', 'pending_approval', 'rejected'], true)) {
        $status = 'draft';
    }
    $guideErr = gcv_excursion_require_guide_if_published(array_merge($body, ['status' => $status]));
    if ($guideErr) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $guideErr]);
        exit;
    }

    $createdByOrigin = GcvCreatedBy::normalize(
        (string)($body['created_by_origin'] ?? $body['CreatedBy'] ?? GcvCreatedBy::ADMIN),
        GcvCreatedBy::ADMIN
    );
    // Admin CMS sempre opera em modo administrativo (regras financeiras)
    $businessMode = GcvBusinessMode::ADMINISTRATIVE;
    $guidePayout = isset($body['guide_payout_planned_cents'])
        ? (int)$body['guide_payout_planned_cents']
        : (isset($body['guide_net_cents']) ? (int)$body['guide_net_cents'] : 0);
    if ($status === 'published' && $guidePayout < 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Informe o valor previsto de repasse ao guia']);
        exit;
    }

    $pricing = null;
    try {
        if ((int)$body['price_cents'] > 0) {
            $pricing = gcv_pricing_administrative(
                (int)$body['price_cents'],
                max(0, $guidePayout),
                !empty($body['guide_user_id']) ? (int)$body['guide_user_id'] : null,
                isset($body['category_key']) ? (string)$body['category_key'] : null,
                (int)$body['departure_city_id'],
                null
            );
        }
    } catch (Throwable $e) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        exit;
    }

    $maxPeople = min(12, max(1, (int)$body['max_people']));
    $quorum = gcv_admin_apply_forming($body, gcv_clamp_walk_quorum($body['quorum'] ?? 4, $maxPeople), $maxPeople);
    $bookedPeople = 0;
    $preconfirmed = gcv_clamp_preconfirmed($body['preconfirmed_people'] ?? 0, $maxPeople, $bookedPeople);
    $transport = gcv_admin_transport_from_body($body, [], $maxPeople);
    $stmt = db()->prepare(
        'INSERT INTO gcv_excursions (
          status, date_iso, departure_time, departure_city_id, attraction_id, guide_user_id,
          price_cents, quorum, max_people, booked_people, preconfirmed_people, include_transport, include_entry, include_lunch,
          notes_pt, notes_en, notes_es, cart_slug, created_by, updated_by,
          business_mode, created_by_origin, guide_net_cents, commission_rule_id, commission_pct_applied,
          commission_cents, price_before_round_cents, rounding_diff_cents, platform_margin_cents,
          guide_payout_planned_cents, approved_at, approved_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    $stmt->execute([
        $status,
        $body['date_iso'],
        $body['departure_time'],
        (int)$body['departure_city_id'],
        $attrIds[0],
        !empty($body['guide_user_id']) ? (int)$body['guide_user_id'] : null,
        (int)$body['price_cents'],
        $quorum,
        $maxPeople,
        $bookedPeople,
        $preconfirmed,
        !empty($body['include_transport']) ? 1 : 0,
        !empty($body['include_entry']) ? 1 : 0,
        !empty($body['include_lunch']) ? 1 : 0,
        ($body['notes_pt'] ?? null),
        ($body['notes_en'] ?? null),
        ($body['notes_es'] ?? null),
        !empty($body['cart_slug']) ? (string)$body['cart_slug'] : null,
        (int)$admin['id'],
        (int)$admin['id'],
        $businessMode,
        $createdByOrigin,
        $pricing ? $pricing['guide_payout_planned_cents'] : $guidePayout,
        $pricing['commission_rule_id'] ?? null,
        $pricing['commission_pct'] ?? null,
        $pricing['platform_margin_cents'] ?? null,
        (int)$body['price_cents'],
        0,
        $pricing['platform_margin_cents'] ?? max(0, (int)$body['price_cents'] - $guidePayout),
        $pricing ? $pricing['guide_payout_planned_cents'] : $guidePayout,
        $status === 'published' ? date('Y-m-d H:i:s') : null,
        $status === 'published' ? (int)$admin['id'] : null,
    ]);
    $id = (int)db()->lastInsertId();
    try {
        db()->prepare(
            'UPDATE gcv_excursions
             SET offer_transport=?, include_transport=?, price_transport_cents=?, quorum_transport=?, max_people_transport=?
             WHERE id=?'
        )->execute([
            $transport['offer_transport'],
            $transport['include_transport'],
            $transport['price_transport_cents'],
            $transport['quorum_transport'],
            $transport['max_people_transport'],
            $id,
        ]);
    } catch (Throwable $e) {
        error_log('admin excursion transport insert: ' . $e->getMessage());
    }
    $mp = gcv_meeting_point_from_body($body, false);
    if (!isset($mp['error']) && ($mp['point'] ?? '') !== '') {
        gcv_excursion_save_meeting_point(
            $id,
            (string)$mp['point'],
            $mp['place_id'] ?? null,
            $mp['lat'] ?? null,
            $mp['lng'] ?? null
        );
    }
    try {
        gcv_excursion_save_attractions($id, $attrIds);
    } catch (Throwable $e) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        exit;
    }
    gcv_audit_log('excursion', $id, 'admin_create', (int)$admin['id'], null, null, [
        'business_mode' => $businessMode,
        'created_by_origin' => $createdByOrigin,
        'price_cents' => (int)$body['price_cents'],
        'guide_payout_planned_cents' => $guidePayout,
    ], $createdByOrigin);
    $stmt = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ?');
    $stmt->execute([$id]);
    $created = $stmt->fetch();
    gcv_admin_notify_guide_published($id, $status);
    echo json_encode(['ok' => true, 'data' => gcv_excursion_enrich($created)]);
    exit;
}

if ($method === 'PUT' || $method === 'PATCH') {
    $id = (int)($body['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'id obrigatório']);
        exit;
    }
    $err = gcv_excursion_validate($body, false);
    if ($err) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $err]);
        exit;
    }
    $stmt = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ?');
    $stmt->execute([$id]);
    $ex = $stmt->fetch();
    if (!$ex) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Excursão não encontrada']);
        exit;
    }
    if (!empty($body['patch'])) {
        try {
            $row = gcv_admin_apply_sheet_patch($body, $ex, (int)$admin['id']);
            echo json_encode(['ok' => true, 'data' => $row]);
        } catch (InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        } catch (Throwable $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }
    $isMarketplaceUpdate = strtolower((string)($body['action'] ?? '')) === 'update'
        && gcv_admin_is_marketplace_payload($body);
    if ($isMarketplaceUpdate) {
        require_once __DIR__ . '/../helpers/guide_agenda.php';
        try {
            $row = gcv_guide_update_excursion($ex, $body, (int)$admin['id'], true);
            $newGuide = (int)($body['guide_user_id'] ?? 0);
            if ($newGuide > 0 && $newGuide !== (int)($ex['guide_user_id'] ?? 0)) {
                $ok = db()->prepare(
                    "SELECT u.id FROM gcv_users u INNER JOIN gcv_guides g ON g.user_id = u.id
                     WHERE u.id = ? AND u.status = 'active' LIMIT 1"
                );
                $ok->execute([$newGuide]);
                if (!$ok->fetch()) {
                    throw new InvalidArgumentException('Guia inválido');
                }
                db()->prepare('UPDATE gcv_excursions SET guide_user_id = ?, updated_by = ? WHERE id = ?')
                    ->execute([$newGuide, (int)$admin['id'], $id]);
                $st = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ?');
                $st->execute([$id]);
                $row = $st->fetch() ?: $row;
            }
            echo json_encode([
                'ok' => true,
                'data' => [
                    'message' => 'Passeio atualizado.',
                    'excursion' => gcv_excursion_enrich($row),
                ],
            ]);
        } catch (InvalidArgumentException $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        } catch (Throwable $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
        }
        exit;
    }
    $status = (string)($body['status'] ?? $ex['status']);
    if (!in_array($status, ['draft', 'published', 'cancelled', 'soldout', 'pending_approval', 'rejected'], true)) {
        $status = $ex['status'];
    }
    $guideErr = gcv_excursion_require_guide_if_published(array_merge($body, ['status' => $status]), $ex);
    if ($guideErr) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => $guideErr]);
        exit;
    }

    $hasAttrPayload = array_key_exists('attraction_ids', $body) || array_key_exists('attraction_id', $body);
    $attrIds = $hasAttrPayload
        ? gcv_excursion_normalize_attraction_ids($body)
        : array_map(static fn($a) => (int)$a['id'], gcv_excursion_load_attractions($id));
    if ($attrIds === []) {
        $attrIds = [(int)$ex['attraction_id']];
    }

    $priceCents = (int)($body['price_cents'] ?? $ex['price_cents']);
    $guidePayout = array_key_exists('guide_payout_planned_cents', $body)
        ? (int)$body['guide_payout_planned_cents']
        : (int)($ex['guide_payout_planned_cents'] ?? $ex['guide_net_cents'] ?? 0);
    $margin = max(0, $priceCents - $guidePayout);

    $maxPeople = min(12, max(1, (int)($body['max_people'] ?? $ex['max_people'])));
    $quorum = gcv_admin_apply_forming(
        $body,
        gcv_clamp_walk_quorum($body['quorum'] ?? $ex['quorum'], $maxPeople),
        $maxPeople
    );
    $bookedPeople = (int)($ex['booked_people'] ?? 0);
    $preconfirmed = gcv_clamp_preconfirmed(
        $body['preconfirmed_people'] ?? ($ex['preconfirmed_people'] ?? 0),
        $maxPeople,
        $bookedPeople
    );
    $transport = gcv_admin_transport_from_body($body, $ex, $maxPeople);
    $approvedAt = $ex['approved_at'] ?? null;
    $approvedBy = $ex['approved_by'] ?? null;
    $justPublished = false;
    $justRejected = false;
    if (in_array($status, ['published', 'soldout'], true) && empty($approvedAt)) {
        $approvedAt = date('Y-m-d H:i:s');
        $approvedBy = (int)$admin['id'];
        $justPublished = true;
    }
    if ($status === 'rejected' && (string)($ex['status'] ?? '') !== 'rejected') {
        $justRejected = true;
    }
    $stmt = db()->prepare(
        'UPDATE gcv_excursions SET
          status=?, date_iso=?, departure_time=?, departure_city_id=?, attraction_id=?, guide_user_id=?,
          price_cents=?, quorum=?, max_people=?, booked_people=?, preconfirmed_people=?,
          include_transport=?, include_entry=?, include_lunch=?,
          offer_transport=?, price_transport_cents=?, quorum_transport=?, max_people_transport=?,
          notes_pt=?, notes_en=?, notes_es=?, cart_slug=?, updated_by=?,
          guide_payout_planned_cents=?, guide_net_cents=?, platform_margin_cents=?,
          business_mode=COALESCE(business_mode, \'ADMINISTRATIVE\'),
          approved_at=?, approved_by=?
         WHERE id=?'
    );
    $stmt->execute([
        $status,
        $body['date_iso'] ?? $ex['date_iso'],
        $body['departure_time'] ?? $ex['departure_time'],
        (int)($body['departure_city_id'] ?? $ex['departure_city_id']),
        $attrIds[0],
        array_key_exists('guide_user_id', $body)
            ? (!empty($body['guide_user_id']) ? (int)$body['guide_user_id'] : null)
            : $ex['guide_user_id'],
        $priceCents,
        $quorum,
        $maxPeople,
        $bookedPeople,
        $preconfirmed,
        $transport['include_transport'],
        array_key_exists('include_entry', $body) ? (!empty($body['include_entry']) ? 1 : 0) : (int)$ex['include_entry'],
        array_key_exists('include_lunch', $body) ? (!empty($body['include_lunch']) ? 1 : 0) : (int)$ex['include_lunch'],
        $transport['offer_transport'],
        $transport['price_transport_cents'],
        $transport['quorum_transport'],
        $transport['max_people_transport'],
        array_key_exists('notes_pt', $body) ? $body['notes_pt'] : $ex['notes_pt'],
        array_key_exists('notes_en', $body) ? $body['notes_en'] : $ex['notes_en'],
        array_key_exists('notes_es', $body) ? $body['notes_es'] : $ex['notes_es'],
        array_key_exists('cart_slug', $body)
            ? (!empty($body['cart_slug']) ? (string)$body['cart_slug'] : null)
            : ($ex['cart_slug'] ?? null),
        (int)$admin['id'],
        $guidePayout,
        $guidePayout,
        $margin,
        $approvedAt,
        $approvedBy,
        $id,
    ]);
    if (array_key_exists('meeting_point', $body)) {
        $mp = gcv_meeting_point_from_body($body, true);
        if (isset($mp['error'])) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => $mp['error']]);
            exit;
        }
        gcv_excursion_save_meeting_point(
            $id,
            (string)$mp['point'],
            $mp['place_id'] ?? null,
            $mp['lat'] ?? null,
            $mp['lng'] ?? null
        );
    }
    if ($hasAttrPayload) {
        try {
            gcv_excursion_save_attractions($id, $attrIds);
        } catch (Throwable $e) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
            exit;
        }
    }
    $stmt = db()->prepare(
        'SELECT e.*, c.name AS departure_city_name, u.name AS guide_name
         FROM gcv_excursions e
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         WHERE e.id = ?'
    );
    $stmt->execute([$id]);
    $after = $stmt->fetch();
    gcv_audit_diff('excursion', $id, $ex, $after ?: [], (int)$admin['id'], GcvCreatedBy::ADMIN);
    try {
        gcv_ops_maybe_notify_confirmed($ex, is_array($after) ? $after : null);
    } catch (Throwable $e) {
        error_log('notify confirmed admin: ' . $e->getMessage());
    }
    if ($justPublished) {
        gcv_admin_notify_guide_published($id, $status);
    }
    if ($justRejected) {
        $reason = trim((string)($body['rejection_reason'] ?? $ex['rejection_reason'] ?? ''));
        try {
            gcv_ops_notify_guide_rejected($id, $reason);
        } catch (Throwable $e) {
            error_log('notify guide rejected cms: ' . $e->getMessage());
        }
    }
    echo json_encode(['ok' => true, 'data' => gcv_excursion_enrich($after)]);
    exit;
}

if ($method === 'DELETE') {
    $id = (int)($body['id'] ?? $_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'id obrigatório']);
        exit;
    }
    // Soft delete — nunca apagar registros financeiros/históricos
    $stmt = db()->prepare(
        "UPDATE gcv_excursions SET status='cancelled', deleted_at=NOW(), updated_by=? WHERE id=? AND deleted_at IS NULL"
    );
    $stmt->execute([(int)$admin['id'], $id]);
    if ($stmt->rowCount() < 1) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Excursão não encontrada']);
        exit;
    }
    gcv_audit_log('excursion', $id, 'soft_delete', (int)$admin['id'], 'deleted_at', null, date('c'), GcvCreatedBy::ADMIN);
    try {
        require_once dirname(__DIR__) . '/helpers/notify_ops.php';
        gcv_ops_notify_tour_cancelled($id, 'admin');
    } catch (Throwable $e) {
        error_log('notify admin tour cancel: ' . $e->getMessage());
    }
    echo json_encode(['ok' => true, 'deleted' => $id, 'soft' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
