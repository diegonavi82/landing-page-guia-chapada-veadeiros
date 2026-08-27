<?php
declare(strict_types=1);

/**
 * Notificações operacionais (WhatsApp) + check-in / no-show 50%.
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/purchase_notify.php';
require_once __DIR__ . '/excursion_status.php';
require_once __DIR__ . '/marketplace_schema.php';
require_once __DIR__ . '/marketplace/constants.php';
require_once __DIR__ . '/review_service.php';

function gcv_ops_brl(int $cents): string
{
    return 'R$ ' . number_format(max(0, $cents) / 100, 2, ',', '.');
}

function gcv_ops_date_br(?string $iso): string
{
    $iso = (string)$iso;
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $iso, $m)) {
        return $m[3] . '/' . $m[2] . '/' . $m[1];
    }
    return $iso;
}

function gcv_ops_extract_code(string $raw): string
{
    if (preg_match('/GCV-[A-Z0-9]{6}/', strtoupper($raw), $m)) {
        return $m[0];
    }
    return '';
}

/** @return array{name:string,phone:string,email:string} */
function gcv_ops_guide_contact(int $guideUserId): array
{
    if ($guideUserId <= 0) {
        return ['name' => 'Guia', 'phone' => '', 'email' => ''];
    }
    $stmt = db()->prepare(
        'SELECT u.name, u.email, g.full_name, g.nickname, g.phone, g.phone_ddi
         FROM gcv_users u
         LEFT JOIN gcv_guides g ON g.user_id = u.id
         WHERE u.id = ? LIMIT 1'
    );
    $stmt->execute([$guideUserId]);
    $g = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $phone = '';
    if (function_exists('gcv_whatsapp_normalize_phone')) {
        $phone = gcv_whatsapp_normalize_phone((string)($g['phone'] ?? ''), (string)($g['phone_ddi'] ?? '55'));
    }
    return [
        'name' => (string)($g['full_name'] ?? $g['nickname'] ?? $g['name'] ?? 'Guia'),
        'phone' => $phone,
        'email' => strtolower(trim((string)($g['email'] ?? ''))),
    ];
}

function gcv_ops_wa_guide(int $guideUserId, string $text): bool
{
    $c = gcv_ops_guide_contact($guideUserId);
    if ($c['phone'] === '') {
        error_log('gcv_ops_wa_guide: guia ' . $guideUserId . ' sem WhatsApp cadastrado');
        return false;
    }
    if (!function_exists('gcv_whatsapp_send_text')) {
        error_log('gcv_ops_wa_guide: gcv_whatsapp_send_text ausente');
        return false;
    }
    $ok = gcv_whatsapp_send_text($c['phone'], $text);
    if (!$ok) {
        error_log('gcv_ops_wa_guide: falha ao enviar para ' . $c['phone'] . ' (guia ' . $guideUserId . ')');
    }
    return $ok;
}

function gcv_ops_sale_locale(array $sale): string
{
    $rid = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    if ($rid !== '') {
        try {
            if (!function_exists('gcv_pix_read_reservation')) {
                require_once __DIR__ . '/pix_reservation_store.php';
            }
            $res = gcv_pix_read_reservation($rid);
            $loc = strtolower(trim((string)($res['locale'] ?? 'pt')));
            if (in_array($loc, ['pt', 'en', 'es'], true)) {
                return $loc;
            }
        } catch (Throwable $e) {
            // fallback pt
        }
    }
    return 'pt';
}

function gcv_ops_client_phone(array $sale): string
{
    if (!function_exists('gcv_whatsapp_normalize_phone')) {
        return '';
    }
    $raw = (string)($sale['tourist_phone'] ?? '');
    $ddi = '55';
    if ($raw === '') {
        $rid = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
        if ($rid !== '') {
            try {
                if (!function_exists('gcv_pix_read_reservation')) {
                    require_once __DIR__ . '/pix_reservation_store.php';
                }
                $res = gcv_pix_read_reservation($rid);
                if (is_array($res)) {
                    $raw = (string)($res['phone'] ?? $res['telefone'] ?? $res['whatsapp'] ?? '');
                    $ddi = (string)($res['phone_ddi'] ?? $res['ddi'] ?? '55');
                }
            } catch (Throwable $e) {
                // fallback vazio
            }
        }
    }
    $norm = gcv_whatsapp_normalize_phone($raw, $ddi);
    $saleId = (int)($sale['id'] ?? 0);
    if ($norm !== '' && $saleId > 0 && trim((string)($sale['tourist_phone'] ?? '')) === '') {
        try {
            db()->prepare(
                'UPDATE gcv_sales SET tourist_phone = ? WHERE id = ? AND (tourist_phone IS NULL OR tourist_phone = \'\')'
            )->execute([$raw !== '' ? $raw : $norm, $saleId]);
        } catch (Throwable $e) {
            error_log('gcv_ops_client_phone persist: ' . $e->getMessage());
        }
    }
    return $norm;
}

function gcv_ops_confirm_url(string $code, string $loc): string
{
    $host = 'https://www.guiachapadaveadeiros.com';
    $q = '?id=' . rawurlencode($code);
    if ($loc === 'en') {
        return $host . '/en/confirmacao.html' . $q;
    }
    if ($loc === 'es') {
        return $host . '/es/confirmacao.html' . $q;
    }
    return $host . '/confirmacao.html' . $q;
}

function gcv_ops_google_review_url(): string
{
    return 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode('Guia Chapada Veadeiros Alto Paraíso de Goiás');
}

function gcv_ops_mark_sale_col(int $id, string $col): bool
{
    static $ok = [
        'notify_d12h_sent_at' => true,
        'notify_dayof_sent_at' => true,
        'notify_pix_paid_sent_at' => true,
        'notify_h2_sent_at' => true,
        'notify_review_sent_at' => true,
    ];
    if ($id <= 0 || empty($ok[$col])) {
        return false;
    }
    try {
        $st = db()->prepare("UPDATE gcv_sales SET `{$col}` = NOW() WHERE id = ? AND `{$col}` IS NULL");
        $st->execute([$id]);
        return $st->rowCount() > 0;
    } catch (Throwable $e) {
        return false;
    }
}

function gcv_ops_wa_client(array $sale, string $text): bool
{
    $phone = gcv_ops_client_phone($sale);
    if ($phone === '') {
        error_log('gcv_ops_wa_client: venda ' . (int)($sale['id'] ?? 0) . ' sem telefone');
        return false;
    }
    if (!function_exists('gcv_whatsapp_send_text')) {
        return false;
    }
    $ok = gcv_whatsapp_send_text($phone, $text);
    if (!$ok) {
        error_log('gcv_ops_wa_client: falha ao enviar para ' . $phone);
    }
    return $ok;
}

function gcv_ops_included_text(array $exc): string
{
    $yes = [];
    $no = [];
    $map = [
        'include_transport' => 'Transporte',
        'include_entry' => 'Ingresso',
        'include_lunch' => 'Almoço',
    ];
    foreach ($map as $col => $label) {
        $v = $exc[$col] ?? null;
        if ($v === null || $v === '') {
            continue;
        }
        if ((int)$v === 1 || $v === true || $v === '1') {
            $yes[] = $label;
        } else {
            $no[] = $label;
        }
    }
    $yes[] = 'Guia local';
    $out = 'Incluído: ' . implode(', ', $yes);
    if ($no) {
        $out .= "\nNão incluído: " . implode(', ', $no);
    }
    return $out;
}

function gcv_ops_load_excursion(int $id, bool $withDeleted = false): ?array
{
    if ($id <= 0) {
        return null;
    }
    $del = $withDeleted ? '' : ' AND e.deleted_at IS NULL';
    $stmt = db()->prepare(
        'SELECT e.*, a.title_pt AS attraction_title, c.name AS departure_city_name
         FROM gcv_excursions e
         LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
         LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
         WHERE e.id = ?' . $del . ' LIMIT 1'
    );
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function gcv_ops_starts_at(array $exc): ?DateTimeImmutable
{
    $date = (string)($exc['date_iso'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        return null;
    }
    $time = substr((string)($exc['departure_time'] ?? '08:00:00'), 0, 8);
    if (!preg_match('/^\d{2}:\d{2}/', $time)) {
        $time = '08:00:00';
    }
    if (strlen($time) === 5) {
        $time .= ':00';
    }
    try {
        return new DateTimeImmutable($date . ' ' . $time, new DateTimeZone('America/Sao_Paulo'));
    } catch (Throwable $e) {
        return null;
    }
}

function gcv_ops_qr_png(string $code): string
{
    $url = 'https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=8&data=' . rawurlencode($code);
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        if ($ch !== false) {
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => 12,
                CURLOPT_CONNECTTIMEOUT => 6,
            ]);
            $bin = curl_exec($ch);
            curl_close($ch);
            if (is_string($bin) && strlen($bin) > 80) {
                return $bin;
            }
        }
    }
    $bin = @file_get_contents($url);
    return is_string($bin) ? $bin : '';
}

function gcv_ops_voucher_png(array $sale, array $exc, string $code): string
{
    $qr = gcv_ops_qr_png($code);
    if ($qr === '' || !function_exists('imagecreatetruecolor')) {
        return $qr;
    }
    $qrImg = @imagecreatefromstring($qr);
    if ($qrImg === false) {
        return $qr;
    }
    $qrW = imagesx($qrImg);
    $qrH = imagesy($qrImg);
    $w = 720;
    $h = 280 + $qrH;
    $im = imagecreatetruecolor($w, $h);
    $white = imagecolorallocate($im, 255, 255, 255);
    $ink = imagecolorallocate($im, 15, 40, 55);
    $muted = imagecolorallocate($im, 80, 100, 110);
    imagefilledrectangle($im, 0, 0, $w, $h, $white);
    $lines = [
        'GUIA CHAPADA VEADEIROS',
        'Reserva ' . $code,
        trim((string)($sale['tourist_name'] ?? 'Cliente')),
        (string)($exc['attraction_title'] ?? 'Passeio'),
        gcv_ops_date_br((string)($exc['date_iso'] ?? '')) . '  ' . substr((string)($exc['departure_time'] ?? ''), 0, 5),
        gcv_ops_brl((int)($sale['sold_price_cents'] ?? 0)) . '  ·  ' . max(1, (int)($sale['spots'] ?? 1)) . ' pax',
        'Apresente este QR ao guia',
    ];
    $y = 28;
    foreach ($lines as $i => $line) {
        $latin = @iconv('UTF-8', 'ISO-8859-1//TRANSLIT', (string)$line);
        $line = is_string($latin) && $latin !== '' ? $latin : preg_replace('/[^\x20-\x7E]/', '', (string)$line);
        imagestring($im, $i === 0 ? 5 : 4, 28, $y, $line, $i === 0 ? $ink : $muted);
        $y += $i === 0 ? 28 : 22;
    }
    imagecopy($im, $qrImg, (int)(($w - $qrW) / 2), 210, 0, 0, $qrW, $qrH);
    ob_start();
    imagepng($im);
    $out = (string)ob_get_clean();
    imagedestroy($im);
    imagedestroy($qrImg);
    return $out !== '' ? $out : $qr;
}

function gcv_ops_notify_guide_approved(int $excursionId): void
{
    $exc = gcv_ops_load_excursion($excursionId);
    if (!$exc) {
        return;
    }
    $guideId = (int)($exc['guide_user_id'] ?? 0);
    if ($guideId <= 0) {
        error_log('gcv_ops_notify_guide_approved: excursão ' . $excursionId . ' sem guia');
        return;
    }
    $when = trim(gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    $text = "✅ Seu passeio foi APROVADO e já aparece no site.\n\n"
        . 'Passeio: ' . (string)($exc['attraction_title'] ?? 'Passeio') . "\n"
        . 'Quando: ' . $when . "\n"
        . 'Preço: ' . gcv_ops_brl((int)($exc['price_cents'] ?? 0)) . " por pessoa\n"
        . 'Embarque: ' . (string)($exc['departure_city_name'] ?? '') . "\n\n"
        . "Veja no site: https://www.guiachapadaveadeiros.com/";
    $ok = gcv_ops_wa_guide($guideId, $text);
    if (!$ok) {
        error_log('gcv_ops_notify_guide_approved: WhatsApp não enviado (excursão ' . $excursionId . ', guia ' . $guideId . ')');
        return;
    }
    if (!empty($exc['notify_approved_at'])) {
        return;
    }
    try {
        db()->prepare(
            'UPDATE gcv_excursions SET notify_approved_at = NOW() WHERE id = ? AND notify_approved_at IS NULL'
        )->execute([$excursionId]);
    } catch (Throwable $e) {
        error_log('notify_approved_at: ' . $e->getMessage());
    }
}

function gcv_ops_notify_guide_confirmed(int $excursionId): void
{
    $exc = gcv_ops_load_excursion($excursionId);
    if (!$exc) {
        return;
    }
    if (!empty($exc['notify_confirmed_at'])) {
        return;
    }
    try {
        db()->prepare('UPDATE gcv_excursions SET notify_confirmed_at = NOW() WHERE id = ? AND notify_confirmed_at IS NULL')
            ->execute([$excursionId]);
    } catch (Throwable $e) {
        return;
    }
    $guideId = (int)($exc['guide_user_id'] ?? 0);
    $booked = gcv_excursion_occupied_people($exc);
    $when = trim(gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    $text = "🎉 Passeio CONFIRMADO (quórum atingido)!\n\n"
        . 'Passeio: ' . (string)($exc['attraction_title'] ?? 'Passeio') . "\n"
        . 'Quando: ' . $when . "\n"
        . 'Inscritos: ' . $booked . " pessoa(s)\n"
        . "No dia, leia o QR de cada grupo na Agenda.";
    gcv_ops_wa_guide($guideId, $text);
    foreach (gcv_ops_paid_sales_for_excursion($excursionId) as $sale) {
        gcv_ops_notify_client_confirmed($sale, $exc);
    }
}

function gcv_ops_notify_guide_cancelled(array $sale, ?array $exc, string $lifecycle): void
{
    $guideId = (int)($sale['guide_user_id'] ?? ($exc['guide_user_id'] ?? 0));
    if ($guideId <= 0) {
        return;
    }
    $title = (string)($sale['excursion_title'] ?? $exc['attraction_title'] ?? 'Passeio');
    $when = '';
    if ($exc) {
        $when = trim(gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    }
    $phase = $lifecycle === 'confirmada' ? 'passeio já confirmado' : 'passeio em formação';
    $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    $excId = (int)($sale['excursion_id'] ?? ($exc['id'] ?? 0));
    $text = "⚠️ Cliente cancelou a reserva ({$phase}).\n\n"
        . 'Passeio: ' . $title . "\n"
        . ($when !== '' ? 'Quando: ' . $when . "\n" : '')
        . 'Cliente: ' . trim((string)($sale['tourist_name'] ?? 'Cliente')) . "\n"
        . 'Pessoas: ' . max(1, (int)($sale['spots'] ?? 1)) . "\n"
        . 'Valor: ' . gcv_ops_brl((int)($sale['sold_price_cents'] ?? 0)) . "\n"
        . 'Código: ' . $code . "\n\n"
        . gcv_ops_group_update_text($excId, $exc);
    gcv_ops_wa_guide($guideId, $text);
    $agency = function_exists('gcv_admin_whatsapp_phone') ? gcv_admin_whatsapp_phone() : '';
    if ($agency !== '' && function_exists('gcv_whatsapp_send_text')) {
        gcv_whatsapp_send_text($agency, $text);
    }
    gcv_ops_wa_client(
        $sale,
        "✅ Sua reserva foi cancelada.\n\n"
        . 'Passeio: ' . $title . "\n"
        . ($when !== '' ? 'Quando: ' . $when . "\n" : '')
        . 'Código: ' . $code . "\n"
        . 'O guia foi avisado.'
    );
}

function gcv_ops_notify_guide_rejected(int $excursionId, string $reason): void
{
    $exc = gcv_ops_load_excursion($excursionId);
    if (!$exc) {
        return;
    }
    $guideId = (int)($exc['guide_user_id'] ?? 0);
    if ($guideId <= 0) {
        error_log('gcv_ops_notify_guide_rejected: excursão ' . $excursionId . ' sem guia');
        return;
    }
    $when = trim(gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    $reason = trim($reason);
    $text = "❌ Seu passeio foi RECUSADO.\n\n"
        . 'Passeio: ' . (string)($exc['attraction_title'] ?? 'Passeio') . "\n"
        . 'Quando: ' . $when . "\n";
    if ($reason !== '') {
        $text .= 'Justificativa: ' . $reason . "\n";
    }
    $text .= 'Ajuste e envie de novo pelo painel.';
    if (!gcv_ops_wa_guide($guideId, $text)) {
        error_log('gcv_ops_notify_guide_rejected: WhatsApp não enviado (excursão ' . $excursionId . ', guia ' . $guideId . ')');
    }
}

function gcv_ops_notify_guide_needs_changes(int $excursionId, string $note): void
{
    $exc = gcv_ops_load_excursion($excursionId);
    if (!$exc) {
        return;
    }
    $when = trim(gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    $text = "✏️ Alterações solicitadas no seu passeio.\n\n"
        . 'Passeio: ' . (string)($exc['attraction_title'] ?? 'Passeio') . "\n"
        . 'Quando: ' . $when . "\n"
        . 'Pedido: ' . trim($note);
    gcv_ops_wa_guide((int)($exc['guide_user_id'] ?? 0), $text);
}

function gcv_ops_notify_tour_cancelled(int $excursionId, string $who = 'guia'): void
{
    $exc = gcv_ops_load_excursion($excursionId, true);
    if (!$exc) {
        return;
    }
    $when = trim(gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    $title = (string)($exc['attraction_title'] ?? 'Passeio');
    $by = $who === 'admin' ? 'pela plataforma' : 'pelo guia';
    $sales = gcv_ops_paid_sales_for_excursion($excursionId);
    foreach ($sales as $sale) {
        gcv_ops_wa_client(
            $sale,
            "❌ Passeio cancelado {$by}.\n\n"
            . 'Passeio: ' . $title . "\n"
            . 'Quando: ' . $when . "\n"
            . 'Código: ' . strtoupper(trim((string)($sale['reservation_id'] ?? ''))) . "\n"
            . 'Fale com a gente no WhatsApp para o reembolso.'
        );
    }
    $guideText = "⚠️ Passeio cancelado {$by}.\n\nPasseio: {$title}\nQuando: {$when}\nReservas pagas avisadas: " . count($sales);
    gcv_ops_wa_guide((int)($exc['guide_user_id'] ?? 0), $guideText);
    $agency = function_exists('gcv_admin_whatsapp_phone') ? gcv_admin_whatsapp_phone() : '';
    if ($agency !== '' && function_exists('gcv_whatsapp_send_text')) {
        gcv_whatsapp_send_text($agency, $guideText);
    }
}

function gcv_ops_paid_sales_for_excursion(int $excursionId): array
{
    $stmt = db()->prepare(
        "SELECT * FROM gcv_sales
         WHERE excursion_id = ? AND deleted_at IS NULL AND sale_status = 'PAID'
         ORDER BY id ASC"
    );
    $stmt->execute([$excursionId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

/**
 * Contagem do grupo: por fora (pré-confirmados do guia) vs plataforma (Pix pago).
 *
 * @param array<string,mixed>|null $exc
 * @return array{por_fora:int,platform:int,cents:int,total:int,max:int}
 */
function gcv_ops_group_counts(int $excursionId, ?array $exc = null): array
{
    if ((!$exc || empty($exc['id'])) && $excursionId > 0) {
        $exc = gcv_ops_load_excursion($excursionId) ?: [];
    }
    $exc = $exc ?: [];
    $porFora = max(0, (int)($exc['preconfirmed_people'] ?? 0));
    $platform = 0;
    $cents = 0;
    if ($excursionId > 0) {
        foreach (gcv_ops_paid_sales_for_excursion($excursionId) as $s) {
            $platform += max(1, (int)($s['spots'] ?? 1));
            $cents += max(0, (int)($s['sold_price_cents'] ?? 0));
        }
    }
    $max = max(1, (int)($exc['max_people'] ?? 10));
    return [
        'por_fora' => $porFora,
        'platform' => $platform,
        'cents' => $cents,
        'total' => $porFora + $platform,
        'max' => $max,
    ];
}

function gcv_ops_group_update_text(int $excursionId, ?array $exc = null): string
{
    $g = gcv_ops_group_counts($excursionId, $exc);
    return "Atualização do grupo:\n"
        . 'Inscritos por fora: ' . $g['por_fora'] . "\n"
        . 'Inscritos na plataforma: ' . $g['platform'] . ' (' . gcv_ops_brl($g['cents']) . ")\n"
        . 'Total inscritos/Máximo permitido: ' . $g['total'] . '/' . $g['max'];
}

function gcv_ops_notify_guide_d12h(int $excursionId): void
{
    $exc = gcv_ops_load_excursion($excursionId);
    if (!$exc || !empty($exc['notify_d12h_guide_at'])) {
        return;
    }
    $sales = gcv_ops_paid_sales_for_excursion($excursionId);
    if (!$sales) {
        return;
    }
    try {
        db()->prepare('UPDATE gcv_excursions SET notify_d12h_guide_at = NOW() WHERE id = ? AND notify_d12h_guide_at IS NULL')
            ->execute([$excursionId]);
    } catch (Throwable $e) {
        return;
    }
    $when = trim(gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    $text = "📋 Resumo do passeio (faltam ~12h)\n\n"
        . (string)($exc['attraction_title'] ?? 'Passeio') . ' · ' . $when . "\n"
        . 'Ponto: ' . trim((string)($exc['meeting_point'] ?? $exc['departure_city_name'] ?? '')) . "\n\n";
    $n = 1;
    foreach ($sales as $s) {
        $pax = max(1, (int)($s['spots'] ?? 1));
        $text .= "Grupo {$n}: " . trim((string)($s['tourist_name'] ?? 'Cliente')) . "\n";
        $text .= 'Tel: ' . trim((string)($s['tourist_phone'] ?? '—')) . "\n";
        $text .= 'Pessoas: ' . $pax . ' · Valor: ' . gcv_ops_brl((int)($s['sold_price_cents'] ?? 0)) . "\n";
        $text .= 'Código: ' . strtoupper(trim((string)($s['reservation_id'] ?? ''))) . "\n\n";
        $n++;
    }
    $text .= 'No dia, leia o QR de CADA grupo. Sem leitura = 50% do valor da reserva.';
    gcv_ops_wa_guide((int)($exc['guide_user_id'] ?? 0), $text);
}

function gcv_ops_notify_client_d12h(array $sale, array $exc): void
{
    if (!empty($sale['notify_d12h_sent_at'])) {
        return;
    }
    $phone = gcv_ops_client_phone($sale);
    if ($phone === '') {
        return;
    }
    try {
        db()->prepare('UPDATE gcv_sales SET notify_d12h_sent_at = NOW() WHERE id = ? AND notify_d12h_sent_at IS NULL')
            ->execute([(int)$sale['id']]);
    } catch (Throwable $e) {
        return;
    }
    $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    $guide = gcv_ops_guide_contact((int)($sale['guide_user_id'] ?? $exc['guide_user_id'] ?? 0));
    $pax = max(1, (int)($sale['spots'] ?? 1));
    $caption = "🎫 Sua reserva para amanhã\n\n"
        . 'Passeio: ' . (string)($exc['attraction_title'] ?? 'Passeio') . "\n"
        . 'Quando: ' . gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5) . "\n"
        . 'Saída: ' . (string)($exc['departure_city_name'] ?? '') . "\n"
        . 'Ponto: ' . trim((string)($exc['meeting_point'] ?? '')) . "\n"
        . gcv_ops_included_text($exc) . "\n"
        . 'Pessoas: ' . $pax . "\n"
        . 'Guia: ' . $guide['name'] . ($guide['phone'] !== '' ? ' · ' . $guide['phone'] : '') . "\n"
        . 'Código: ' . $code . "\n\n"
        . 'Apresente o QR ao guia no embarque.';
    $png = gcv_ops_voucher_png($sale, $exc, $code !== '' ? $code : 'GCV');
    if ($png !== '' && function_exists('gcv_whatsapp_send_image')) {
        gcv_whatsapp_send_image($phone, $caption, $png);
        return;
    }
    gcv_whatsapp_send_text($phone, $caption);
}

function gcv_ops_notify_client_dayof(array $sale, array $exc): void
{
    if (!empty($sale['notify_dayof_sent_at'])) {
        return;
    }
    $phone = gcv_ops_client_phone($sale);
    if ($phone === '') {
        return;
    }
    try {
        db()->prepare('UPDATE gcv_sales SET notify_dayof_sent_at = NOW() WHERE id = ? AND notify_dayof_sent_at IS NULL')
            ->execute([(int)$sale['id']]);
    } catch (Throwable $e) {
        return;
    }
    $guide = gcv_ops_guide_contact((int)($sale['guide_user_id'] ?? $exc['guide_user_id'] ?? 0));
    $pax = max(1, (int)($sale['spots'] ?? 1));
    $text = "🥾 Hoje é o dia do seu passeio!\n\n"
        . 'Passeio: ' . (string)($exc['attraction_title'] ?? 'Passeio') . "\n"
        . 'Saída: ' . substr((string)($exc['departure_time'] ?? ''), 0, 5)
        . ' · ' . (string)($exc['departure_city_name'] ?? '') . "\n"
        . 'Ponto: ' . trim((string)($exc['meeting_point'] ?? '')) . "\n"
        . gcv_ops_included_text($exc) . "\n"
        . 'Pessoas no grupo: ' . $pax . "\n"
        . 'Guia: ' . $guide['name'] . "\n"
        . ($guide['phone'] !== '' ? 'WhatsApp do guia: ' . $guide['phone'] . "\n" : '')
        . 'Leve o comprovante/QR da reserva ' . strtoupper(trim((string)($sale['reservation_id'] ?? ''))) . '.';
    gcv_whatsapp_send_text($phone, $text);
}

function gcv_ops_notify_client_pix_paid(array $sale, ?array $exc = null): void
{
    $id = (int)($sale['id'] ?? 0);
    if (!empty($sale['notify_pix_paid_sent_at'])) {
        return;
    }
    $loc = gcv_ops_sale_locale($sale);
    $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    $title = (string)($sale['excursion_title'] ?? '');
    if ($title === '' && is_array($exc)) {
        $title = (string)($exc['attraction_title'] ?? '');
    }
    if ($title === '') {
        $title = 'Passeio';
    }
    $when = '';
    if (is_array($exc) && $exc) {
        $when = trim(gcv_ops_date_br((string)($exc['date_iso'] ?? '')) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    }
    $pax = max(1, (int)($sale['spots'] ?? 1));
    $url = $code !== '' ? gcv_ops_confirm_url($code, $loc) : '';
    if ($loc === 'en') {
        $text = "✅ Pix confirmed — your booking is paid.\n\n"
            . 'Tour: ' . $title . "\n"
            . ($when !== '' ? 'When: ' . $when . "\n" : '')
            . 'People: ' . $pax . "\n"
            . 'Amount: ' . gcv_ops_brl((int)($sale['sold_price_cents'] ?? 0)) . "\n"
            . 'Code: ' . $code . "\n"
            . ($url !== '' ? "\nVoucher: " . $url : '');
    } elseif ($loc === 'es') {
        $text = "✅ Pix confirmado — tu reserva está pagada.\n\n"
            . 'Paseo: ' . $title . "\n"
            . ($when !== '' ? 'Cuándo: ' . $when . "\n" : '')
            . 'Personas: ' . $pax . "\n"
            . 'Valor: ' . gcv_ops_brl((int)($sale['sold_price_cents'] ?? 0)) . "\n"
            . 'Código: ' . $code . "\n"
            . ($url !== '' ? "\nComprobante: " . $url : '');
    } else {
        $text = "✅ Pix confirmado — sua reserva está paga.\n\n"
            . 'Passeio: ' . $title . "\n"
            . ($when !== '' ? 'Quando: ' . $when . "\n" : '')
            . 'Pessoas: ' . $pax . "\n"
            . 'Valor: ' . gcv_ops_brl((int)($sale['sold_price_cents'] ?? 0)) . "\n"
            . 'Código: ' . $code . "\n"
            . ($url !== '' ? "\nComprovante: " . $url : '');
    }
    if (gcv_ops_wa_client($sale, $text) && $id > 0) {
        gcv_ops_mark_sale_col($id, 'notify_pix_paid_sent_at');
    }
}

function gcv_ops_notify_client_confirmed(array $sale, array $exc): void
{
    $loc = gcv_ops_sale_locale($sale);
    $when = trim(gcv_ops_date_br((string)($exc['date_iso'] ?? '')) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    $title = (string)($exc['attraction_title'] ?? $sale['excursion_title'] ?? 'Passeio');
    $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    $pax = max(1, (int)($sale['spots'] ?? 1));
    $point = trim((string)($exc['meeting_point'] ?? $exc['departure_city_name'] ?? ''));
    if ($loc === 'en') {
        $text = "🎉 Your tour is CONFIRMED (group complete)!\n\n"
            . 'Tour: ' . $title . "\n"
            . 'When: ' . $when . "\n"
            . ($point !== '' ? 'Meeting point: ' . $point . "\n" : '')
            . 'People in your booking: ' . $pax . "\n"
            . 'Code: ' . $code;
    } elseif ($loc === 'es') {
        $text = "🎉 ¡Tu paseo está CONFIRMADO (grupo cerrado)!\n\n"
            . 'Paseo: ' . $title . "\n"
            . 'Cuándo: ' . $when . "\n"
            . ($point !== '' ? 'Punto de encuentro: ' . $point . "\n" : '')
            . 'Personas en tu reserva: ' . $pax . "\n"
            . 'Código: ' . $code;
    } else {
        $text = "🎉 Seu passeio está CONFIRMADO (grupo fechado)!\n\n"
            . 'Passeio: ' . $title . "\n"
            . 'Quando: ' . $when . "\n"
            . ($point !== '' ? 'Ponto de encontro: ' . $point . "\n" : '')
            . 'Pessoas na sua reserva: ' . $pax . "\n"
            . 'Código: ' . $code;
    }
    gcv_ops_wa_client($sale, $text);
}

function gcv_ops_notify_guide_h2(int $excursionId): void
{
    $exc = gcv_ops_load_excursion($excursionId);
    if (!$exc || !empty($exc['notify_h2_guide_at'])) {
        return;
    }
    $sales = gcv_ops_paid_sales_for_excursion($excursionId);
    if (!$sales) {
        return;
    }
    try {
        db()->prepare('UPDATE gcv_excursions SET notify_h2_guide_at = NOW() WHERE id = ? AND notify_h2_guide_at IS NULL')
            ->execute([$excursionId]);
    } catch (Throwable $e) {
        return;
    }
    $when = trim(gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    $text = "⏰ Faltam cerca de 2 horas para o embarque.\n\n"
        . (string)($exc['attraction_title'] ?? 'Passeio') . ' · ' . $when . "\n"
        . 'Ponto: ' . trim((string)($exc['meeting_point'] ?? $exc['departure_city_name'] ?? '')) . "\n"
        . 'Grupos pagos: ' . count($sales) . "\n"
        . 'Leia o QR de CADA grupo na Agenda.';
    gcv_ops_wa_guide((int)($exc['guide_user_id'] ?? 0), $text);
}

function gcv_ops_notify_client_h2(array $sale, array $exc): void
{
    if (!empty($sale['notify_h2_sent_at'])) {
        return;
    }
    $id = (int)($sale['id'] ?? 0);
    if ($id > 0 && !gcv_ops_mark_sale_col($id, 'notify_h2_sent_at')) {
        return;
    }
    $loc = gcv_ops_sale_locale($sale);
    $guide = gcv_ops_guide_contact((int)($sale['guide_user_id'] ?? $exc['guide_user_id'] ?? 0));
    $time = substr((string)($exc['departure_time'] ?? ''), 0, 5);
    $point = trim((string)($exc['meeting_point'] ?? $exc['departure_city_name'] ?? ''));
    $title = (string)($exc['attraction_title'] ?? 'Passeio');
    $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    $pax = max(1, (int)($sale['spots'] ?? 1));
    $guideLine = $guide['name'] . ($guide['phone'] !== '' ? ' · ' . $guide['phone'] : '');
    if ($loc === 'en') {
        $text = "⏰ About 2 hours to departure.\n\n"
            . 'Tour: ' . $title . "\n"
            . 'Time: ' . $time . "\n"
            . 'Meeting point: ' . $point . "\n"
            . 'People: ' . $pax . "\n"
            . 'Guide: ' . $guideLine . "\n"
            . 'Bring the QR for reservation ' . $code . '.';
    } elseif ($loc === 'es') {
        $text = "⏰ Faltan unas 2 horas para la salida.\n\n"
            . 'Paseo: ' . $title . "\n"
            . 'Hora: ' . $time . "\n"
            . 'Punto de encuentro: ' . $point . "\n"
            . 'Personas: ' . $pax . "\n"
            . 'Guía: ' . $guideLine . "\n"
            . 'Lleva el QR de la reserva ' . $code . '.';
    } else {
        $text = "⏰ Faltam cerca de 2 horas para o embarque.\n\n"
            . 'Passeio: ' . $title . "\n"
            . 'Horário: ' . $time . "\n"
            . 'Ponto de encontro: ' . $point . "\n"
            . 'Pessoas: ' . $pax . "\n"
            . 'Guia: ' . $guideLine . "\n"
            . 'Leve o QR da reserva ' . $code . '.';
    }
    gcv_ops_wa_client($sale, $text);
}

function gcv_ops_notify_client_review(array $sale, array $exc): bool
{
    if (!empty($sale['notify_review_sent_at'])) {
        return false;
    }
    $att = strtolower(trim((string)($sale['attendance_status'] ?? 'pending')));
    if ($att !== 'checked_in') {
        return false;
    }
    $id = (int)($sale['id'] ?? 0);
    $token = gcv_review_ensure_token($sale);
    if ($token === '') {
        return false;
    }
    if ($id > 0 && !gcv_ops_mark_sale_col($id, 'notify_review_sent_at')) {
        return false;
    }
    $loc = gcv_ops_sale_locale($sale);
    $title = (string)($exc['attraction_title'] ?? $sale['excursion_title'] ?? 'Passeio');
    $url = gcv_review_form_url($token, $loc);
    if ($loc === 'en') {
        $text = "🌟 Thanks for touring with us yesterday (" . $title . ")!\n\n"
            . "Rate your guide (punctuality, local knowledge and service). You have up to 1 year after the tour:\n"
            . $url;
    } elseif ($loc === 'es') {
        $text = "🌟 ¡Gracias por pasear con nosotros ayer (" . $title . ")!\n\n"
            . "Evalúa a tu guía (puntualidad, conocimiento local y atención). Tienes hasta 1 año después del paseo:\n"
            . $url;
    } else {
        $text = "🌟 Obrigado por passear com a gente ontem (" . $title . ")!\n\n"
            . "Avalie o guia (pontualidade, conhecimento local e atendimento). Você tem até 1 ano após o passeio:\n"
            . $url;
    }
    gcv_ops_wa_client($sale, $text);
    return true;
}

function gcv_ops_notify_guide_payout(array $sale, bool $ok, string $error = '', ?string $e2e = null): void
{
    $guideId = (int)($sale['guide_user_id'] ?? 0);
    $title = (string)($sale['excursion_title'] ?? 'Passeio');
    $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    $amount = gcv_ops_brl((int)($sale['guide_amount_cents'] ?? 0));
    if ($ok) {
        $text = "💸 PIX de repasse enviado.\n\n"
            . 'Passeio: ' . $title . "\n"
            . ($code !== '' ? 'Reserva: ' . $code . "\n" : '')
            . 'Valor: ' . $amount
            . ($e2e ? "\nEndToEnd: " . $e2e : '');
    } else {
        $reasons = [
            'missing_pix' => 'chave PIX do guia ausente ou não verificada',
            'amount_too_small' => 'valor abaixo do mínimo para PIX',
            'sicoob_not_configured' => 'envio PIX da plataforma indisponível no momento',
        ];
        $why = $reasons[$error] ?? $error;
        $text = "⚠️ Falha no PIX de repasse.\n\n"
            . 'Passeio: ' . $title . "\n"
            . ($code !== '' ? 'Reserva: ' . $code . "\n" : '')
            . 'Valor: ' . $amount . "\n"
            . 'Motivo: ' . $why . "\n"
            . 'A plataforma vai tentar de novo. Confira sua chave PIX no perfil.';
    }
    gcv_ops_wa_guide($guideId, $text);
    $agency = function_exists('gcv_admin_whatsapp_phone') ? gcv_admin_whatsapp_phone() : '';
    if ($agency !== '' && function_exists('gcv_whatsapp_send_text')) {
        gcv_whatsapp_send_text($agency, $text);
    }
}

function gcv_ops_notify_checkin(array $sale, array $exc): void
{
    $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    $client = trim((string)($sale['tourist_name'] ?? 'Cliente'));
    $pax = max(1, (int)($sale['spots'] ?? 1));
    $guideId = (int)($sale['guide_user_id'] ?? $exc['guide_user_id'] ?? 0);
    $ok = "✅ Presença confirmada\n\n"
        . 'Reserva: ' . $code . "\n"
        . 'Cliente: ' . $client . "\n"
        . 'Pessoas: ' . $pax . "\n"
        . 'Passeio: ' . (string)($exc['attraction_title'] ?? 'Passeio');
    gcv_ops_wa_guide($guideId, $ok);
    gcv_ops_wa_client($sale, $ok . "\n\nBom passeio!");
}

function gcv_ops_apply_noshow(array $sale): bool
{
    $id = (int)($sale['id'] ?? 0);
    if ($id <= 0) {
        return false;
    }
    $att = strtolower(trim((string)($sale['attendance_status'] ?? 'pending')));
    if ($att === 'checked_in' || $att === 'no_show') {
        return false;
    }
    if (($sale['sale_status'] ?? '') !== GcvSaleStatus::PAID) {
        return false;
    }
    if (($sale['payout_status'] ?? '') === GcvPayoutStatus::PAID) {
        return false;
    }
    $sold = (int)($sale['sold_price_cents'] ?? 0);
    $guideOrig = (int)($sale['guide_amount_cents'] ?? 0);
    $platOrig = (int)($sale['platform_revenue_cents'] ?? 0);
    $guideNew = (int)round($sold * 0.5);
    $platNew = max(0, $sold - $guideNew);
    try {
        db()->prepare(
            "UPDATE gcv_sales
             SET attendance_status = 'no_show',
                 guide_amount_original_cents = COALESCE(guide_amount_original_cents, ?),
                 platform_revenue_original_cents = COALESCE(platform_revenue_original_cents, ?),
                 guide_amount_cents = ?,
                 platform_revenue_cents = ?
             WHERE id = ? AND (attendance_status IS NULL OR attendance_status = 'pending')"
        )->execute([$guideOrig, $platOrig, $guideNew, $platNew, $id]);
    } catch (Throwable $e) {
        error_log('ops noshow: ' . $e->getMessage());
        return false;
    }
    $guideId = (int)($sale['guide_user_id'] ?? 0);
    $text = "⚠️ Presença não lida — reserva abatida em 50%\n\n"
        . 'Código: ' . strtoupper(trim((string)($sale['reservation_id'] ?? ''))) . "\n"
        . 'Cliente: ' . trim((string)($sale['tourist_name'] ?? 'Cliente')) . "\n"
        . 'Valor da reserva: ' . gcv_ops_brl($sold) . "\n"
        . 'Seu repasse: ' . gcv_ops_brl($guideNew) . ' (50%). O restante fica com a plataforma.';
    gcv_ops_wa_guide($guideId, $text);
    return true;
}

/** @return array{reminders:int,noshow:int,h2:int,review:int} */
function gcv_ops_cron_tick(): array
{
    gcv_marketplace_ensure_schema();
    $tz = new DateTimeZone('America/Sao_Paulo');
    $now = new DateTimeImmutable('now', $tz);
    $reminders = 0;
    $noshow = 0;
    $h2 = 0;
    $review = 0;

    $stmt = db()->query(
        "SELECT e.id FROM gcv_excursions e
         WHERE e.deleted_at IS NULL
           AND e.status IN ('published','soldout')
           AND e.date_iso >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)
           AND e.date_iso <= DATE_ADD(CURDATE(), INTERVAL 2 DAY)"
    );
    $ids = $stmt ? array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN) ?: []) : [];
    foreach ($ids as $excId) {
        $exc = gcv_ops_load_excursion($excId);
        if (!$exc) {
            continue;
        }
        $start = gcv_ops_starts_at($exc);
        if (!$start) {
            continue;
        }
        $sales = gcv_ops_paid_sales_for_excursion($excId);
        $hoursToStart = ($start->getTimestamp() - $now->getTimestamp()) / 3600;
        $hoursSinceStart = ($now->getTimestamp() - $start->getTimestamp()) / 3600;
        $isTourDay = $start->format('Y-m-d') === $now->format('Y-m-d');
        $isNextDay = $start->modify('+1 day')->format('Y-m-d') === $now->format('Y-m-d');

        if ($hoursToStart <= 12.5 && $hoursToStart >= 0 && empty($exc['notify_d12h_guide_at'])) {
            gcv_ops_notify_guide_d12h($excId);
            $reminders++;
        }
        if ($hoursToStart <= 2.25 && $hoursToStart >= 0 && empty($exc['notify_h2_guide_at'])) {
            gcv_ops_notify_guide_h2($excId);
            $h2++;
        }
        foreach ($sales as $sale) {
            if ($hoursToStart <= 12.5 && $hoursToStart >= 0 && empty($sale['notify_d12h_sent_at'])) {
                gcv_ops_notify_client_d12h($sale, $exc);
                $reminders++;
            }
            if ($hoursToStart <= 2.25 && $hoursToStart >= 0 && empty($sale['notify_h2_sent_at'])) {
                gcv_ops_notify_client_h2($sale, $exc);
                $h2++;
            }
            if ($isTourDay && $now->format('H') >= '05' && empty($sale['notify_dayof_sent_at'])) {
                gcv_ops_notify_client_dayof($sale, $exc);
                $reminders++;
            }
            if ($isNextDay && (int)$now->format('G') >= 10 && $hoursSinceStart >= 20 && empty($sale['notify_review_sent_at'])) {
                if (gcv_ops_notify_client_review($sale, $exc)) {
                    $review++;
                }
            }
            $payoutHour = 17;
            if (function_exists('gcv_payout_after_hour')) {
                $payoutHour = gcv_payout_after_hour();
            }
            $pastStart = $now >= $start;
            $atPayoutWindow = $isTourDay && (int)$now->format('G') >= $payoutHour;
            $att = strtolower(trim((string)($sale['attendance_status'] ?? 'pending')));
            if (($pastStart && $atPayoutWindow) && ($att === '' || $att === 'pending')) {
                if (gcv_ops_apply_noshow($sale)) {
                    $noshow++;
                }
            }
        }
    }

    return ['reminders' => $reminders, 'noshow' => $noshow, 'h2' => $h2, 'review' => $review];
}
