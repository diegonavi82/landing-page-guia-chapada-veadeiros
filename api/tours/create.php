<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/../helpers/settings.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

$user = require_auth();
if (!in_array($user['role'], ['guide', 'admin'], true)) {
    json_response(false, null, 'Apenas guias e admins podem criar passeios', 403);
}

$data = body_json();

$titlePt = sanitize_text($data['title_pt'] ?? '', 200);
$titleEn = sanitize_text($data['title_en'] ?? '', 200);
$titleEs = sanitize_text($data['title_es'] ?? '', 200);

if (!$titlePt || !$titleEn || !$titleEs) {
    json_response(false, null, 'Títulos em PT, EN e ES são obrigatórios', 422);
}

$descPt        = sanitize_textarea($data['description_pt'] ?? '');
$descEn        = sanitize_textarea($data['description_en'] ?? '');
$descEs        = sanitize_textarea($data['description_es'] ?? '');
$departureDate = $data['departure_date'] ?? '';
$departureTime = $data['departure_time'] ?? '08:00';
$meetingPoint  = sanitize_text($data['meeting_point'] ?? '', 300);
$region        = validate_region($data['region'] ?? 'alto-paraiso');
$maxSpots      = min((int)setting('max_spots_per_tour', 20), validate_positive_int($data['max_spots'] ?? 10));
$priceCents    = validate_price($data['price'] ?? '0');
$difficulty    = validate_difficulty($data['difficulty'] ?? 'easy');
$coverUrl      = sanitize_text($data['cover_url'] ?? '', 500);

if (!$departureDate || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $departureDate)) {
    json_response(false, null, 'Data de saída inválida', 422);
}
if ($priceCents <= 0) json_response(false, null, 'Preço inválido', 422);

$guideId = (int)$user['id'];
if ($user['role'] === 'admin' && !empty($data['guide_id'])) {
    $guideId = (int)$data['guide_id'];
}

// Pagamentos via PIX Sicoob — exige chave PIX no perfil (não Mercado Pago)
if ($user['role'] === 'guide') {
    $stmt = db()->prepare('SELECT pix_key FROM gcv_guides WHERE user_id = ?');
    $stmt->execute([$guideId]);
    $guide = $stmt->fetch();
    if (!$guide || trim((string)($guide['pix_key'] ?? '')) === '') {
        json_response(false, null, 'Cadastre sua chave PIX no perfil antes de criar passeios', 403);
    }
}

$status = $user['role'] === 'admin' ? 'approved' : 'pending';

$pdo = db();
$pdo->prepare(
    'INSERT INTO gcv_tours (guide_id, title_pt, title_en, title_es, description_pt, description_en, description_es,
     departure_date, departure_time, meeting_point, region, max_spots, price_cents, difficulty, status, cover_url)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
)->execute([$guideId, $titlePt, $titleEn, $titleEs, $descPt, $descEn, $descEs,
            $departureDate, $departureTime, $meetingPoint, $region, $maxSpots,
            $priceCents, $difficulty, $status, $coverUrl ?: null]);

$tourId = (int)$pdo->lastInsertId();

if ($user['role'] !== 'admin') {
    $guideInfo = db()->prepare('SELECT name, email FROM gcv_users WHERE id = ?');
    $guideInfo->execute([$guideId]);
    $gData = $guideInfo->fetch();
    mail_tour_pending_admin($titlePt, $gData['name'] ?? '');
}

json_response(true, ['id' => $tourId, 'status' => $status]);
