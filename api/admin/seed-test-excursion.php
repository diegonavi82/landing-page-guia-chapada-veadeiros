<?php
/**
 * Passeio de teste: 01/01/2027 · R$ 1
 * Login admin → abrir esta URL.
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function gcv_seed_fail(string $msg, int $code = 500): void
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

$db = __DIR__ . '/../helpers/db.php';
$auth = __DIR__ . '/../helpers/auth.php';
$schema = __DIR__ . '/../helpers/cms_schema.php';

if (!is_file($db)) gcv_seed_fail('Falta api/helpers/db.php no servidor');
if (!is_file($auth)) gcv_seed_fail('Falta api/helpers/auth.php no servidor');

require_once $db;
require_once $auth;

$admin = require_admin();

if (is_file($schema)) {
    require_once $schema;
    if (function_exists('gcv_cms_ensure_schema')) {
        try {
            gcv_cms_ensure_schema();
        } catch (Throwable $e) {
            // segue mesmo assim
        }
    }
}

try {
    $pdo = db();

    $guideUserId = (int)$admin['id'];
    try {
        $st = $pdo->prepare('SELECT id FROM gcv_users WHERE email = ? LIMIT 1');
        $st->execute(['diegonavi82@gmail.com']);
        $id = (int)($st->fetchColumn() ?: 0);
        if ($id > 0) $guideUserId = $id;
    } catch (Throwable $e) {
    }

    $cityId = 0;
    try {
        $cityId = (int)($pdo->query(
            'SELECT id FROM gcv_cities WHERE name LIKE "Alto Para%" LIMIT 1'
        )->fetchColumn() ?: 0);
        if ($cityId <= 0) {
            $cityId = (int)($pdo->query('SELECT id FROM gcv_cities ORDER BY id ASC LIMIT 1')->fetchColumn() ?: 0);
        }
    } catch (Throwable $e) {
        gcv_seed_fail('Tabela gcv_cities ausente. Rode /api/admin/setup-cms.php');
    }
    if ($cityId <= 0) gcv_seed_fail('Nenhuma cidade. Rode /api/admin/setup-cms.php');

    $attr = null;
    try {
        $attr = $pdo->query(
            'SELECT id, title_pt FROM gcv_attractions WHERE status = "published" ORDER BY id ASC LIMIT 1'
        )->fetch();
        if (!$attr) {
            $attr = $pdo->query('SELECT id, title_pt FROM gcv_attractions ORDER BY id ASC LIMIT 1')->fetch();
        }
    } catch (Throwable $e) {
        gcv_seed_fail('Tabela gcv_attractions ausente. Rode setup-cms + seed-attractions.');
    }
    if (!$attr) gcv_seed_fail('Nenhum atrativo. Abra /api/admin/seed-attractions.php');

    $attractionId = (int)$attr['id'];
    $dateIso = '2027-01-01';
    $notes = '[TESTE DEPLOY] Passeio ficticio 01/01/2027 - pode apagar. ' . (string)($attr['title_pt'] ?? '');

    $find = $pdo->prepare(
        'SELECT id FROM gcv_excursions WHERE date_iso = ? AND price_cents = 100 AND notes_pt LIKE ? ORDER BY id DESC LIMIT 1'
    );
    $find->execute([$dateIso, '%[TESTE DEPLOY]%']);
    $existingId = (int)($find->fetchColumn() ?: 0);

    if ($existingId > 0) {
        $pdo->prepare(
            'UPDATE gcv_excursions SET status="published", departure_time="08:00:00",
             departure_city_id=?, attraction_id=?, guide_user_id=?, price_cents=100,
             quorum=4, max_people=8, booked_people=0, include_transport=1,
             notes_pt=?, updated_by=?, updated_at=NOW() WHERE id=?'
        )->execute([$cityId, $attractionId, $guideUserId, $notes, (int)$admin['id'], $existingId]);
        $id = $existingId;
        $created = false;
    } else {
        $pdo->prepare(
            'INSERT INTO gcv_excursions (
                status, date_iso, departure_time, departure_city_id, attraction_id, guide_user_id,
                price_cents, quorum, max_people, booked_people, include_transport, include_entry, include_lunch,
                notes_pt, created_by, updated_by
            ) VALUES (
                "published", ?, "08:00:00", ?, ?, ?,
                100, 4, 8, 0, 1, 0, 0,
                ?, ?, ?
            )'
        )->execute([
            $dateIso, $cityId, $attractionId, $guideUserId,
            $notes, (int)$admin['id'], (int)$admin['id'],
        ]);
        $id = (int)$pdo->lastInsertId();
        $created = true;
    }

    try {
        $pdo->prepare('DELETE FROM gcv_excursion_attractions WHERE excursion_id = ?')->execute([$id]);
        $pdo->prepare(
            'INSERT INTO gcv_excursion_attractions (excursion_id, attraction_id, sort_order) VALUES (?,?,0)'
        )->execute([$id, $attractionId]);
    } catch (Throwable $e) {
    }

    echo json_encode([
        'ok' => true,
        'created' => $created,
        'message' => ($created ? 'Criado' : 'Atualizado') . ': 01/01/2027 R$1 publicado',
        'data' => [
            'id' => $id,
            'date_iso' => $dateIso,
            'price_brl' => 1,
            'attraction' => $attr['title_pt'] ?? null,
            'carousel' => '/api/excursions/carousel.php',
        ],
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} catch (Throwable $e) {
    gcv_seed_fail($e->getMessage());
}
