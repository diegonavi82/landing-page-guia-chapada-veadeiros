<?php
/**
 * Cria/atualiza passeio de TESTE: 01/01/2027 · R$ 1,00
 * Abrir logado como admin: /api/admin/seed-test-excursion.php
 *
 * Apague este arquivo depois do teste, se preferir.
 */
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/excursion_attractions.php';
require_once __DIR__ . '/../helpers/guides_seed.php';

header('Content-Type: application/json; charset=utf-8');

$admin = require_admin();
gcv_cms_ensure_schema();

try {
    // Garante guia Diego
    $guide = gcv_seed_diego_navi_guide();
    $guideUserId = (int)$guide['user_id'];

    $pdo = db();

    $cityId = (int)($pdo->query(
        'SELECT id FROM gcv_cities WHERE status = "active" AND name LIKE "Alto Para%" LIMIT 1'
    )->fetchColumn() ?: 0);
    if ($cityId <= 0) {
        $cityId = (int)($pdo->query('SELECT id FROM gcv_cities WHERE status = "active" ORDER BY id ASC LIMIT 1')->fetchColumn() ?: 0);
    }
    if ($cityId <= 0) {
        throw new RuntimeException('Nenhuma cidade base encontrada. Rode o setup CMS.');
    }

    $attr = $pdo->query(
        'SELECT id, title_pt, slug FROM gcv_attractions WHERE status = "published" ORDER BY id ASC LIMIT 1'
    )->fetch();
    if (!$attr) {
        $attr = $pdo->query('SELECT id, title_pt, slug FROM gcv_attractions ORDER BY id ASC LIMIT 1')->fetch();
    }
    if (!$attr) {
        throw new RuntimeException('Nenhum atrativo cadastrado. Importe atrativos no CMS.');
    }
    $attractionId = (int)$attr['id'];

    $dateIso = '2027-01-01';
    $notesMarker = '[TESTE DEPLOY] Passeio fictício 01/01/2027 — pode apagar.';

    // Reutiliza o mesmo teste se já existir
    $find = $pdo->prepare(
        'SELECT id FROM gcv_excursions
         WHERE date_iso = ? AND price_cents = 100 AND notes_pt LIKE ?
         ORDER BY id DESC LIMIT 1'
    );
    $find->execute([$dateIso, '%[TESTE DEPLOY]%']);
    $existingId = (int)($find->fetchColumn() ?: 0);

    $payloadNotes = $notesMarker . ' Destino: ' . (string)($attr['title_pt'] ?? 'atrativo');

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
            $payloadNotes,
            '[TEST DEPLOY] Fake tour 2027-01-01 — safe to delete.',
            '[PRUEBA DEPLOY] Excursión ficticia 01/01/2027 — se puede borrar.',
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
            $payloadNotes,
            '[TEST DEPLOY] Fake tour 2027-01-01 — safe to delete.',
            '[PRUEBA DEPLOY] Excursión ficticia 01/01/2027 — se puede borrar.',
            (int)$admin['id'],
            (int)$admin['id'],
        ]);
        $id = (int)$pdo->lastInsertId();
        $created = true;
    }

    gcv_excursion_save_attractions($id, [$attractionId]);

    $row = $pdo->prepare(
        'SELECT e.*, c.name AS departure_city_name, u.name AS guide_name
         FROM gcv_excursions e
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         WHERE e.id = ?'
    );
    $row->execute([$id]);
    $data = $row->fetch();

    echo json_encode([
        'ok' => true,
        'created' => $created,
        'message' => ($created ? 'Passeio de teste criado' : 'Passeio de teste atualizado')
            . ': 01/01/2027 · R$ 1 · publicado. Confira o carrossel da home.',
        'data' => [
            'id' => $id,
            'date_iso' => $dateIso,
            'price_cents' => 100,
            'price_brl' => 1,
            'status' => 'published',
            'attraction' => $attr['title_pt'] ?? null,
            'departure_city' => $data['departure_city_name'] ?? null,
            'guide' => $data['guide_name'] ?? null,
            'carousel_check' => '/api/excursions/carousel.php',
        ],
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
