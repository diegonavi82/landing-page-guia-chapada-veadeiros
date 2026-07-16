<?php
/**
 * Cria/atualiza passeio de TESTE: 01/01/2027 · R$ 1,00
 * Autossuficiente (não depende de helpers novos que ainda não subiram no FTP).
 *
 * 1) Faça login em /admin/login.html
 * 2) Abra: /api/admin/seed-test-excursion.php
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

try {
    require_once __DIR__ . '/../helpers/db.php';
    require_once __DIR__ . '/../helpers/auth.php';
    require_once __DIR__ . '/../helpers/cms_schema.php';
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Falha ao carregar helpers: ' . $e->getMessage()]);
    exit;
}

$admin = require_admin();

try {
    gcv_cms_ensure_schema();
    $pdo = db();

    // Guia: Diego (email do site) ou qualquer guia ativo
    $guideUserId = 0;
    try {
        $st = $pdo->prepare(
            'SELECT u.id FROM gcv_users u
             INNER JOIN gcv_guides g ON g.user_id = u.id
             WHERE u.email = ? LIMIT 1'
        );
        $st->execute(['diegonavi82@gmail.com']);
        $guideUserId = (int)($st->fetchColumn() ?: 0);
    } catch (Throwable $e) {
        // tabela guia pode não existir ainda
    }
    if ($guideUserId <= 0) {
        $guideUserId = (int)($pdo->query(
            'SELECT id FROM gcv_users WHERE role = "guide" OR role = "admin" ORDER BY id ASC LIMIT 1'
        )->fetchColumn() ?: 0);
    }
    if ($guideUserId <= 0) {
        $guideUserId = (int)$admin['id'];
    }

    $cityId = (int)($pdo->query(
        'SELECT id FROM gcv_cities WHERE status = "active" AND name LIKE "Alto Para%" LIMIT 1'
    )->fetchColumn() ?: 0);
    if ($cityId <= 0) {
        $cityId = (int)($pdo->query(
            'SELECT id FROM gcv_cities WHERE status = "active" ORDER BY id ASC LIMIT 1'
        )->fetchColumn() ?: 0);
    }
    if ($cityId <= 0) {
        throw new RuntimeException('Nenhuma cidade. Abra /api/admin/setup-cms.php primeiro.');
    }

    $attr = null;
    try {
        $attr = $pdo->query(
            'SELECT id, title_pt, slug FROM gcv_attractions WHERE status = "published" ORDER BY id ASC LIMIT 1'
        )->fetch();
        if (!$attr) {
            $attr = $pdo->query(
                'SELECT id, title_pt, slug FROM gcv_attractions ORDER BY id ASC LIMIT 1'
            )->fetch();
        }
    } catch (Throwable $e) {
        throw new RuntimeException('Tabela de atrativos ausente. Rode setup-cms e seed-attractions.');
    }
    if (!$attr) {
        throw new RuntimeException('Nenhum atrativo. Abra /api/admin/seed-attractions.php');
    }
    $attractionId = (int)$attr['id'];

    $dateIso = '2027-01-01';
    $notesPt = '[TESTE DEPLOY] Passeio fictício 01/01/2027 — pode apagar. Destino: ' . (string)($attr['title_pt'] ?? '');

    $find = $pdo->prepare(
        'SELECT id FROM gcv_excursions
         WHERE date_iso = ? AND price_cents = 100 AND notes_pt LIKE ?
         ORDER BY id DESC LIMIT 1'
    );
    $find->execute([$dateIso, '%[TESTE DEPLOY]%']);
    $existingId = (int)($find->fetchColumn() ?: 0);

    if ($existingId > 0) {
        $pdo->prepare(
            'UPDATE gcv_excursions SET
                status = "published",
                departure_time = "08:00:00",
                departure_city_id = ?,
                attraction_id = ?,
                guide_user_id = ?,
                price_cents = 100,
                quorum = 4,
                max_people = 8,
                booked_people = 0,
                include_transport = 1,
                include_entry = 0,
                include_lunch = 0,
                notes_pt = ?,
                notes_en = ?,
                notes_es = ?,
                updated_by = ?,
                updated_at = NOW()
             WHERE id = ?'
        )->execute([
            $cityId,
            $attractionId,
            $guideUserId,
            $notesPt,
            '[TEST DEPLOY] Fake tour 2027-01-01',
            '[PRUEBA DEPLOY] Excursión 01/01/2027',
            (int)$admin['id'],
            $existingId,
        ]);
        $id = $existingId;
        $created = false;
    } else {
        $pdo->prepare(
            'INSERT INTO gcv_excursions (
                status, date_iso, departure_time, departure_city_id, attraction_id, guide_user_id,
                price_cents, quorum, max_people, booked_people,
                include_transport, include_entry, include_lunch,
                notes_pt, notes_en, notes_es, created_by, updated_by
            ) VALUES (
                "published", ?, "08:00:00", ?, ?, ?,
                100, 4, 8, 0,
                1, 0, 0,
                ?, ?, ?, ?, ?
            )'
        )->execute([
            $dateIso,
            $cityId,
            $attractionId,
            $guideUserId,
            $notesPt,
            '[TEST DEPLOY] Fake tour 2027-01-01',
            '[PRUEBA DEPLOY] Excursión 01/01/2027',
            (int)$admin['id'],
            (int)$admin['id'],
        ]);
        $id = (int)$pdo->lastInsertId();
        $created = true;
    }

    // Junction opcional (se a tabela já existir no servidor)
    try {
        $pdo->prepare('DELETE FROM gcv_excursion_attractions WHERE excursion_id = ?')->execute([$id]);
        $pdo->prepare(
            'INSERT INTO gcv_excursion_attractions (excursion_id, attraction_id, sort_order) VALUES (?,?,0)'
        )->execute([$id, $attractionId]);
    } catch (Throwable $e) {
        // ok — carrossel usa attraction_id legado
    }

    $row = $pdo->prepare(
        'SELECT e.id, e.status, e.date_iso, e.price_cents, c.name AS city, u.name AS guide
         FROM gcv_excursions e
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         WHERE e.id = ?'
    );
    $row->execute([$id]);
    $data = $row->fetch() ?: [];

    echo json_encode([
        'ok' => true,
        'created' => $created,
        'message' => ($created ? 'Passeio de teste criado' : 'Passeio de teste atualizado')
            . ': 01/01/2027 · R$ 1 · publicado.',
        'data' => [
            'id' => $id,
            'date_iso' => $dateIso,
            'price_brl' => 1,
            'status' => 'published',
            'attraction' => $attr['title_pt'] ?? null,
            'departure_city' => $data['city'] ?? null,
            'guide' => $data['guide'] ?? null,
            'carousel_check' => 'https://www.guiachapadaveadeiros.com/api/excursions/carousel.php',
        ],
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => $e->getMessage(),
        'hint' => 'Se faltar atrativo/cidade: /api/admin/setup-cms.php e /api/admin/seed-attractions.php',
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}
