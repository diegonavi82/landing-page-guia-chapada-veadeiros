<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/excursion_status.php';
require_once __DIR__ . '/../helpers/guide_substitution.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$user = require_role('guide');
if ((string)($user['status'] ?? '') !== 'active') {
    json_response(false, null, 'Só um guia ativo pode substituir uma saída', 403);
}
$me = (int)$user['id'];
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $excursionId = (int)($_GET['excursion_id'] ?? 0);
    if ($excursionId <= 0) {
        json_response(true, [
            'posicao' => gcv_substitution_fila_posicao($me),
            'fila' => gcv_substitution_queue(gcv_substitution_fila_do_guia($me)),
            'fila_kalunga' => gcv_substitution_fila_do_guia($me) === 'kalunga',
            'guia_especial' => gcv_substitution_guia_especial_id() === $me,
        ]);
    }
    $tour = gcv_substitution_load_excursion($excursionId);
    if (!$tour || (int)($tour['guide_user_id'] ?? 0) !== $me) {
        json_response(false, null, 'Passeio não encontrado', 404);
    }
    $pending = gcv_substitution_pending_out($excursionId, $me);
    json_response(true, [
        'excursion_id' => $excursionId,
        'title' => (string)($tour['attraction_title'] ?? 'Passeio'),
        'pending' => $pending ? [
            'id' => (int)$pending['id'],
            'to_id' => (int)$pending['to_user_id'],
            'to_nome' => (string)$pending['to_nome'],
        ] : null,
        'so_kalunga' => gcv_excursao_exige_guia_kalunga($tour),
        'guias' => gcv_substitution_available($tour, $me),
    ]);
}

if ($method !== 'POST') {
    json_response(false, null, 'Método não permitido', 405);
}

$data = body_json();
$action = strtolower(trim((string)($data['action'] ?? '')));

if ($action === 'offer') {
    $excursionId = (int)($data['excursion_id'] ?? 0);
    $toId = (int)($data['to_user_id'] ?? 0);
    $tour = gcv_substitution_load_excursion($excursionId);
    if (!$tour || (int)($tour['guide_user_id'] ?? 0) !== $me) {
        json_response(false, null, 'Este passeio não pode ser passado agora', 404);
    }
    if (gcv_substitution_pending_out($excursionId, $me)) {
        json_response(false, null, 'Já existe um pedido de substituição aguardando aceite', 409);
    }
    $alvo = null;
    foreach (gcv_substitution_available($tour, $me) as $g) {
        if ((int)$g['id'] === $toId) {
            $alvo = $g;
            break;
        }
    }
    if (!$alvo) {
        json_response(false, null, 'Este guia não está disponível para esta saída', 422);
    }
    gcv_substitution_ensure_schema();
    $ins = db()->prepare(
        "INSERT INTO gcv_guide_substitutions (excursion_id, from_user_id, to_user_id, status) VALUES (?, ?, ?, 'pending')"
    );
    $ins->execute([$excursionId, $me, $toId]);
    json_response(true, [
        'id' => (int)db()->lastInsertId(),
        'message' => 'Pedido enviado para ' . $alvo['nome'] . '. O passeio continua com você até o aceite.',
    ]);
}

if ($action === 'cancel') {
    $id = (int)($data['id'] ?? 0);
    gcv_substitution_ensure_schema();
    $st = db()->prepare("SELECT * FROM gcv_guide_substitutions WHERE id = ? AND from_user_id = ? AND status = 'pending' LIMIT 1");
    $st->execute([$id, $me]);
    $offer = $st->fetch(PDO::FETCH_ASSOC);
    if (!$offer) {
        json_response(false, null, 'Pedido não encontrado', 404);
    }
    db()->prepare("UPDATE gcv_guide_substitutions SET status = 'cancelled', decided_at = NOW() WHERE id = ?")->execute([$id]);
    json_response(true, ['message' => 'Pedido cancelado.']);
}

if ($action === 'accept' || $action === 'decline') {
    $id = (int)($data['id'] ?? 0);
    gcv_substitution_ensure_schema();
    $st = db()->prepare("SELECT * FROM gcv_guide_substitutions WHERE id = ? AND to_user_id = ? AND status = 'pending' LIMIT 1");
    $st->execute([$id, $me]);
    $offer = $st->fetch(PDO::FETCH_ASSOC);
    if (!$offer) {
        json_response(false, null, 'Este pedido não está aguardando você', 404);
    }
    if ($action === 'decline') {
        db()->prepare("UPDATE gcv_guide_substitutions SET status = 'declined', decided_at = NOW() WHERE id = ?")->execute([$id]);
        json_response(true, ['message' => 'Você recusou o passeio. Sua posição na fila não mudou.']);
    }
    $tour = gcv_substitution_load_excursion((int)$offer['excursion_id']);
    if (!$tour) {
        json_response(false, null, 'Passeio não encontrado', 404);
    }
    if (gcv_substitution_busy($me, $tour)) {
        json_response(false, null, 'Você já tem uma saída neste horário', 409);
    }
    $kalungaErro = gcv_guia_erro_kalunga_excursao($tour, $me);
    if ($kalungaErro !== null) {
        json_response(false, null, $kalungaErro, 422);
    }
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE gcv_excursions SET guide_user_id = ? WHERE id = ? AND guide_user_id = ?')
            ->execute([$me, (int)$offer['excursion_id'], (int)$offer['from_user_id']]);
        $pdo->prepare("UPDATE gcv_guide_substitutions SET status = 'accepted', decided_at = NOW() WHERE id = ?")->execute([$id]);
        $pdo->prepare("UPDATE gcv_guide_substitutions SET status = 'declined', decided_at = NOW() WHERE excursion_id = ? AND status = 'pending'")
            ->execute([(int)$offer['excursion_id']]);
        $posicao = gcv_substitution_move_to_end($me);
        try {
            require_once __DIR__ . '/../helpers/marketplace/sale_service.php';
            $tour['guide_user_id'] = $me;
            $guide = gcv_sale_resolve_guide($tour);
            $name = trim((string)($guide['name'] ?? ''));
            $pdo->prepare(
                "UPDATE gcv_sales
                 SET guide_user_id = ?, guide_name = ?, guide_cpf = ?, guide_cnpj = ?, updated_at = NOW()
                 WHERE excursion_id = ? AND deleted_at IS NULL
                   AND payout_status <> 'PAYOUT_PAID'
                   AND sale_status IN ('PENDING','AUTHORIZED','PAID')"
            )->execute([
                $me,
                $name !== '' ? $name : null,
                ($guide['cpf'] ?? '') !== '' ? $guide['cpf'] : null,
                ($guide['cnpj'] ?? '') !== '' ? $guide['cnpj'] : null,
                (int)$offer['excursion_id'],
            ]);
        } catch (Throwable $e) {
            error_log('substituir sales: ' . $e->getMessage());
        }
        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        json_response(false, null, 'Não foi possível concluir a substituição', 500);
    }
    require_once __DIR__ . '/../helpers/guide_queue_offer.php';
    gcv_guiagem_notify_clients_swapped((int)$offer['excursion_id'], (int)$offer['from_user_id']);
    $title = (string)($tour['attraction_title'] ?? 'o passeio');
    json_response(true, [
        'posicao' => $posicao,
        'message' => 'Você assumiu ' . $title . ' e foi para o fim da fila (' . $posicao . 'º).',
    ]);
}

json_response(false, null, 'Ação inválida', 422);
