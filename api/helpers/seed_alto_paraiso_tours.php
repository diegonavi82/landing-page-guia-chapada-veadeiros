<?php

declare(strict_types=1);

/**
 * Lote de saídas Alto Paraíso (sem guia) até 10/01/2027.
 * Marker: [lote-ap-jan2027]
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cms_schema.php';
require_once __DIR__ . '/attractions_seed.php';
require_once __DIR__ . '/excursion_attractions.php';
require_once __DIR__ . '/excursion_status.php';
require_once __DIR__ . '/meeting_point.php';
require_once __DIR__ . '/marketplace_schema.php';
require_once __DIR__ . '/marketplace/constants.php';

const GCV_LOTE_AP_MARK = '[lote-ap-jan2027]';
const GCV_LOTE_AP_START = '2026-09-22';
const GCV_LOTE_AP_END = '2027-01-10';

/**
 * @return list<array<string,mixed>>
 */
function gcv_lote_ap_catalog(): array
{
    $std = [
        'max' => 10,
        'quorum' => 4,
        'quorum_t' => 4,
        'max_t' => 4,
        'times' => ['08:00:00', '08:10:00', '08:20:00', '08:30:00', '08:40:00', '08:50:00', '09:00:00'],
        'combo' => false,
        'from' => null,
    ];
    $combo = array_merge($std, ['times' => ['08:00:00', '08:10:00'], 'combo' => true]);

    return [
        [
            'key' => 'couros',
            'slugs' => ['cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso'],
            'price' => 12000,
            'price_t' => 35000,
        ] + $std,
        [
            'key' => 'almecegas',
            'slugs' => ['cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros'],
            'price' => 9800,
            'price_t' => 28000,
        ] + $std,
        [
            'key' => 'almecegas_lua',
            'slugs' => ['almecegas-vale-da-lua-guia-chapada-veadeiros'],
            'price' => 12000,
            'price_t' => 33000,
            'family' => ['almecegas', 'vale_lua'],
        ] + $combo,
        [
            'key' => 'saltos',
            'slugs' => ['parque-nacional-chapada-veadeiros-saltos-rio-preto-sao-jorge'],
            'price' => 11600,
            'price_t' => 32000,
            'family' => ['pn'],
        ] + $std,
        [
            'key' => 'canions',
            'slugs' => ['parque-nacional-chapada-veadeiros-canions-carioquinhas-sao-jorge'],
            'price' => 11600,
            'price_t' => 32000,
            'family' => ['pn'],
        ] + $std,
        [
            'key' => 'cordovil_lua',
            'slugs' => ['cordovil-vale-da-lua-guia-chapada-veadeiros'],
            'price' => 12000,
            'price_t' => 33000,
            'from' => '2026-11-01',
            'family' => ['vale_lua', 'cordovil'],
        ] + $combo,
        [
            'key' => 'segredo_lua',
            'slugs' => ['segredo-vale-da-lua-guia-chapada-veadeiros'],
            'price' => 12000,
            'price_t' => 36000,
            'from' => '2026-11-01',
            'family' => ['segredo', 'vale_lua'],
        ] + $combo,
        [
            'key' => 'segredo',
            'slugs' => ['cachoeira-segredo-guia-chapada-veadeiros-sao-jorge'],
            'price' => 9800,
            'price_t' => 32000,
            'family' => ['segredo'],
        ] + $std,
        [
            'key' => 'vale_lua',
            'slugs' => ['vale-lua-guia-chapada-veadeiros-sao-jorge'],
            'price' => 8000,
            'price_t' => 32000,
            'family' => ['vale_lua'],
        ] + $std,
        [
            'key' => 'janela',
            'slugs' => ['mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge'],
            'price' => 10000,
            'price_t' => 30000,
            'family' => ['janela'],
        ] + $std,
        [
            'key' => 'macaquinhos',
            'slugs' => ['cachoeira-macaquinhos-guia-chapada-veadeiros-sao-joao-alianca'],
            'price' => 12000,
            'price_t' => 38000,
        ] + $std,
        [
            'key' => 'simao',
            'slugs' => ['simao-correia-guia-chapada-veadeiros'],
            'price' => 13000,
            'price_t' => 42000,
        ] + $std,
        [
            'key' => 'rei_prata',
            'slugs' => ['rei-do-prata-guia-chapada-veadeiros'],
            'price' => 16000,
            'price_t' => 54000,
            'times' => ['06:00:00'],
        ] + $std,
        [
            'key' => 'janela_noturno',
            'slugs' => ['mirante-da-janela-noturno-guia-chapada-veadeiros'],
            'price' => 12000,
            'price_t' => 35000,
            'times' => ['15:00:00'],
            'family' => ['janela'],
        ] + $std,
        [
            'key' => 'aguas_canjica',
            'slugs' => ['canjica-aguas-lindas-guia-chapada-veadeiros'],
            'price' => 16000,
            'price_t' => 54000,
            'max' => 7,
            'times' => ['06:00:00'],
        ] + $std,
        [
            'key' => 'caracol',
            'slugs' => ['caracol-guia-chapada-veadeiros'],
            'titles' => ['Caracol'],
            'price' => 9000,
            'price_t' => 30000,
            'max' => 8,
            'times' => ['08:00:00'],
        ] + $std,
        [
            'key' => 'santa_capivara',
            'slugs' => ['santa-barbara-capivara-guia-chapada-veadeiros'],
            'price' => 13000,
            'price_t' => 48000,
            'max' => 12,
            'quorum' => 6,
        ] + $std,
        [
            'key' => 'dragao',
            'slugs' => ['dragao-4x4-guia-chapada-veadeiros'],
            'price' => 25000,
            'price_t' => 54000,
            'max' => 6,
        ] + $std,
        [
            'key' => 'macacao',
            'slugs' => ['cachoeira-macacao-guia-chapada-veadeiros-sao-joao-alianca'],
            'price' => 15000,
            'price_t' => 48000,
        ] + $std,
    ];
}

/**
 * @return array{imported:int,skipped:int,covers:int,created:int,skipped_days:int,errors:list<string>}
 */
function gcv_lote_ap_run(): array
{
    gcv_cms_ensure_schema();
    gcv_marketplace_ensure_schema();
    $seed = gcv_seed_attractions_from_json();
    gcv_lote_ap_ensure_missing_attractions();
    $covers = gcv_lote_ap_apply_covers();

    $pdo = db();
    $cityId = (int)($pdo->query(
        "SELECT id FROM gcv_cities WHERE name LIKE 'Alto Para%' AND status = 'active' LIMIT 1"
    )->fetchColumn() ?: 0);
    if ($cityId <= 0) {
        throw new RuntimeException('Cidade Alto Paraíso não encontrada');
    }

    $adminId = (int)($pdo->query(
        "SELECT id FROM gcv_users WHERE LOWER(email) = 'diegonavi82@gmail.com' LIMIT 1"
    )->fetchColumn() ?: 0);
    if ($adminId <= 0) {
        $adminId = (int)($pdo->query(
            "SELECT id FROM gcv_users WHERE role = 'admin' ORDER BY id ASC LIMIT 1"
        )->fetchColumn() ?: 1);
    }

    $attrMap = gcv_lote_ap_resolve_attractions();
    $catalog = gcv_lote_ap_catalog();
    foreach ($catalog as $i => $row) {
        $id = 0;
        foreach ($row['slugs'] as $slug) {
            if (!empty($attrMap[$slug])) {
                $id = (int)$attrMap[$slug];
                break;
            }
        }
        if ($id <= 0) {
            foreach ((array)($row['titles'] ?? []) as $title) {
                $k = 'title:' . mb_strtolower(trim((string)$title));
                if (!empty($attrMap[$k])) {
                    $id = (int)$attrMap[$k];
                    break;
                }
            }
        }
        $catalog[$i]['attraction_id'] = $id;
    }
    $ready = array_values(array_filter($catalog, static fn($r) => (int)($r['attraction_id'] ?? 0) > 0));
    $missing = array_values(array_filter($catalog, static fn($r) => (int)($r['attraction_id'] ?? 0) <= 0));
    $errors = [];
    foreach ($missing as $m) {
        $errors[] = 'atrativo ausente: ' . $m['key'] . ' (' . implode(', ', $m['slugs']) . ')';
    }

    $points = array_values(array_filter(
        gcv_meeting_points_catalog(),
        static fn($p) => ($p['city'] ?? '') === 'alto_paraiso'
    ));
    if ($points === []) {
        throw new RuntimeException('Sem pontos de encontro em Alto Paraíso');
    }

    $byKey = [];
    foreach ($ready as $row) {
        $byKey[$row['key']] = $row;
    }

    $created = 0;
    $skippedDays = 0;
    $start = new DateTimeImmutable(GCV_LOTE_AP_START);
    $end = new DateTimeImmutable(GCV_LOTE_AP_END);
    $pointI = 0;

    for ($d = $start; $d <= $end; $d = $d->modify('+1 day')) {
        $date = $d->format('Y-m-d');
        $dayCount = gcv_lote_ap_day_count($pdo, $cityId, $date);
        if ($dayCount >= 4) {
            $skippedDays++;
            continue;
        }
        $usedKeys = gcv_lote_ap_day_keys($pdo, $cityId, $date, $byKey);
        $usedFamilies = [];
        foreach ($usedKeys as $k) {
            foreach ((array)($byKey[$k]['family'] ?? [$k]) as $f) {
                $usedFamilies[$f] = true;
            }
        }

        $slots = 4 - $dayCount;
        $plan = [];
        $hasCouros = in_array('couros', $usedKeys, true) || gcv_lote_ap_day_has_couros($pdo, $date);
        if (!$hasCouros && isset($byKey['couros']) && $slots > 0) {
            $plan[] = $byKey['couros'];
            $slots--;
            $usedKeys[] = 'couros';
        }

        $pool = [];
        foreach ($ready as $row) {
            if ($row['key'] === 'couros') {
                continue;
            }
            if (!empty($row['from']) && $date < $row['from']) {
                continue;
            }
            if (in_array($row['key'], $usedKeys, true)) {
                continue;
            }
            $families = (array)($row['family'] ?? [$row['key']]);
            $clash = false;
            foreach ($families as $f) {
                if (!empty($usedFamilies[$f])) {
                    $clash = true;
                    break;
                }
            }
            if (!$clash) {
                $pool[] = $row;
            }
        }
        shuffle($pool);
        $extraN = min($slots, count($pool), random_int(2, 3));
        if ($slots > 0 && $extraN < 1 && $pool) {
            $extraN = 1;
        }
        foreach (array_slice($pool, 0, $extraN) as $row) {
            $plan[] = $row;
            foreach ((array)($row['family'] ?? [$row['key']]) as $f) {
                $usedFamilies[$f] = true;
            }
        }

        $usedTimes = gcv_lote_ap_day_times($pdo, $cityId, $date);
        foreach ($plan as $row) {
            $times = $row['times'];
            $time = $times[array_rand($times)];
            $tries = 0;
            while (isset($usedTimes[$time]) && $tries < 8) {
                $time = $times[array_rand($times)];
                $tries++;
            }
            $usedTimes[$time] = true;
            $mp = $points[$pointI % count($points)];
            $pointI++;
            try {
                gcv_lote_ap_insert_tour($pdo, [
                    'date' => $date,
                    'time' => $time,
                    'city_id' => $cityId,
                    'admin_id' => $adminId,
                    'attraction_id' => (int)$row['attraction_id'],
                    'price' => (int)$row['price'],
                    'price_t' => (int)$row['price_t'],
                    'max' => (int)$row['max'],
                    'quorum' => (int)$row['quorum'],
                    'quorum_t' => (int)$row['quorum_t'],
                    'max_t' => (int)$row['max_t'],
                    'meeting' => $mp,
                ]);
                $created++;
            } catch (Throwable $e) {
                $errors[] = $date . ' ' . $row['key'] . ': ' . $e->getMessage();
            }
        }
    }

    return [
        'imported' => (int)($seed['imported'] ?? 0),
        'skipped' => (int)($seed['skipped'] ?? 0),
        'covers' => $covers,
        'created' => $created,
        'skipped_days' => $skippedDays,
        'errors' => $errors,
    ];
}

/**
 * @return array<string,int>
 */
function gcv_lote_ap_resolve_attractions(): array
{
    $out = [];
    $st = db()->query('SELECT id, slug, title_pt FROM gcv_attractions');
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        $out[(string)$row['slug']] = (int)$row['id'];
        $title = mb_strtolower(trim((string)($row['title_pt'] ?? '')));
        if ($title !== '') {
            $out['title:' . $title] = (int)$row['id'];
        }
    }
    return $out;
}

function gcv_lote_ap_ensure_missing_attractions(): void
{
    $pdo = db();
    $need = [
        [
            'slug' => 'caracol-guia-chapada-veadeiros',
            'title_pt' => 'Caracol',
            'title_en' => 'Caracol',
            'title_es' => 'Caracol',
            'excerpt_pt' => 'Cachoeira Caracol no Complexo Caldeira, Alto Paraíso de Goiás.',
            'excerpt_en' => 'Caracol waterfall at Complexo Caldeira, Alto Paraíso de Goiás.',
            'excerpt_es' => 'Cascada Caracol en el Complejo Caldeira, Alto Paraíso de Goiás.',
            'cover' => '/assets/img/imagens/cachoeira-caracol-poco-guia-chapada-veadeiros-alto-paraiso.jpg',
        ],
    ];
    $find = $pdo->prepare('SELECT id FROM gcv_attractions WHERE slug = ? LIMIT 1');
    $ins = $pdo->prepare(
        'INSERT INTO gcv_attractions (
            slug, status, title_pt, title_en, title_es,
            excerpt_pt, excerpt_en, excerpt_es, cover_url, published_at, created_at
         ) VALUES (?,\'published\',?,?,?,?,?,?,?,NOW(),NOW())'
    );
    foreach ($need as $a) {
        $find->execute([$a['slug']]);
        if ($find->fetchColumn()) {
            continue;
        }
        $ins->execute([
            $a['slug'],
            $a['title_pt'],
            $a['title_en'],
            $a['title_es'],
            $a['excerpt_pt'],
            $a['excerpt_en'],
            $a['excerpt_es'],
            $a['cover'],
        ]);
    }
}

function gcv_lote_ap_apply_covers(): int
{
    $map = [
        'canjica-aguas-lindas-guia-chapada-veadeiros' =>
            '/assets/img/imagens/aguas-lindas-canjica-guia-chapada-veadeiros-alto-paraiso.jpg',
        'dragao-4x4-guia-chapada-veadeiros' =>
            '/assets/img/imagens/cachoeira-dragao-guia-chapada-veadeiros-alto-paraiso.jpg',
        'caracol-guia-chapada-veadeiros' =>
            '/assets/img/imagens/cachoeira-caracol-poco-guia-chapada-veadeiros-alto-paraiso.jpg',
        'simao-correia-guia-chapada-veadeiros' =>
            '/assets/img/imagens/cachoeira-simao-correia-guia-chapada-veadeiros-alto-paraiso.jpg',
        'mirante-da-janela-noturno-guia-chapada-veadeiros' =>
            '/assets/img/imagens/mirante-janela-guia-chapada-veadeiros-sao-jorge-parque-nacional-1.jpg',
    ];
    $n = 0;
    $upd = db()->prepare('UPDATE gcv_attractions SET cover_url = ? WHERE slug = ?');
    $find = db()->prepare('SELECT id FROM gcv_attractions WHERE slug = ? LIMIT 1');
    $gal = db()->prepare(
        'INSERT INTO gcv_attraction_media (attraction_id, url, alt_text, sort_order)
         SELECT ?, ?, title_pt, 0 FROM gcv_attractions WHERE id = ?
         AND NOT EXISTS (
            SELECT 1 FROM gcv_attraction_media m WHERE m.attraction_id = ? AND m.url = ?
         )'
    );
    foreach ($map as $slug => $url) {
        $find->execute([$slug]);
        $id = (int)$find->fetchColumn();
        if ($id <= 0) {
            continue;
        }
        $upd->execute([$url, $slug]);
        $gal->execute([$id, $url, $id, $id, $url]);
        $n++;
    }
    return $n;
}

function gcv_lote_ap_day_count(PDO $pdo, int $cityId, string $date): int
{
    $st = $pdo->prepare(
        "SELECT COUNT(*) FROM gcv_excursions
         WHERE date_iso = ? AND departure_city_id = ?
           AND status IN ('published','soldout') AND deleted_at IS NULL"
    );
    $st->execute([$date, $cityId]);
    return (int)$st->fetchColumn();
}

function gcv_lote_ap_day_has_couros(PDO $pdo, string $date): bool
{
    $st = $pdo->prepare(
        "SELECT 1
         FROM gcv_excursions e
         LEFT JOIN gcv_excursion_attractions x ON x.excursion_id = e.id
         LEFT JOIN gcv_attractions a ON a.id = COALESCE(x.attraction_id, e.attraction_id)
         WHERE e.date_iso = ?
           AND e.status IN ('published','soldout','pending_approval')
           AND e.deleted_at IS NULL
           AND (
             a.slug = 'cataratas-dos-couros-guia-chapada-veadeiros-alto-paraiso'
             OR LOWER(a.title_pt) LIKE '%cataratas dos couros%'
           )
         LIMIT 1"
    );
    $st->execute([$date]);
    return (bool)$st->fetchColumn();
}

/**
 * @param array<string,array<string,mixed>> $byKey
 * @return list<string>
 */
function gcv_lote_ap_day_keys(PDO $pdo, int $cityId, string $date, array $byKey): array
{
    $slugToKey = [];
    foreach ($byKey as $key => $row) {
        foreach ($row['slugs'] as $slug) {
            $slugToKey[$slug] = $key;
        }
    }
    $st = $pdo->prepare(
        "SELECT a.slug
         FROM gcv_excursions e
         LEFT JOIN gcv_excursion_attractions x ON x.excursion_id = e.id
         LEFT JOIN gcv_attractions a ON a.id = COALESCE(x.attraction_id, e.attraction_id)
         WHERE e.date_iso = ? AND e.departure_city_id = ?
           AND e.status IN ('published','soldout') AND e.deleted_at IS NULL"
    );
    $st->execute([$date, $cityId]);
    $keys = [];
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $row) {
        $slug = (string)($row['slug'] ?? '');
        if ($slug !== '' && isset($slugToKey[$slug])) {
            $keys[] = $slugToKey[$slug];
        }
    }
    return array_values(array_unique($keys));
}

/**
 * @return array<string,true>
 */
function gcv_lote_ap_day_times(PDO $pdo, int $cityId, string $date): array
{
    $st = $pdo->prepare(
        "SELECT departure_time FROM gcv_excursions
         WHERE date_iso = ? AND departure_city_id = ?
           AND status IN ('published','soldout') AND deleted_at IS NULL"
    );
    $st->execute([$date, $cityId]);
    $out = [];
    foreach ($st->fetchAll(PDO::FETCH_COLUMN) ?: [] as $t) {
        $out[(string)$t] = true;
    }
    return $out;
}

/**
 * @param array<string,mixed> $p
 */
function gcv_lote_ap_insert_tour(PDO $pdo, array $p): void
{
    $exists = $pdo->prepare(
        "SELECT id FROM gcv_excursions
         WHERE date_iso = ? AND attraction_id = ? AND departure_city_id = ?
           AND status IN ('published','soldout') AND deleted_at IS NULL
           AND (notes_pt LIKE ? OR guide_user_id IS NULL)
         LIMIT 1"
    );
    $exists->execute([$p['date'], $p['attraction_id'], $p['city_id'], '%' . GCV_LOTE_AP_MARK . '%']);
    if ($exists->fetchColumn()) {
        return;
    }

    $notesPt = 'Guia a alocar. Saída de Alto Paraíso. ' . GCV_LOTE_AP_MARK;
    $notesEn = 'Guide to be assigned. Departure from Alto Paraíso. ' . GCV_LOTE_AP_MARK;
    $notesEs = 'Guía por asignar. Salida desde Alto Paraíso. ' . GCV_LOTE_AP_MARK;
    $origin = class_exists('GcvCreatedBy') ? GcvCreatedBy::ADMIN : 'ADMIN';
    $mode = class_exists('GcvBusinessMode') ? GcvBusinessMode::ADMINISTRATIVE : 'ADMINISTRATIVE';

    $stmt = $pdo->prepare(
        'INSERT INTO gcv_excursions (
          status, date_iso, departure_time, departure_city_id, attraction_id, guide_user_id,
          price_cents, quorum, max_people, booked_people, preconfirmed_people,
          include_transport, include_entry, include_lunch,
          notes_pt, notes_en, notes_es, cart_slug, created_by, updated_by,
          business_mode, created_by_origin, guide_net_cents, commission_rule_id, commission_pct_applied,
          commission_cents, price_before_round_cents, rounding_diff_cents, platform_margin_cents,
          guide_payout_planned_cents, approved_at, approved_by
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    $stmt->execute([
        'published',
        $p['date'],
        $p['time'],
        $p['city_id'],
        $p['attraction_id'],
        null,
        $p['price'],
        $p['quorum'],
        $p['max'],
        0,
        0,
        1,
        0,
        0,
        $notesPt,
        $notesEn,
        $notesEs,
        null,
        $p['admin_id'],
        $p['admin_id'],
        $mode,
        $origin,
        0,
        null,
        null,
        0,
        $p['price'],
        0,
        $p['price'],
        0,
        date('Y-m-d H:i:s'),
        $p['admin_id'],
    ]);
    $id = (int)$pdo->lastInsertId();
    $pdo->prepare(
        'UPDATE gcv_excursions
         SET offer_transport=1, include_transport=1, price_transport_cents=?,
             quorum_transport=?, max_people_transport=?
         WHERE id=?'
    )->execute([$p['price_t'], $p['quorum_t'], $p['max_t'], $id]);

    $mp = $p['meeting'];
    gcv_excursion_save_meeting_point(
        $id,
        (string)$mp['label_pt'],
        (string)$mp['id'],
        null,
        null
    );
    gcv_excursion_save_attractions($id, [(int)$p['attraction_id']]);
}
