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

function gcv_broadcast_ini_bytes(string $val): int
{
    $val = trim($val);
    if ($val === '' || $val === '-1') {
        return PHP_INT_MAX;
    }
    $n = (float)$val;
    $unit = strtolower(substr($val, -1));
    $mul = 1;
    if ($unit === 'g') {
        $mul = 1073741824;
    } elseif ($unit === 'm') {
        $mul = 1048576;
    } elseif ($unit === 'k') {
        $mul = 1024;
    }
    return (int)round($n * $mul);
}

/** Teto seguro para segurar o arquivo e o base64 na memória. */
function gcv_broadcast_server_file_cap(): int
{
    $upload = gcv_broadcast_ini_bytes((string)ini_get('upload_max_filesize'));
    $post = gcv_broadcast_ini_bytes((string)ini_get('post_max_size'));
    $postRoom = $post > 262144 ? $post - 262144 : $post;
    $mem = gcv_broadcast_ini_bytes((string)ini_get('memory_limit'));
    $memRoom = $mem === PHP_INT_MAX ? PHP_INT_MAX : (int)max(1048576, $mem / 4);
    return (int)min($upload, $postRoom, $memRoom);
}

/**
 * Limites do WhatsApp (Web / Evolution): imagem, vídeo e áudio 16 MB; documento 100 MB.
 * A legenda da mídia aceita 1024 caracteres.
 *
 * @return array{image:int,video:int,audio:int,document:int,whatsapp:array<string,int>,server_capped:bool}
 */
function gcv_broadcast_media_limits(): array
{
    $whatsapp = [
        'image' => 16 * 1024 * 1024,
        'video' => 16 * 1024 * 1024,
        'audio' => 16 * 1024 * 1024,
        'document' => 100 * 1024 * 1024,
    ];
    $server = gcv_broadcast_server_file_cap();
    $effective = [];
    $capped = false;
    foreach ($whatsapp as $kind => $max) {
        $effective[$kind] = (int)min($max, $server);
        if ($effective[$kind] < $max) {
            $capped = true;
        }
    }
    return [
        'image' => $effective['image'],
        'video' => $effective['video'],
        'audio' => $effective['audio'],
        'document' => $effective['document'],
        'whatsapp' => $whatsapp,
        'server_capped' => $capped,
    ];
}

/** @return array<string,array{kind:string,mime:string}> */
function gcv_broadcast_allowed_ext(): array
{
    return [
        'jpg' => ['kind' => 'image', 'mime' => 'image/jpeg'],
        'jpeg' => ['kind' => 'image', 'mime' => 'image/jpeg'],
        'png' => ['kind' => 'image', 'mime' => 'image/png'],
        'webp' => ['kind' => 'image', 'mime' => 'image/webp'],
        'gif' => ['kind' => 'image', 'mime' => 'image/gif'],
        'mp4' => ['kind' => 'video', 'mime' => 'video/mp4'],
        '3gp' => ['kind' => 'video', 'mime' => 'video/3gpp'],
        'mp3' => ['kind' => 'audio', 'mime' => 'audio/mpeg'],
        'ogg' => ['kind' => 'audio', 'mime' => 'audio/ogg'],
        'm4a' => ['kind' => 'audio', 'mime' => 'audio/mp4'],
        'aac' => ['kind' => 'audio', 'mime' => 'audio/aac'],
        'pdf' => ['kind' => 'document', 'mime' => 'application/pdf'],
        'doc' => ['kind' => 'document', 'mime' => 'application/msword'],
        'docx' => ['kind' => 'document', 'mime' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        'xls' => ['kind' => 'document', 'mime' => 'application/vnd.ms-excel'],
        'xlsx' => ['kind' => 'document', 'mime' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        'ppt' => ['kind' => 'document', 'mime' => 'application/vnd.ms-powerpoint'],
        'pptx' => ['kind' => 'document', 'mime' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
        'txt' => ['kind' => 'document', 'mime' => 'text/plain'],
        'csv' => ['kind' => 'document', 'mime' => 'text/csv'],
        'zip' => ['kind' => 'document', 'mime' => 'application/zip'],
    ];
}

function gcv_broadcast_mime_matches(string $ext, string $detected): bool
{
    $detected = strtolower(trim(explode(';', $detected)[0]));
    $ok = [
        'jpg' => ['image/jpeg', 'image/jpg', 'image/pjpeg'],
        'jpeg' => ['image/jpeg', 'image/jpg', 'image/pjpeg'],
        'png' => ['image/png'],
        'webp' => ['image/webp', 'image/x-webp'],
        'gif' => ['image/gif'],
        'mp4' => ['video/mp4'],
        '3gp' => ['video/3gpp', 'video/3gp'],
        'mp3' => ['audio/mpeg', 'audio/mp3'],
        'ogg' => ['audio/ogg', 'application/ogg', 'audio/opus'],
        'm4a' => ['audio/mp4', 'audio/x-m4a', 'audio/m4a', 'video/mp4'],
        'aac' => ['audio/aac', 'audio/x-aac'],
        'pdf' => ['application/pdf'],
        'doc' => ['application/msword', 'application/vnd.ms-office', 'application/octet-stream'],
        'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'],
        'xls' => ['application/vnd.ms-excel', 'application/vnd.ms-office', 'application/octet-stream'],
        'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', 'application/octet-stream'],
        'ppt' => ['application/vnd.ms-powerpoint', 'application/vnd.ms-office', 'application/octet-stream'],
        'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip', 'application/octet-stream'],
        'txt' => ['text/plain', 'application/octet-stream'],
        'csv' => ['text/plain', 'text/csv', 'application/csv', 'application/vnd.ms-excel', 'application/octet-stream'],
        'zip' => ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
    ];
    return in_array($detected, $ok[$ext] ?? [], true);
}

function gcv_broadcast_mb_label(int $bytes): string
{
    $mb = $bytes / 1048576;
    if ($mb >= 10) {
        return (string)(int)round($mb) . ' MB';
    }
    $text = number_format($mb, 1, ',', '');
    return rtrim(rtrim($text, '0'), ',') . ' MB';
}

/**
 * @param array<string,mixed> $file
 * @return array{ok:bool,error:string,kind:string,mime:string,name:string,b64:string}
 */
function gcv_broadcast_read_upload(array $file): array
{
    $empty = ['ok' => false, 'error' => '', 'kind' => '', 'mime' => '', 'name' => '', 'b64' => ''];
    if ($file === [] || !array_key_exists('error', $file)) {
        return $empty;
    }
    $err = (int)$file['error'];
    if ($err === UPLOAD_ERR_NO_FILE) {
        return $empty;
    }
    $limits = gcv_broadcast_media_limits();
    if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) {
        $empty['error'] = 'O anexo passa do que este servidor consegue receber (' . gcv_broadcast_mb_label(gcv_broadcast_server_file_cap()) . ').';
        return $empty;
    }
    if ($err !== UPLOAD_ERR_OK) {
        $empty['error'] = 'Não foi possível ler o anexo. Tente de novo.';
        return $empty;
    }
    $tmp = (string)($file['tmp_name'] ?? '');
    $original = (string)($file['name'] ?? '');
    $size = (int)($file['size'] ?? 0);
    if ($tmp === '' || !is_uploaded_file($tmp)) {
        $empty['error'] = 'Anexo inválido.';
        return $empty;
    }
    $ext = strtolower(pathinfo($original, PATHINFO_EXTENSION));
    $spec = gcv_broadcast_allowed_ext()[$ext] ?? null;
    if (!$spec) {
        $empty['error'] = 'Tipo não aceito pelo WhatsApp. Use JPG, PNG, WEBP, GIF, MP4, áudio, PDF, Office, TXT, CSV ou ZIP.';
        return $empty;
    }
    $max = (int)($limits[$spec['kind']] ?? 0);
    if ($size <= 0) {
        $empty['error'] = 'O arquivo está vazio.';
        return $empty;
    }
    if ($size > $max) {
        $wa = (int)($limits['whatsapp'][$spec['kind']] ?? $max);
        $label = $spec['kind'] === 'document' ? 'documento' : ($spec['kind'] === 'image' ? 'imagem' : $spec['kind']);
        $artigo = $spec['kind'] === 'image' ? 'Essa' : 'Esse';
        $empty['error'] = $artigo . ' ' . $label . ' passa de ' . gcv_broadcast_mb_label($max) . '.';
        if ($max < $wa) {
            $empty['error'] .= ' O WhatsApp aceita até ' . gcv_broadcast_mb_label($wa) . '; aqui o envio fica em ' . gcv_broadcast_mb_label($max) . '.';
        } else {
            $empty['error'] .= ' Esse é o limite do WhatsApp.';
        }
        return $empty;
    }
    $detected = '';
    if (function_exists('finfo_open')) {
        $fi = finfo_open(FILEINFO_MIME_TYPE);
        if ($fi) {
            $detected = (string)finfo_file($fi, $tmp);
            finfo_close($fi);
        }
    } elseif (function_exists('mime_content_type')) {
        $detected = (string)mime_content_type($tmp);
    }
    if ($detected === '' || !gcv_broadcast_mime_matches($ext, $detected)) {
        $empty['error'] = 'O conteúdo do arquivo não confere com a extensão.';
        return $empty;
    }
    $binary = file_get_contents($tmp);
    if ($binary === false || $binary === '') {
        $empty['error'] = 'Não foi possível ler o anexo.';
        return $empty;
    }
    $base = pathinfo($original, PATHINFO_FILENAME);
    $base = preg_replace('/[^\p{L}\p{N}._ -]+/u', '', $base) ?? '';
    $base = trim((string)$base, ". \t\n\r\0\x0B");
    if ($base === '') {
        $base = 'anexo';
    }
    $base = mb_substr($base, 0, 80);
    $empty['ok'] = true;
    $empty['kind'] = $spec['kind'];
    $empty['mime'] = $spec['mime'];
    $empty['name'] = $base . '.' . $ext;
    $empty['b64'] = base64_encode($binary);
    return $empty;
}

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
        'media' => gcv_broadcast_media_limits(),
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    json_response(true, gcv_broadcast_payload());
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    check_rate_limit('admin_broadcast', 12, 15);

    $ctype = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
    $isMultipart = str_contains($ctype, 'multipart/form-data');
    if (
        $isMultipart
        && $_POST === []
        && $_FILES === []
        && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0
    ) {
        json_response(false, null, 'O anexo é grande demais para o servidor receber. Tente um arquivo menor.', 413);
    }

    if ($isMultipart) {
        $scope = strtolower(trim((string)($_POST['scope'] ?? '')));
        $message = trim((string)($_POST['message'] ?? ''));
        $guideUserId = (int)($_POST['guide_user_id'] ?? 0);
    } else {
        $data = body_json();
        $scope = strtolower(trim((string)($data['scope'] ?? '')));
        $message = trim((string)($data['message'] ?? ''));
        $guideUserId = (int)($data['guide_user_id'] ?? 0);
    }

    $upload = gcv_broadcast_read_upload($_FILES['file'] ?? []);
    if (!$upload['ok'] && $upload['error'] !== '') {
        json_response(false, null, $upload['error'], 422);
    }
    $hasMedia = $upload['ok'] && $upload['b64'] !== '';

    if (!in_array($scope, ['all', 'one'], true)) {
        json_response(false, null, 'Escolha enviar para todos ou para um guia.', 422);
    }
    if ($message === '' && !$hasMedia) {
        json_response(false, null, 'Escreva a mensagem ou anexe um arquivo.', 422);
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

    $caption = '';
    $textAfter = '';
    if ($hasMedia) {
        $kind = $upload['kind'];
        if ($message !== '' && $kind !== 'audio' && mb_strlen($message) <= 1024) {
            $caption = $message;
        } elseif ($message !== '') {
            $textAfter = $message;
        }
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

    $bytes = $hasMedia ? (int)(strlen($upload['b64']) * 3 / 4) : 0;
    $budget = 180 + ($hasMedia ? (int)ceil($bytes / 262144) * max(1, count($targets)) : 0);
    @set_time_limit(min(1200, max(180, $budget)));
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

        if ($hasMedia) {
            $ok = gcv_whatsapp_send_broadcast_media(
                $phone,
                $caption,
                $upload['b64'],
                $upload['mime'],
                $upload['name'],
                $upload['kind']
            );
            if ($ok && $textAfter !== '') {
                usleep(400000);
                $textOk = gcv_whatsapp_send_broadcast($phone, $textAfter);
                if (!$textOk) {
                    $item['status'] = 'partial';
                    $ok = false;
                }
            }
        } else {
            $ok = gcv_whatsapp_send_broadcast($phone, $message);
        }
        $item['ok'] = $ok;
        if ($item['status'] !== 'partial') {
            $item['status'] = $ok ? 'sent' : 'failed';
        }
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
        'attachment' => $hasMedia ? $upload['name'] : '',
        'sent' => $sent,
        'failed' => $failed,
        'skipped' => $skipped,
        'total' => count($results),
        'results' => $results,
    ]);
}

json_response(false, null, 'Método não permitido', 405);
