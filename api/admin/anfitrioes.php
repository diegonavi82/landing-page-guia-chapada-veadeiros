<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/anfitrioes.php';

header('Content-Type: application/json; charset=utf-8');
require_admin();
$pdo = db();
gcv_anfitriao_ensure($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $hosts = $pdo->query('SELECT * FROM gcv_anfitrioes ORDER BY id DESC')->fetchAll() ?: [];
    $wa = $pdo->query('SELECT destino AS para, texto, created_at AS em FROM gcv_anfitriao_wa ORDER BY id DESC LIMIT 40')->fetchAll() ?: [];
    json_response(true, ['anfitrioes' => $hosts, 'whatsapp' => $wa]);
}

$data = body_json();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nome = sanitize_text((string)($data['nome'] ?? ''), 160);
    $email = strtolower(trim((string)($data['email'] ?? '')));
    $telefone = preg_replace('/\D+/', '', (string)($data['telefone'] ?? '')) ?? '';
    $experiencia = sanitize_text((string)($data['experiencia'] ?? ''), 190);
    if ($nome === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($telefone) < 10) {
        json_response(false, null, 'Nome, e-mail e telefone com DDD são obrigatórios', 422);
    }
    $dup = $pdo->prepare('SELECT id FROM gcv_anfitrioes WHERE email = ?');
    $dup->execute([$email]);
    if ($dup->fetch()) {
        json_response(false, null, 'Já existe um anfitrião com este e-mail', 422);
    }
    $pdo->prepare('INSERT INTO gcv_anfitrioes (nome, email, telefone, experiencia, status) VALUES (?,?,?,?,\'pending\')')
        ->execute([$nome, $email, $telefone, $experiencia !== '' ? $experiencia : 'A definir']);
    gcv_anfitriao_avisar($pdo, 'admin', 'Novo anfitrião aguardando aprovação: ' . $nome . ' · ' . $email . ' · ' . $telefone . ' · ' . ($experiencia !== '' ? $experiencia : 'A definir') . '. O financeiro fica fechado até você aprovar.');
    $hosts = $pdo->query('SELECT * FROM gcv_anfitrioes ORDER BY id DESC')->fetchAll() ?: [];
    $wa = $pdo->query('SELECT destino AS para, texto, created_at AS em FROM gcv_anfitriao_wa ORDER BY id DESC LIMIT 40')->fetchAll() ?: [];
    json_response(true, ['anfitrioes' => $hosts, 'whatsapp' => $wa]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $id = (int)($data['id'] ?? 0);
    $action = (string)($data['action'] ?? '');
    $st = $pdo->prepare('SELECT * FROM gcv_anfitrioes WHERE id = ?');
    $st->execute([$id]);
    $host = $st->fetch();
    if (!$host) {
        json_response(false, null, 'Anfitrião não encontrado', 404);
    }
    if ($action === 'aprovar') {
        $pdo->prepare("UPDATE gcv_anfitrioes SET status = 'active' WHERE id = ?")->execute([$id]);
        gcv_anfitriao_avisar($pdo, (string)$host['telefone'], $host['nome'] . ', seu cadastro de anfitrião foi aprovado. O financeiro de ingressos já está liberado.');
    } elseif ($action === 'recusar') {
        $pdo->prepare("UPDATE gcv_anfitrioes SET status = 'rejected' WHERE id = ?")->execute([$id]);
        gcv_anfitriao_avisar($pdo, (string)$host['telefone'], $host['nome'] . ', seu cadastro de anfitrião não foi aprovado desta vez.');
    } else {
        json_response(false, null, 'Ação inválida', 422);
    }
    $hosts = $pdo->query('SELECT * FROM gcv_anfitrioes ORDER BY id DESC')->fetchAll() ?: [];
    $wa = $pdo->query('SELECT destino AS para, texto, created_at AS em FROM gcv_anfitriao_wa ORDER BY id DESC LIMIT 40')->fetchAll() ?: [];
    json_response(true, ['anfitrioes' => $hosts, 'whatsapp' => $wa]);
}

json_response(false, null, 'Método não permitido', 405);
