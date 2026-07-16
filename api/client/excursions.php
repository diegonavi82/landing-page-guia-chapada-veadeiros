<?php
declare(strict_types=1);

/**
 * Cliente: criar excursão compartilhada (preço por pessoa) + listar opções.
 * POST — cria draft (admin atribui guia e publica)
 * GET  — atrativos/cidades + minhas propostas
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/excursion_status.php';

header('Content-Type: application/json; charset=utf-8');

$user = require_auth();
if (($user['role'] ?? '') !== 'client') {
    json_response(false, null, 'Apenas clientes', 403);
}
gcv_cms_ensure_schema();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$MIN_QUORUM = 4;

if ($method === 'GET') {
    $attrs = db()->query(
        "SELECT id, title_pt, slug FROM gcv_attractions WHERE status = 'published' ORDER BY title_pt ASC"
    )->fetchAll(PDO::FETCH_ASSOC);
    $cities = db()->query(
        "SELECT id, name FROM gcv_cities WHERE status = 'active' ORDER BY name ASC"
    )->fetchAll(PDO::FETCH_ASSOC);

    $mine = db()->prepare(
        'SELECT e.*, a.title_pt AS attraction_title, c.name AS departure_city_name, u.name AS guide_name
         FROM gcv_excursions e
         LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         LEFT JOIN gcv_users u ON u.id = e.guide_user_id
         WHERE e.created_by = ?
         ORDER BY e.date_iso DESC'
    );
    $mine->execute([(int)$user['id']]);
    $rows = [];
    foreach ($mine->fetchAll(PDO::FETCH_ASSOC) ?: [] as $r) {
        $life = gcv_resolve_excursion_lifecycle($r);
        $r['lifecycle'] = $life;
        $r['lifecycle_label'] = gcv_excursion_lifecycle_label($life);
        $rows[] = $r;
    }

    json_response(true, [
        'attractions' => $attrs,
        'cities' => $cities,
        'min_quorum' => $MIN_QUORUM,
        'my_proposals' => $rows,
    ]);
}

if ($method === 'POST') {
    $data = body_json();
    $date = trim((string)($data['date_iso'] ?? ''));
    $time = trim((string)($data['departure_time'] ?? ''));
    $cityId = (int)($data['departure_city_id'] ?? 0);
    $attrId = (int)($data['attraction_id'] ?? 0);
    $priceCents = isset($data['price_cents'])
        ? (int)$data['price_cents']
        : (int)round(((float)($data['price'] ?? 0)) * 100);
    $quorum = max($MIN_QUORUM, (int)($data['quorum'] ?? $MIN_QUORUM));
    $maxPeople = (int)($data['max_people'] ?? 10);
    $notes = sanitize_textarea((string)($data['notes_pt'] ?? ''), 2000);

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        json_response(false, null, 'Data inválida', 422);
    }
    $today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
    if ($date < $today) {
        json_response(false, null, 'Data deve ser futura', 422);
    }
    if (!preg_match('/^\d{2}:\d{2}/', $time)) {
        json_response(false, null, 'Horário inválido', 422);
    }
    $time = substr($time, 0, 5) . ':00';
    if ($cityId <= 0 || $attrId <= 0) {
        json_response(false, null, 'Cidade e atrativo obrigatórios', 422);
    }
    if ($priceCents < 100) {
        json_response(false, null, 'Informe o valor por pessoa', 422);
    }
    if ($maxPeople < $quorum) {
        json_response(false, null, 'Máximo deve ser ≥ quórum', 422);
    }

    $a = db()->prepare("SELECT id FROM gcv_attractions WHERE id = ? AND status = 'published'");
    $a->execute([$attrId]);
    if (!$a->fetch()) {
        json_response(false, null, 'Atrativo inválido', 422);
    }

    // Sem guia: fica draft até o admin atribuir guia e publicar
    $stmt = db()->prepare(
        'INSERT INTO gcv_excursions (
          status, date_iso, departure_time, departure_city_id, attraction_id, guide_user_id,
          price_cents, quorum, max_people, booked_people, include_transport, include_entry, include_lunch,
          notes_pt, created_by, updated_by
        ) VALUES (\'draft\',?,?,?,?,NULL,?,?,?,0,?,?,?,?,?,?)'
    );
    $stmt->execute([
        $date,
        $time,
        $cityId,
        $attrId,
        $priceCents,
        $quorum,
        $maxPeople,
        !empty($data['include_transport']) ? 1 : 0,
        !empty($data['include_entry']) ? 1 : 0,
        !empty($data['include_lunch']) ? 1 : 0,
        $notes !== '' ? $notes : null,
        (int)$user['id'],
        (int)$user['id'],
    ]);

    json_response(true, [
        'message' => 'Proposta criada. O admin deve atribuir o guia e publicar.',
        'id' => (int)db()->lastInsertId(),
        'price_cents' => $priceCents,
    ]);
}

json_response(false, null, 'Método não permitido', 405);
