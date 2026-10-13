<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/anfitrioes.php';

header('Content-Type: application/json; charset=utf-8');

$user = current_user();
if (!$user) {
    json_response(false, null, 'Não autenticado', 401);
}
$pdo = db();
gcv_anfitriao_ensure($pdo);
$st = $pdo->prepare('SELECT * FROM gcv_anfitrioes WHERE email = ?');
$st->execute([strtolower((string)($user['email'] ?? ''))]);
$host = $st->fetch();
if (!$host || ($host['status'] ?? '') !== 'active') {
    json_response(false, null, 'Aguarde a aprovação do admin para editar a venda', 403);
}
$attractionId = (int)($host['attraction_id'] ?? 0);
if ($attractionId <= 0) {
    json_response(false, null, 'Experiência do anfitrião não encontrada', 404);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $row = $pdo->prepare('SELECT id, title_pt, slug, tem_passeio, experiencia_json FROM gcv_attractions WHERE id = ?');
    $row->execute([$attractionId]);
    $atra = $row->fetch();
    $exp = [];
    if ($atra && !empty($atra['experiencia_json'])) {
        $decoded = json_decode((string)$atra['experiencia_json'], true);
        if (is_array($decoded)) {
            $exp = $decoded;
        }
    }
    json_response(true, [
        'anfitriao' => $host,
        'atrativo' => $atra ? ['id' => (int)$atra['id'], 'title_pt' => $atra['title_pt'], 'slug' => $atra['slug'], 'tem_passeio' => !isset($atra['tem_passeio']) || (int)$atra['tem_passeio'] === 1] : null,
        'venda' => isset($exp['venda']) && is_array($exp['venda']) ? $exp['venda'] : new stdClass(),
        'guias' => [],
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data = body_json();
    $venda = isset($data['venda']) && is_array($data['venda']) ? $data['venda'] : [];
    $row = $pdo->prepare('SELECT experiencia_json FROM gcv_attractions WHERE id = ?');
    $row->execute([$attractionId]);
    $atual = $row->fetch();
    $exp = [];
    if ($atual && !empty($atual['experiencia_json'])) {
        $decoded = json_decode((string)$atual['experiencia_json'], true);
        if (is_array($decoded)) {
            $exp = $decoded;
        }
    }
    $exp['venda'] = $venda;
    $json = json_encode($exp, JSON_UNESCAPED_UNICODE);
    $pdo->prepare('UPDATE gcv_attractions SET experiencia_json = ? WHERE id = ?')->execute([$json !== false ? $json : null, $attractionId]);
    if (array_key_exists('tem_passeio', $data)) {
        $pdo->prepare('UPDATE gcv_attractions SET tem_passeio = ? WHERE id = ?')->execute([!empty($data['tem_passeio']) ? 1 : 0, $attractionId]);
    }
    json_response(true, ['venda' => $venda, 'tem_passeio' => !array_key_exists('tem_passeio', $data) || !empty($data['tem_passeio'])]);
}

json_response(false, null, 'Método não permitido', 405);
