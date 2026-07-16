<?php
declare(strict_types=1);

/**
 * Agenda / publicar / cancelar excursões do guia (gcv_excursions).
 * GET  — lista minhas saídas + opções (atrativos, cidades)
 * POST — publica saída (preço/pessoa, quorum ≥ 4)
 * PUT  — cancela saída futura (status=cancelled)
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/excursion_status.php';

header('Content-Type: application/json; charset=utf-8');

$user = require_role('guide');
if (($user['status'] ?? '') !== 'active') {
    json_response(false, null, 'Guia ainda não aprovado', 403);
}
gcv_cms_ensure_schema();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$MIN_QUORUM = 4;

function gcv_guide_profile_is_complete(int $userId): bool
{
    $stmt = db()->prepare(
        'SELECT full_name, nickname, cpf, pix_key, pix_key_type, phone, birth_date,
                base_city_id, id_document_url, diploma_url, photo_3x4_url, photo_url, bio_pt, profile_complete
         FROM gcv_guides WHERE user_id = ? LIMIT 1'
    );
    $stmt->execute([$userId]);
    $p = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$p) return false;
    if (!empty($p['profile_complete'])) return true;
    $cpf = preg_replace('/\D+/', '', (string)($p['cpf'] ?? '')) ?? '';
    $phone = preg_replace('/\D+/', '', (string)($p['phone'] ?? '')) ?? '';
    $doc = trim((string)($p['id_document_url'] ?? $p['diploma_url'] ?? ''));
    $photo = trim((string)($p['photo_3x4_url'] ?? $p['photo_url'] ?? ''));
    return trim((string)($p['full_name'] ?? '')) !== ''
        && trim((string)($p['nickname'] ?? '')) !== ''
        && strlen($cpf) === 11
        && trim((string)($p['pix_key'] ?? '')) !== ''
        && trim((string)($p['pix_key_type'] ?? '')) !== ''
        && strlen($phone) >= 10
        && !empty($p['birth_date'])
        && !empty($p['base_city_id'])
        && $doc !== ''
        && $photo !== ''
        && trim((string)($p['bio_pt'] ?? '')) !== '';
}

function gcv_map_excursion_row(array $r): array
{
    $life = gcv_resolve_excursion_lifecycle($r);
    $r['lifecycle'] = $life;
    $r['lifecycle_label'] = gcv_excursion_lifecycle_label($life);
    $r['can_cancel'] = in_array($life, ['em_formacao', 'confirmada'], true)
        && (string)($r['date_iso'] ?? '') >= (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d')
        && (string)($r['status'] ?? '') !== 'cancelled';
    return $r;
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

    $today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
    $upcoming = array_values(array_filter($rows, static function ($e) use ($today) {
        return (string)$e['date_iso'] >= $today && ($e['status'] ?? '') !== 'cancelled';
    }));

    $attrs = db()->query(
        "SELECT id, title_pt, slug, city_id, entry_price_cents
         FROM gcv_attractions
         WHERE status = 'published'
         ORDER BY title_pt ASC"
    )->fetchAll(PDO::FETCH_ASSOC);

    $cities = db()->query(
        "SELECT id, name FROM gcv_cities WHERE status = 'active' ORDER BY name ASC"
    )->fetchAll(PDO::FETCH_ASSOC);

    json_response(true, [
        'excursions' => $rows,
        'upcoming' => $upcoming,
        'attractions' => $attrs,
        'cities' => $cities,
        'min_quorum' => $MIN_QUORUM,
        'profile_complete' => gcv_guide_profile_is_complete((int)$user['id']),
    ]);
}

if ($method === 'POST') {
    if (!gcv_guide_profile_is_complete((int)$user['id'])) {
        json_response(false, null, 'Complete seu perfil antes de publicar passeios', 422);
    }
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
        json_response(false, null, 'Cidade e atrativo são obrigatórios', 422);
    }
    if ($priceCents < 100) {
        json_response(false, null, 'Valor por pessoa inválido', 422);
    }
    if ($maxPeople < $quorum) {
        json_response(false, null, 'Máximo de pessoas deve ser ≥ quórum (' . $MIN_QUORUM . ')', 422);
    }

    $a = db()->prepare("SELECT id FROM gcv_attractions WHERE id = ? AND status = 'published'");
    $a->execute([$attrId]);
    if (!$a->fetch()) {
        json_response(false, null, 'Atrativo inválido ou não publicado pelo admin', 422);
    }
    $c = db()->prepare("SELECT id FROM gcv_cities WHERE id = ? AND status = 'active'");
    $c->execute([$cityId]);
    if (!$c->fetch()) {
        json_response(false, null, 'Cidade de saída inválida', 422);
    }

    $stmt = db()->prepare(
        'INSERT INTO gcv_excursions (
          status, date_iso, departure_time, departure_city_id, attraction_id, guide_user_id,
          price_cents, quorum, max_people, booked_people, include_transport, include_entry, include_lunch,
          notes_pt, created_by, updated_by
        ) VALUES (\'published\',?,?,?,?,?,?,?,?,0,?,?,?,?,?,?)'
    );
    $stmt->execute([
        $date,
        $time,
        $cityId,
        $attrId,
        (int)$user['id'],
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
    $id = (int)db()->lastInsertId();
    $get = db()->prepare(
        'SELECT e.*, a.title_pt AS attraction_title, c.name AS departure_city_name
         FROM gcv_excursions e
         LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         WHERE e.id = ?'
    );
    $get->execute([$id]);
    $row = gcv_map_excursion_row($get->fetch(PDO::FETCH_ASSOC) ?: []);
    json_response(true, [
        'message' => 'Passeio publicado (em formação até atingir o quórum de ' . $MIN_QUORUM . ')',
        'excursion' => $row,
    ]);
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
        json_response(true, [
            'message' => 'Passeio cancelado',
            'excursion' => gcv_map_excursion_row($ex),
        ]);
    }

    json_response(false, null, 'Ação inválida', 422);
}

json_response(false, null, 'Método não permitido', 405);
