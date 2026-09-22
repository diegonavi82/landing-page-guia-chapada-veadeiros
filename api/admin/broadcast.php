<?php
declare(strict_types=1);

/**
 * Broadcast WhatsApp — envio 1 a 1 pelo número ligado no HPS (Evolution).
 * GET  → remetente + lista de guias
 * POST → envia para todos ou um guia específico
 */

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/rate_limiter.php';
require_once __DIR__ . '/../helpers/whatsapp_guides.php';

header('Content-Type: application/json; charset=utf-8');

$admin = require_admin();

function gcv_broadcast_payload(): array
{
    $sender = gcv_whatsapp_hps_sender();
    $guides = gcv_broadcast_guides();
    $ready = array_values(array_filter($guides, static fn($g) => !empty($g['can_send'])));
    return [
        'sender' => [
            'phone' => $sender,
            'phone_display' => gcv_broadcast_format_phone($sender),
            'label' => 'WhatsApp da agência (servidor HPS)',
            'ready' => gcv_whatsapp_hps_configured(),
        ],
        'guides' => $guides,
        'ready_count' => count($ready),
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    json_response(true, gcv_broadcast_payload());
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_rate_limit('admin_broadcast', 12, 15);

    $data = body_json();
    $scope = strtolower(trim((string)($data['scope'] ?? '')));
    $message = trim((string)($data['message'] ?? ''));
    $guideUserId = (int)($data['guide_user_id'] ?? 0);

    if (!in_array($scope, ['all', 'one'], true)) {
        json_response(false, null, 'Escolha enviar para todos ou para um guia.', 422);
    }
    if ($message === '') {
        json_response(false, null, 'Escreva a mensagem.', 422);
    }
    if (mb_strlen($message) > 4000) {
        json_response(false, null, 'A mensagem pode ter no máximo 4000 caracteres.', 422);
    }
    if ($scope === 'one' && $guideUserId <= 0) {
        json_response(false, null, 'Selecione o guia.', 422);
    }
    if (!gcv_whatsapp_hps_configured()) {
        json_response(false, null, 'WhatsApp do servidor HPS não está configurado.', 503);
    }

    $guides = gcv_broadcast_guides();
    $targets = [];
    if ($scope === 'one') {
        $one = gcv_broadcast_find_guide($guideUserId);
        if (!$one) {
            json_response(false, null, 'Guia não encontrado.', 404);
        }
        $targets[] = $one;
    } else {
        $targets = array_values(array_filter($guides, static fn($g) => !empty($g['can_send'])));
    }

    if (!$targets) {
        json_response(false, null, 'Nenhum guia com WhatsApp para enviar.', 422);
    }

    @set_time_limit(180);
    @ignore_user_abort(true);

    $results = [];
    $sent = 0;
    $failed = 0;
    $skipped = 0;
    $seenPhones = [];

    foreach ($targets as $i => $g) {
        $phone = (string)($g['phone'] ?? '');
        $item = [
            'user_id' => (int)$g['user_id'],
            'name' => (string)$g['name'],
            'phone_display' => (string)($g['phone_display'] ?? ''),
            'ok' => false,
            'status' => 'failed',
        ];

        if ($phone === '' || empty($g['can_send'])) {
            $item['status'] = !empty($g['is_sender']) ? 'self' : 'no_phone';
            $skipped++;
            $results[] = $item;
            continue;
        }
        if (isset($seenPhones[$phone])) {
            $item['status'] = 'duplicate';
            $skipped++;
            $results[] = $item;
            continue;
        }
        $seenPhones[$phone] = true;

        if ($i > 0) {
            usleep(700000);
        }

        $ok = gcv_whatsapp_send_broadcast($phone, $message);
        $item['ok'] = $ok;
        $item['status'] = $ok ? 'sent' : 'failed';
        if ($ok) {
            $sent++;
        } else {
            $failed++;
        }
        $results[] = $item;
    }

    json_response(true, [
        'scope' => $scope,
        'sender' => gcv_broadcast_format_phone(gcv_whatsapp_hps_sender()),
        'message' => $message,
        'sent' => $sent,
        'failed' => $failed,
        'skipped' => $skipped,
        'total' => count($results),
        'results' => $results,
    ]);
}

json_response(false, null, 'Método não permitido', 405);
