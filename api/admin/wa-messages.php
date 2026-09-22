<?php
declare(strict_types=1);

/**
 * Inbox WhatsApp Business da agência (Evolution / HPS).
 * GET                      → conversas (todos os chats + guias)
 * GET ?guide_user_id=      → thread do guia
 * GET ?remote_jid= / phone → thread de qualquer número
 * GET ?check_phone=        → valida se o número existe no WhatsApp
 * POST                     → envia 1 a 1 (guia, telefone ou jid)
 */

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/rate_limiter.php';
require_once __DIR__ . '/../helpers/whatsapp_guides.php';
require_once __DIR__ . '/../helpers/whatsapp_evolution.php';

header('Content-Type: application/json; charset=utf-8');

$admin = require_admin();

function gcv_wa_sender_payload(): array
{
    $sender = gcv_whatsapp_hps_sender();
    return [
        'phone' => $sender,
        'phone_display' => gcv_broadcast_format_phone($sender),
        'label' => 'WhatsApp Business da agência',
        'ready' => gcv_whatsapp_hps_configured(),
    ];
}

function gcv_wa_contact_from_guide(array $guide, string $remoteJid = ''): array
{
    return [
        'user_id' => (int)$guide['user_id'],
        'kind' => 'guide',
        'name' => (string)$guide['name'],
        'phone' => (string)$guide['phone'],
        'phone_display' => (string)$guide['phone_display'],
        'photo_url' => (string)$guide['photo_url'],
        'can_send' => !empty($guide['can_send']),
        'remote_jid' => $remoteJid,
    ];
}

function gcv_wa_contact_from_target(string $phone, string $remoteJid, string $name = ''): array
{
    $isGroup = str_contains($remoteJid, '@g.us');
    $display = $phone !== '' ? gcv_broadcast_format_phone($phone) : '';
    if ($name === '') {
        $name = $display !== '' ? $display : ($isGroup ? 'Grupo' : 'Conversa');
    }
    return [
        'user_id' => 0,
        'kind' => $isGroup ? 'group' : 'contact',
        'name' => $name,
        'phone' => $phone,
        'phone_display' => $display,
        'photo_url' => '',
        'can_send' => true,
        'remote_jid' => $remoteJid,
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!gcv_whatsapp_hps_configured()) {
        json_response(false, null, 'WhatsApp do servidor HPS não está configurado.', 503);
    }
    $base = ['sender' => gcv_wa_sender_payload()];

    $checkPhone = trim((string)($_GET['check_phone'] ?? ''));
    if ($checkPhone !== '') {
        $info = gcv_evolution_check_number($checkPhone);
        if ($info['phone'] !== '' && $info['phone'] === gcv_whatsapp_hps_sender()) {
            json_response(false, $base + $info, 'Esse é o número da agência.', 422);
        }
        json_response(true, $base + $info);
    }

    $guideUserId = (int)($_GET['guide_user_id'] ?? 0);
    $remoteJid = trim((string)($_GET['remote_jid'] ?? ''));
    $phone = gcv_whatsapp_normalize_phone((string)($_GET['phone'] ?? ''));

    if ($guideUserId <= 0 && $remoteJid === '' && $phone === '') {
        json_response(true, $base + ['conversations' => gcv_evolution_inbox(gcv_broadcast_guides())]);
    }

    $guide = $guideUserId > 0 ? gcv_broadcast_find_guide($guideUserId) : null;
    if ($guideUserId > 0 && !$guide) {
        json_response(false, null, 'Guia não encontrado.', 404);
    }

    if ($guide) {
        $messages = gcv_evolution_thread_for_guide($guide, $remoteJid !== '' ? $remoteJid : null);
        $contact = gcv_wa_contact_from_guide($guide, $remoteJid);
    } else {
        $messages = gcv_evolution_thread($remoteJid !== '' ? $remoteJid : null, $phone !== '' ? $phone : null);
        $contact = gcv_wa_contact_from_target($phone, $remoteJid);
    }

    json_response(true, $base + [
        'guide' => $contact,
        'contact' => $contact,
        'messages' => $messages,
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_rate_limit('admin_wa_reply', 40, 15);
    $data = body_json();
    $guideUserId = (int)($data['guide_user_id'] ?? 0);
    $phone = gcv_whatsapp_normalize_phone((string)($data['phone'] ?? ''));
    $remoteJid = trim((string)($data['remote_jid'] ?? ''));
    $message = trim((string)($data['message'] ?? ''));

    if ($message === '') {
        json_response(false, null, 'Escreva a mensagem.', 422);
    }
    if (mb_strlen($message) > 4000) {
        json_response(false, null, 'A mensagem pode ter no máximo 4000 caracteres.', 422);
    }
    if (!gcv_whatsapp_hps_configured()) {
        json_response(false, null, 'WhatsApp do servidor HPS não está configurado.', 503);
    }

    $sender = gcv_whatsapp_hps_sender();
    $contact = null;
    $ok = false;

    if ($guideUserId > 0) {
        $guide = gcv_broadcast_find_guide($guideUserId);
        if (!$guide) {
            json_response(false, null, 'Guia não encontrado.', 404);
        }
        if (empty($guide['can_send'])) {
            json_response(false, null, 'Este guia não tem WhatsApp para envio.', 422);
        }
        $contact = gcv_wa_contact_from_guide($guide, $remoteJid);
        $ok = gcv_whatsapp_send_broadcast((string)$guide['phone'], $message);
    } elseif ($phone !== '') {
        if ($phone === $sender) {
            json_response(false, null, 'Não é possível enviar para o próprio número da agência.', 422);
        }
        $contact = gcv_wa_contact_from_target($phone, $remoteJid !== '' ? $remoteJid : ($phone . '@s.whatsapp.net'));
        $ok = gcv_whatsapp_send_broadcast($phone, $message);
    } elseif ($remoteJid !== '') {
        $fromJid = gcv_evolution_phones_from_jid($remoteJid);
        $resolved = $fromJid[0] ?? '';
        if ($resolved !== '' && $resolved === $sender) {
            json_response(false, null, 'Não é possível enviar para o próprio número da agência.', 422);
        }
        $contact = gcv_wa_contact_from_target($resolved, $remoteJid);
        $ok = gcv_evolution_send_to_target($remoteJid, $message);
    } else {
        json_response(false, null, 'Informe o destinatário.', 422);
    }

    if (!$ok) {
        json_response(false, null, 'Não foi possível enviar no WhatsApp. Confira se o número existe.', 502);
    }

    json_response(true, [
        'sent' => true,
        'contact' => $contact,
        'message' => [
            'id' => 'local-' . time(),
            'from_me' => true,
            'text' => $message,
            'type' => 'text',
            'at' => time(),
            'at_label' => gcv_evolution_when_label(time()),
        ],
    ]);
}

json_response(false, null, 'Método não permitido', 405);
