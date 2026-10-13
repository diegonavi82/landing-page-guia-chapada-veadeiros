<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/anfitrioes.php';

header('Content-Type: application/json; charset=utf-8');

$user = current_user();
if (!$user) {
    json_response(false, null, 'Não autenticado', 401);
}
$pdo = db();
gcv_anfitriao_ensure($pdo);

$id = (int)($_GET['id'] ?? 0);
if (($user['role'] ?? '') === 'admin' && $id > 0) {
    $st = $pdo->prepare('SELECT * FROM gcv_anfitrioes WHERE id = ?');
    $st->execute([$id]);
} else {
    $st = $pdo->prepare('SELECT * FROM gcv_anfitrioes WHERE email = ?');
    $st->execute([strtolower((string)($user['email'] ?? ''))]);
}
$host = $st->fetch();
if (!$host) {
    json_response(false, null, 'Anfitrião não encontrado', 404);
}
if (($host['status'] ?? '') !== 'active') {
    json_response(true, ['aguardando' => true, 'anfitriao' => $host]);
}

json_response(true, [
    'aguardando' => false,
    'planejamento' => false,
    'anfitriao' => $host,
    'experiencia' => (string)($host['experiencia'] ?? ''),
    'plano' => (string)($host['plano'] ?? 'sem_custo'),
    'taxa_pct' => ($host['plano'] ?? '') === 'premium' ? 15 : (($host['plano'] ?? '') === 'padrao' ? 8 : 0),
    'preco_cents' => 0,
    'max_dia' => 0,
    'regras' => 'PIX liquida no dia seguinte. Cartão internacional em 14 dias. Cartão nacional em 30 dias. A taxa do plano incide sobre o valor depois do desconto. O extrato passa a listar cada venda quando o checkout de ingresso estiver ligado.',
    'resumo' => [
        'vendidos_mes' => 0,
        'capacidade_mes' => 0,
        'ocupacao_pct' => 0,
        'desconto_mes' => 0,
        'bruto_mes' => 0,
        'taxa_mes' => 0,
        'provisao' => 0,
        'liquidado' => 0,
        'nacional_provisao' => 0,
        'internacional_provisao' => 0,
        'nacional_liquidado' => 0,
        'internacional_liquidado' => 0,
        'pix_liquidado' => 0,
    ],
    'lotacao' => [],
    'previsao' => ['media_dia' => 0, 'proximos_7' => 0, 'capacidade_7' => 0, 'folga' => 0],
    'extrato' => [],
]);
