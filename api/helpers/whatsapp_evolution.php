<?php
declare(strict_types=1);

require_once __DIR__ . '/purchase_notify.php';
require_once __DIR__ . '/whatsapp_guides.php';

function gcv_evolution_instance(): string
{
    return gcv_env_str('EVOLUTION_INSTANCE', 'gcv');
}

function gcv_evolution_base(): string
{
    return rtrim(gcv_env_str('EVOLUTION_API_URL', 'https://wa.guiachapadaveadeiros.com'), '/');
}

/**
 * @param array<string,mixed>|null $payload
 * @return array{ok:bool,http:int,data:mixed,raw:string}
 */
function gcv_evolution_http(string $method, string $path, ?array $payload = null, int $timeout = 25): array
{
    $out = ['ok' => false, 'http' => 0, 'data' => null, 'raw' => ''];
    $key = gcv_env_str('EVOLUTION_API_KEY');
    if ($key === '' || !function_exists('curl_init')) {
        return $out;
    }
    $url = gcv_evolution_base() . str_replace('{instance}', rawurlencode(gcv_evolution_instance()), $path);
    $ch = curl_init($url);
    if ($ch === false) {
        return $out;
    }
    $headers = ['apikey: ' . $key, 'Accept: application/json'];
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => max(8, $timeout),
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
    ];
    if ($payload !== null) {
        $headers[] = 'Content-Type: application/json';
        $opts[CURLOPT_POSTFIELDS] = json_encode($payload === [] ? new stdClass() : $payload, JSON_UNESCAPED_UNICODE);
    }
    $opts[CURLOPT_HTTPHEADER] = $headers;
    curl_setopt_array($ch, $opts);
    $body = curl_exec($ch);
    $http = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    $out['http'] = $http;
    $out['raw'] = is_string($body) ? $body : '';
    $decoded = json_decode($out['raw'], true);
    $out['data'] = $decoded;
    $out['ok'] = $http >= 200 && $http < 300 && $body !== false;
    if (!$out['ok']) {
        error_log(
            'evolution ' . $method . ' http=' . $http
            . ' curl=' . $err
            . ' path=' . $path
            . ' body=' . substr($out['raw'], 0, 220)
        );
    }
    return $out;
}

/** @return list<array<string,mixed>> */
function gcv_evolution_unwrap_list(mixed $data): array
{
    if (!is_array($data)) {
        return [];
    }
    foreach (['messages', 'chats', 'contacts', 'records', 'data'] as $key) {
        if (isset($data[$key]) && is_array($data[$key])) {
            $inner = $data[$key];
            if (isset($inner['records']) && is_array($inner['records'])) {
                return array_values($inner['records']);
            }
            if ($inner !== [] && array_is_list($inner)) {
                return $inner;
            }
            $nested = gcv_evolution_unwrap_list($inner);
            if ($nested) {
                return $nested;
            }
        }
    }
    if ($data !== [] && array_is_list($data)) {
        return $data;
    }
    return [];
}

/** @return list<string> */
function gcv_evolution_jids_for_phone(string $phone): array
{
    $out = [];
    foreach (gcv_whatsapp_number_candidates($phone) as $n) {
        $out[] = $n . '@s.whatsapp.net';
        $out[] = $n . '@c.us';
    }
    return array_values(array_unique($out));
}

/** @return list<string> */
function gcv_evolution_phones_from_jid(string $jid): array
{
    $jid = trim($jid);
    if ($jid === '' || str_contains($jid, '@g.us') || str_contains($jid, '@lid')) {
        return [];
    }
    $local = explode('@', $jid)[0] ?? '';
    $digits = preg_replace('/\D+/', '', $local) ?? '';
    if (strlen($digits) < 10 || strlen($digits) > 15) {
        return [];
    }
    return gcv_whatsapp_number_candidates($digits);
}

function gcv_evolution_chat_jid(array $chat): string
{
    foreach (['remoteJid', 'remoteJidAlt', 'id', 'jid'] as $key) {
        $v = trim((string)($chat[$key] ?? ''));
        if ($v !== '' && str_contains($v, '@')) {
            return $v;
        }
    }
    $nested = $chat['id'] ?? null;
    if (is_array($nested)) {
        foreach (['remoteJid', '_serialized', 'id'] as $key) {
            $v = trim((string)($nested[$key] ?? ''));
            if ($v !== '' && str_contains($v, '@')) {
                return $v;
            }
        }
    }
    return '';
}

/** @return array{text:string,type:string} */
function gcv_evolution_message_preview(mixed $message): array
{
    if (is_string($message) && trim($message) !== '') {
        return ['text' => trim($message), 'type' => 'text'];
    }
    if (!is_array($message)) {
        return ['text' => '', 'type' => 'unknown'];
    }
    if (isset($message['conversation']) && is_string($message['conversation'])) {
        return ['text' => trim($message['conversation']), 'type' => 'text'];
    }
    if (isset($message['extendedTextMessage']['text'])) {
        return ['text' => trim((string)$message['extendedTextMessage']['text']), 'type' => 'text'];
    }
    if (isset($message['imageMessage'])) {
        $cap = trim((string)($message['imageMessage']['caption'] ?? ''));
        return ['text' => $cap !== '' ? $cap : '[Imagem]', 'type' => 'image'];
    }
    if (isset($message['videoMessage'])) {
        $cap = trim((string)($message['videoMessage']['caption'] ?? ''));
        return ['text' => $cap !== '' ? $cap : '[Vídeo]', 'type' => 'video'];
    }
    if (isset($message['audioMessage']) || isset($message['pttMessage'])) {
        return ['text' => '[Áudio]', 'type' => 'audio'];
    }
    if (isset($message['documentMessage'])) {
        $name = trim((string)($message['documentMessage']['fileName'] ?? ''));
        return ['text' => $name !== '' ? $name : '[Documento]', 'type' => 'document'];
    }
    if (isset($message['stickerMessage'])) {
        return ['text' => '[Figurinha]', 'type' => 'sticker'];
    }
    if (isset($message['locationMessage']) || isset($message['liveLocationMessage'])) {
        return ['text' => '[Localização]', 'type' => 'location'];
    }
    if (isset($message['contactMessage']) || isset($message['contactsArrayMessage'])) {
        return ['text' => '[Contato]', 'type' => 'contact'];
    }
    if (isset($message['reactionMessage']['text'])) {
        return ['text' => 'Reação ' . trim((string)$message['reactionMessage']['text']), 'type' => 'reaction'];
    }
    $type = trim((string)($message['messageType'] ?? ''));
    if ($type !== '' && $type !== 'conversation') {
        return ['text' => '[' . $type . ']', 'type' => $type];
    }
    return ['text' => '', 'type' => 'unknown'];
}

function gcv_evolution_ts(mixed $value): int
{
    if (is_array($value)) {
        $value = $value['low'] ?? $value['seconds'] ?? 0;
    }
    $n = (int)$value;
    if ($n > 20000000000) {
        $n = (int)floor($n / 1000);
    }
    return $n > 0 ? $n : 0;
}

function gcv_evolution_when_label(int $ts): string
{
    if ($ts <= 0) {
        return '';
    }
    try {
        $dt = (new DateTime('@' . $ts))->setTimezone(new DateTimeZone('America/Sao_Paulo'));
        $today = (new DateTime('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
        return $dt->format('Y-m-d') === $today ? $dt->format('H:i') : $dt->format('d/m H:i');
    } catch (Throwable $e) {
        return '';
    }
}

/** @return list<array<string,mixed>> */
function gcv_evolution_find_chats(): array
{
    $tries = [
        ['POST', '/chat/findChats/{instance}', []],
        ['POST', '/chat/findChats/{instance}', ['where' => new stdClass()]],
        ['GET', '/chat/findChats/{instance}', null],
    ];
    foreach ($tries as [$method, $path, $payload]) {
        $res = gcv_evolution_http($method, $path, is_array($payload) ? $payload : null, 30);
        $list = gcv_evolution_unwrap_list($res['data']);
        if ($res['ok'] && $list) {
            return $list;
        }
        if ($res['ok'] && is_array($res['data']) && $list === []) {
            return [];
        }
    }
    return [];
}

/** @return list<array<string,mixed>> */
function gcv_evolution_find_messages(string $remoteJid, int $limit = 80): array
{
    $remoteJid = trim($remoteJid);
    if ($remoteJid === '') {
        return [];
    }
    $payloads = [
        ['where' => ['key' => ['remoteJid' => $remoteJid]], 'page' => 1, 'offset' => $limit],
        ['where' => ['key' => ['remoteJid' => $remoteJid]], 'limit' => $limit],
        ['where' => ['key' => ['remoteJid' => $remoteJid]]],
        ['remoteJid' => $remoteJid, 'limit' => $limit],
    ];
    foreach ($payloads as $payload) {
        $res = gcv_evolution_http('POST', '/chat/findMessages/{instance}', $payload, 25);
        $list = gcv_evolution_unwrap_list($res['data']);
        if ($res['ok'] && $list) {
            return $list;
        }
        if ($res['http'] >= 200 && $res['http'] < 300) {
            $legacy = gcv_evolution_http('POST', '/messages/findMessages/{instance}', $payload, 25);
            $list = gcv_evolution_unwrap_list($legacy['data']);
            if ($legacy['ok'] && $list) {
                return $list;
            }
            break;
        }
    }
    return [];
}

/** @return array{id:string,from_me:bool,text:string,type:string,at:int,at_label:string} */
function gcv_evolution_normalize_message(array $raw): array
{
    $key = is_array($raw['key'] ?? null) ? $raw['key'] : [];
    $id = trim((string)($key['id'] ?? $raw['id'] ?? $raw['_id'] ?? ''));
    $fromMe = !empty($key['fromMe']) || !empty($raw['fromMe']);
    $preview = gcv_evolution_message_preview($raw['message'] ?? $raw);
    if ($preview['text'] === '' && isset($raw['messageType'])) {
        $preview = gcv_evolution_message_preview($raw);
    }
    $ts = gcv_evolution_ts($raw['messageTimestamp'] ?? $raw['timestamp'] ?? $raw['updatedAt'] ?? 0);
    return [
        'id' => $id !== '' ? $id : ('m' . $ts . ($fromMe ? 'o' : 'i')),
        'from_me' => $fromMe,
        'text' => $preview['text'] !== '' ? $preview['text'] : '[' . ($preview['type'] ?: 'mensagem') . ']',
        'type' => $preview['type'],
        'at' => $ts,
        'at_label' => gcv_evolution_when_label($ts),
    ];
}

function gcv_evolution_chat_last(array $chat): array
{
    $last = $chat['lastMessage'] ?? $chat['last_message'] ?? null;
    $text = '';
    $fromMe = false;
    $ts = gcv_evolution_ts($chat['updatedAt'] ?? $chat['lastMsgTimestamp'] ?? $chat['conversationTimestamp'] ?? 0);
    if (is_array($last)) {
        $fromMe = !empty($last['key']['fromMe']) || !empty($last['fromMe']);
        $preview = gcv_evolution_message_preview($last['message'] ?? $last);
        $text = $preview['text'];
        $ts = gcv_evolution_ts($last['messageTimestamp'] ?? $last['timestamp'] ?? $ts);
    }
    if ($text === '' && isset($chat['lastMessage']['messageTimestamp'])) {
        $ts = gcv_evolution_ts($chat['lastMessage']['messageTimestamp']);
    }
    return [
        'text' => $text,
        'from_me' => $fromMe,
        'at' => $ts,
        'at_label' => gcv_evolution_when_label($ts),
        'unread' => (int)($chat['unreadCount'] ?? $chat['unread'] ?? 0),
    ];
}

/**
 * @param list<array<string,mixed>> $guides
 * @return array<int,array<string,mixed>>
 */
function gcv_evolution_index_chats_by_guide(array $guides): array
{
    $phoneToGuide = [];
    foreach ($guides as $g) {
        $uid = (int)$g['user_id'];
        foreach (gcv_whatsapp_number_candidates((string)($g['phone'] ?? '')) as $phone) {
            $phoneToGuide[$phone] = $uid;
        }
    }
    $byGuide = [];
    foreach (gcv_evolution_find_chats() as $chat) {
        $jid = gcv_evolution_chat_jid($chat);
        $phones = gcv_evolution_phones_from_jid($jid);
        $alt = trim((string)($chat['remoteJidAlt'] ?? ''));
        if ($alt !== '') {
            $phones = array_values(array_unique(array_merge($phones, gcv_evolution_phones_from_jid($alt))));
        }
        $uid = 0;
        foreach ($phones as $phone) {
            if (isset($phoneToGuide[$phone])) {
                $uid = (int)$phoneToGuide[$phone];
                break;
            }
        }
        if ($uid <= 0) {
            continue;
        }
        $meta = gcv_evolution_chat_last($chat);
        $prev = $byGuide[$uid] ?? null;
        if ($prev && (int)$prev['at'] >= (int)$meta['at']) {
            continue;
        }
        $byGuide[$uid] = array_merge($meta, ['remote_jid' => $jid]);
    }
    return $byGuide;
}

function gcv_evolution_chat_name(array $chat): string
{
    foreach (['name', 'pushName', 'notifyName', 'verifiedName', 'subject'] as $key) {
        $v = trim((string)($chat[$key] ?? ''));
        if ($v !== '') {
            return $v;
        }
    }
    $last = $chat['lastMessage'] ?? null;
    if (is_array($last)) {
        $v = trim((string)($last['pushName'] ?? $last['notifyName'] ?? ''));
        if ($v !== '') {
            return $v;
        }
    }
    return '';
}

function gcv_evolution_chat_photo(array $chat): string
{
    foreach (['profilePicUrl', 'profilePictureUrl', 'picture'] as $key) {
        $v = trim((string)($chat[$key] ?? ''));
        if ($v !== '' && str_starts_with($v, 'http')) {
            return $v;
        }
    }
    return '';
}

function gcv_evolution_is_broadcast_jid(string $jid): bool
{
    return $jid === ''
        || str_contains($jid, 'status@broadcast')
        || str_contains($jid, '@broadcast');
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_evolution_thread(?string $remoteJid, ?string $phone = null): array
{
    $jids = [];
    if ($remoteJid) {
        $jids[] = trim($remoteJid);
    }
    if ($phone) {
        $jids = array_merge($jids, gcv_evolution_jids_for_phone($phone));
    }
    $jids = array_values(array_unique(array_filter($jids)));
    $byId = [];
    foreach ($jids as $jid) {
        foreach (gcv_evolution_find_messages($jid, 80) as $raw) {
            if (!is_array($raw)) {
                continue;
            }
            $msg = gcv_evolution_normalize_message($raw);
            $byId[$msg['id']] = $msg;
        }
        if ($byId) {
            break;
        }
    }
    $list = array_values($byId);
    usort($list, static fn($a, $b) => ((int)$a['at'] <=> (int)$b['at']) ?: strcmp((string)$a['id'], (string)$b['id']));
    if (count($list) > 80) {
        $list = array_slice($list, -80);
    }
    return $list;
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_evolution_thread_for_guide(array $guide, ?string $remoteJid = null): array
{
    return gcv_evolution_thread($remoteJid, (string)($guide['phone'] ?? ''));
}

function gcv_evolution_send_to_target(string $target, string $text): bool
{
    $target = trim($target);
    $text = trim($text);
    if ($target === '' || $text === '' || !gcv_whatsapp_hps_configured()) {
        return false;
    }
    if (str_contains($target, '@')) {
        return gcv_whatsapp_send_evolution($target, $text, [
            'delay' => 1200,
            'presence' => 'composing',
        ]);
    }
    return gcv_whatsapp_send_broadcast($target, $text);
}

/**
 * @return array{exists:bool,phone:string,phone_display:string,jid:string,name:string}
 */
function gcv_evolution_check_number(string $phone): array
{
    $phone = gcv_whatsapp_normalize_phone($phone);
    $out = [
        'exists' => false,
        'checked' => false,
        'phone' => $phone,
        'phone_display' => $phone !== '' ? gcv_broadcast_format_phone($phone) : '',
        'jid' => '',
        'name' => '',
    ];
    if ($phone === '') {
        return $out;
    }
    $candidates = gcv_whatsapp_number_candidates($phone);
    $res = gcv_evolution_http('POST', '/chat/whatsappNumbers/{instance}', [
        'numbers' => $candidates,
    ], 20);
    $rows = gcv_evolution_unwrap_list($res['data']);
    if ($rows === [] && is_array($res['data']) && isset($res['data']['jid'])) {
        $rows = [$res['data']];
    }
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $exists = !empty($row['exists']) || !empty($row['numberExists']) || !empty($row['isInWhatsapp']);
        $jid = trim((string)($row['jid'] ?? ''));
        $num = preg_replace('/\D+/', '', (string)($row['number'] ?? $row['wid'] ?? '')) ?? '';
        if ($jid !== '' && !str_contains($jid, '@')) {
            $jid .= '@s.whatsapp.net';
        }
        if ($exists || $jid !== '') {
            $resolved = $num !== '' ? gcv_whatsapp_normalize_phone($num) : $phone;
            return [
                'exists' => $exists || $jid !== '',
                'checked' => true,
                'phone' => $resolved,
                'phone_display' => gcv_broadcast_format_phone($resolved),
                'jid' => $jid !== '' ? $jid : ($resolved . '@s.whatsapp.net'),
                'name' => trim((string)($row['name'] ?? $row['notify'] ?? '')),
            ];
        }
    }
    if ($res['ok'] && $rows) {
        $out['checked'] = true;
    }
    $out['jid'] = $phone . '@s.whatsapp.net';
    return $out;
}

/**
 * Inbox completo do WhatsApp da agência (todos os chats) + guias ainda sem conversa.
 *
 * @param list<array<string,mixed>> $guides
 * @return list<array<string,mixed>>
 */
function gcv_evolution_inbox(array $guides): array
{
    $phoneToGuide = [];
    foreach ($guides as $g) {
        foreach (gcv_whatsapp_number_candidates((string)($g['phone'] ?? '')) as $phone) {
            $phoneToGuide[$phone] = $g;
        }
    }

    $items = [];
    $seenJids = [];
    $seenGuide = [];

    foreach (gcv_evolution_find_chats() as $chat) {
        $jid = gcv_evolution_chat_jid($chat);
        if (gcv_evolution_is_broadcast_jid($jid) || isset($seenJids[$jid])) {
            continue;
        }
        $seenJids[$jid] = true;
        $isGroup = str_contains($jid, '@g.us');
        $phones = gcv_evolution_phones_from_jid($jid);
        $alt = trim((string)($chat['remoteJidAlt'] ?? ''));
        if ($alt !== '') {
            $phones = array_values(array_unique(array_merge($phones, gcv_evolution_phones_from_jid($alt))));
        }
        $guide = null;
        foreach ($phones as $phone) {
            if (isset($phoneToGuide[$phone])) {
                $guide = $phoneToGuide[$phone];
                break;
            }
        }
        $meta = gcv_evolution_chat_last($chat);
        $phone = $guide ? (string)$guide['phone'] : (string)($phones[0] ?? '');
        $name = $guide ? (string)$guide['name'] : gcv_evolution_chat_name($chat);
        if ($name === '') {
            $name = $phone !== '' ? gcv_broadcast_format_phone($phone) : ($isGroup ? 'Grupo' : 'Conversa');
        }
        if ($guide) {
            $seenGuide[(int)$guide['user_id']] = true;
        }
        $items[] = [
            'user_id' => $guide ? (int)$guide['user_id'] : 0,
            'kind' => $isGroup ? 'group' : ($guide ? 'guide' : 'contact'),
            'name' => $name,
            'phone' => $phone,
            'phone_display' => $phone !== '' ? gcv_broadcast_format_phone($phone) : '',
            'photo_url' => $guide ? (string)($guide['photo_url'] ?? '') : gcv_evolution_chat_photo($chat),
            'status' => $guide ? (string)($guide['status'] ?? '') : '',
            'status_label' => $guide ? (string)($guide['status_label'] ?? '') : '',
            'can_send' => true,
            'has_chat' => true,
            'remote_jid' => $jid,
            'last_text' => (string)($meta['text'] ?? ''),
            'last_from_me' => !empty($meta['from_me']),
            'last_at' => (int)($meta['at'] ?? 0),
            'last_at_label' => (string)($meta['at_label'] ?? ''),
            'unread' => (int)($meta['unread'] ?? 0),
        ];
    }

    foreach ($guides as $g) {
        $uid = (int)$g['user_id'];
        if ($uid <= 0 || isset($seenGuide[$uid])) {
            continue;
        }
        $items[] = [
            'user_id' => $uid,
            'kind' => 'guide',
            'name' => (string)$g['name'],
            'phone' => (string)$g['phone'],
            'phone_display' => (string)$g['phone_display'],
            'photo_url' => (string)$g['photo_url'],
            'status' => (string)$g['status'],
            'status_label' => (string)$g['status_label'],
            'can_send' => !empty($g['can_send']),
            'has_chat' => false,
            'remote_jid' => '',
            'last_text' => '',
            'last_from_me' => false,
            'last_at' => 0,
            'last_at_label' => '',
            'unread' => 0,
        ];
    }

    usort($items, static function ($a, $b) {
        $ha = !empty($a['has_chat']) ? 0 : 1;
        $hb = !empty($b['has_chat']) ? 0 : 1;
        if ($ha !== $hb) {
            return $ha <=> $hb;
        }
        if ((int)$a['last_at'] !== (int)$b['last_at']) {
            return (int)$b['last_at'] <=> (int)$a['last_at'];
        }
        return strcasecmp((string)$a['name'], (string)$b['name']);
    });
    return $items;
}
