<?php

declare(strict_types=1);

/**
 * Reservas para o guia confirmar (cobrança do cartão só sai com quórum + confirmação do guia).
 *
 * GET  ?scope=mine|all   → próximos passeios ainda não confirmados (all = admin, todos os guias)
 * POST { trip_id }        → confirma (guia dono do passeio, ou admin em nome dele)
 */

require_once __DIR__ . '/../helpers/mailer.php';
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/payments/authorization.php';

header('Content-Type: application/json; charset=utf-8');
$user = require_auth();
$roles = $user['roles'] ?? gcv_user_roles((int) $user['id']);
$isAdmin = in_array('admin', $roles, true);
$isGuide = in_array('guide', $roles, true);
if (!$isAdmin && !$isGuide) {
    json_response(false, null, 'Acesso negado', 403);
}
gcv_auth_ensure_schema();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $all = $isAdmin && ($_GET['scope'] ?? '') === 'all';
    $sql = "SELECT t.id, t.reservation_id, t.title, t.starts_at, t.people, t.payment_kind, t.decision,
                   t.guide_confirmed_at, t.excursion_id, t.guide_user_id, u.name AS guide_name,
                   s.tourist_name, s.tourist_phone
            FROM gcv_booking_trips t
            LEFT JOIN gcv_users u ON u.id = t.guide_user_id
            LEFT JOIN gcv_sales s ON s.reservation_id = t.reservation_id AND s.deleted_at IS NULL
            WHERE t.decision IN ('UNDECIDED','CONFIRMED') AND (t.starts_at IS NULL OR t.starts_at > NOW())"
        . ($all ? '' : ' AND t.guide_user_id = ?')
        . ' ORDER BY t.guide_confirmed_at IS NOT NULL, t.starts_at ASC LIMIT 200';
    $st = db()->prepare($sql);
    $st->execute($all ? [] : [(int) $user['id']]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    // Situação do quórum de cada passeio
    require_once __DIR__ . '/../helpers/excursion_status.php';
    $cache = [];
    foreach ($rows as &$r) {
        $eid = (int) ($r['excursion_id'] ?? 0);
        if ($eid > 0 && !array_key_exists($eid, $cache)) {
            $q = db()->prepare('SELECT * FROM gcv_excursions WHERE id = ? LIMIT 1');
            $q->execute([$eid]);
            $e = $q->fetch(PDO::FETCH_ASSOC);
            $cache[$eid] = $e ? gcv_resolve_excursion_lifecycle($e) : null;
        }
        $r['lifecycle'] = $eid > 0 ? $cache[$eid] : null;
        if (!$all && empty($r['guide_confirmed_at'])) {
            unset($r['tourist_name'], $r['tourist_phone']);
        }
    }
    unset($r);
    json_response(true, ['rows' => $rows, 'is_admin' => $isAdmin]);
}

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input') ?: '', true) ?: [];
    $excursionId = (int) ($body['excursion_id'] ?? 0);
    if ($excursionId > 0) {
        $action = (string) ($body['action'] ?? 'confirm');
        $out = $action === 'decline'
            ? gcv_auth_guide_decline_excursion($excursionId, $user, $isAdmin)
            : gcv_auth_guide_confirm_excursion($excursionId, $user, $isAdmin);
        if (empty($out['ok'])) {
            json_response(false, null, (string) ($out['error'] ?? 'Erro'), 400);
        }
        json_response(true, $out);
    }
    $tripId = (int) ($body['trip_id'] ?? 0);
    if ($tripId <= 0) {
        json_response(false, null, 'trip_id obrigatório', 422);
    }
    $out = gcv_auth_guide_confirm($tripId, $user, $isAdmin);
    if (empty($out['ok'])) {
        json_response(false, null, (string) ($out['error'] ?? 'Erro'), 400);
    }
    json_response(true, $out);
}

json_response(false, null, 'Method not allowed', 405);
