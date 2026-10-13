<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';

header('Content-Type: application/json; charset=utf-8');

$slug = trim((string)($_GET['slug'] ?? ''));
$vazio = ['pausa_ativa' => false, 'modo' => 'ocultar', 'mensagem' => '', 'sem_passeio' => false, 'guias_bloqueados' => []];
if ($slug === '') {
    echo json_encode(['ok' => true, 'data' => $vazio]);
    exit;
}

try {
    $pdo = db();
    $st = $pdo->prepare('SELECT tem_passeio, experiencia_json FROM gcv_attractions WHERE slug = ? LIMIT 1');
    $st->execute([$slug]);
    $row = $st->fetch();
} catch (Throwable $e) {
    echo json_encode(['ok' => true, 'data' => $vazio]);
    exit;
}

if (!$row) {
    echo json_encode(['ok' => true, 'data' => $vazio]);
    exit;
}

$venda = [];
if (!empty($row['experiencia_json'])) {
    $exp = json_decode((string)$row['experiencia_json'], true);
    if (is_array($exp) && isset($exp['venda']) && is_array($exp['venda'])) {
        $venda = $exp['venda'];
    }
}
$pausa = isset($venda['pausa']) && is_array($venda['pausa']) ? $venda['pausa'] : [];
$inicio = (string)($pausa['inicio'] ?? '');
$fim = (string)($pausa['fim'] ?? '');
$hoje = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
$ativa = preg_match('/^\d{4}-\d{2}-\d{2}$/', $inicio) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fim) && $hoje >= $inicio && $hoje <= $fim;

echo json_encode([
    'ok' => true,
    'data' => [
        'pausa_ativa' => $ativa,
        'modo' => (($pausa['modo'] ?? '') === 'aviso') ? 'aviso' : 'ocultar',
        'mensagem' => (string)($pausa['mensagem'] ?? ''),
        'sem_passeio' => (isset($row['tem_passeio']) && (int)$row['tem_passeio'] === 0) || !empty($venda['sem_passeio']),
        'guias_bloqueados' => isset($venda['guias_bloqueados']) && is_array($venda['guias_bloqueados']) ? $venda['guias_bloqueados'] : [],
    ],
]);
