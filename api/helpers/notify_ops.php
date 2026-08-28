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
require_once __DIR__ . '/inbox.php';
require_once __DIR__ . '/settings.php';

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
         WHERE u.id = ?
         ORDER BY (g.phone IS NULL OR TRIM(g.phone) = \'\') ASC, g.id DESC
         LIMIT 1'
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

function gcv_ops_wa_agency(string $text): bool
{
    if (!function_exists('gcv_whatsapp_send_text')) {
        return false;
    }
    $phone = function_exists('gcv_admin_whatsapp_phone')
        ? gcv_admin_whatsapp_phone()
        : '5562982506891';
    $phone = function_exists('gcv_whatsapp_normalize_phone')
        ? gcv_whatsapp_normalize_phone($phone, '55')
        : preg_replace('/\D+/', '', $phone);
    if ($phone === '') {
        $phone = '5562982506891';
    }
    $ok = gcv_whatsapp_send_text($phone, $text);
    if (!$ok) {
        error_log('gcv_ops_wa_agency: falha ao enviar para ' . $phone);
    }
    return $ok;
}

function gcv_ops_phones_same(string $a, string $b): bool
{
    if (!function_exists('gcv_whatsapp_normalize_phone')) {
        return preg_replace('/\D+/', '', $a) === preg_replace('/\D+/', '', $b);
    }
    $na = gcv_whatsapp_normalize_phone($a, '55');
    $nb = gcv_whatsapp_normalize_phone($b, '55');
    return $na !== '' && $na === $nb;
}

function gcv_ops_excursion_title(array $exc): string
{
    $id = (int)($exc['id'] ?? 0);
    if ($id > 0) {
        try {
            if (!function_exists('gcv_excursion_load_attractions')) {
                require_once __DIR__ . '/excursion_attractions.php';
            }
            $attrs = gcv_excursion_load_attractions($id);
            $joined = trim((string)gcv_excursion_titles_joined($attrs, 'pt'));
            if ($joined !== '') {
                return $joined;
            }
        } catch (Throwable $e) {
            // fallback abaixo
        }
    }
    $t = trim((string)($exc['attraction_title'] ?? ''));
    return $t !== '' ? $t : 'Passeio';
}

function gcv_ops_wa_guide(int $guideUserId, string $text, array $meta = []): bool
{
    if ($guideUserId > 0 && function_exists('gcv_inbox_push')) {
        gcv_inbox_push($guideUserId, $text, $meta);
    }
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
    if ($raw === '') {
        $uid = (int)($sale['tourist_user_id'] ?? 0);
        $email = strtolower(trim((string)($sale['tourist_email'] ?? '')));
        try {
            if ($uid > 0) {
                $st = db()->prepare('SELECT phone, phone_ddi FROM gcv_client_profiles WHERE user_id = ? LIMIT 1');
                $st->execute([$uid]);
                $p = $st->fetch(PDO::FETCH_ASSOC) ?: [];
                $raw = (string)($p['phone'] ?? '');
                $ddi = (string)($p['phone_ddi'] ?? $ddi);
            }
            if ($raw === '' && $email !== '') {
                $st = db()->prepare(
                    'SELECT p.phone, p.phone_ddi
                     FROM gcv_client_profiles p
                     INNER JOIN gcv_users u ON u.id = p.user_id
                     WHERE LOWER(u.email) = ?
                     LIMIT 1'
                );
                $st->execute([$email]);
                $p = $st->fetch(PDO::FETCH_ASSOC) ?: [];
                $raw = (string)($p['phone'] ?? '');
                $ddi = (string)($p['phone_ddi'] ?? $ddi);
            }
        } catch (Throwable $e) {
            error_log('gcv_ops_client_phone profile: ' . $e->getMessage());
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
    $host = gcv_ops_site_host();
    $q = '?id=' . rawurlencode($code);
    if ($loc === 'en') {
        return $host . '/en/confirmacao.html' . $q;
    }
    if ($loc === 'es') {
        return $host . '/es/confirmacao.html' . $q;
    }
    return $host . '/confirmacao.html' . $q;
}

function gcv_ops_site_host(): string
{
    return 'https://www.guiachapadaveadeiros.com';
}

function gcv_ops_checkin_url(): string
{
    return gcv_ops_site_host() . '/dashboard/#checkin';
}

function gcv_ops_guide_qr_scan_lines(): string
{
    return "Leia o QR CODE de cada reserva no embarque.\n"
        . "Sem leitura = 50% do valor da reserva.\n"
        . 'Abrir leitor: ' . gcv_ops_checkin_url();
}

function gcv_ops_send_reservation_qr(array $sale, array $exc, string $caption, string $kind = 'qr'): void
{
    $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    $phone = gcv_ops_client_phone($sale);
    gcv_ops_wa_client($sale, $caption, ['kind' => $kind]);
    $png = gcv_ops_voucher_png($sale, $exc, $code !== '' ? $code : 'GCV');
    if ($phone !== '' && $png !== '' && function_exists('gcv_whatsapp_send_image')) {
        gcv_whatsapp_send_image($phone, 'QR ' . $code, $png);
    }
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
        'notify_m15_sent_at' => true,
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

function gcv_ops_client_user_id(array $sale): int
{
    $uid = (int)($sale['tourist_user_id'] ?? 0);
    if ($uid > 0) {
        return $uid;
    }
    $email = strtolower(trim((string)($sale['tourist_email'] ?? '')));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return 0;
    }
    try {
        $st = db()->prepare('SELECT id FROM gcv_users WHERE LOWER(email) = ? LIMIT 1');
        $st->execute([$email]);
        return (int)($st->fetchColumn() ?: 0);
    } catch (Throwable $e) {
        return 0;
    }
}

function gcv_ops_mail_plain(string $to, string $subject, string $text): bool
{
    $to = strtolower(trim($to));
    if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    if (!function_exists('send_mail')) {
        require_once __DIR__ . '/mailer.php';
    }
    if (!function_exists('send_mail')) {
        return false;
    }
    $html = '<p>' . nl2br(htmlspecialchars($text, ENT_QUOTES, 'UTF-8')) . '</p>';
    try {
        return send_mail($to, $subject, $html);
    } catch (Throwable $e) {
        error_log('gcv_ops_mail_plain: ' . $e->getMessage());
        return false;
    }
}

function gcv_ops_wa_client(array $sale, string $text, array $meta = []): bool
{
    $uid = gcv_ops_client_user_id($sale);
    if ($uid > 0 && function_exists('gcv_inbox_push')) {
        $meta['sale_id'] = $meta['sale_id'] ?? (int)($sale['id'] ?? 0);
        $meta['excursion_id'] = $meta['excursion_id'] ?? (int)($sale['excursion_id'] ?? 0);
        gcv_inbox_push($uid, $text, $meta);
    }
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

function gcv_ops_is_group_excursion(?array $exc): bool
{
    // Avulsos exclusivos ainda não existem. Todo passeio publicado (guia ou admin) é excursão.
    unset($exc);
    return true;
}

function gcv_ops_guide_unit_cents(array $exc): int
{
    $n = (int)($exc['guide_net_cents'] ?? 0);
    if ($n <= 0) {
        $n = (int)($exc['guide_payout_planned_cents'] ?? 0);
    }
    return max(0, $n);
}

function gcv_ops_pessoas(int $n): string
{
    return $n === 1 ? '1 pessoa' : ($n . ' pessoas');
}

function gcv_ops_quorum_text(int $quorum): string
{
    return $quorum <= 0 ? 'sem quórum (já confirmado)' : gcv_ops_pessoas($quorum);
}

function gcv_ops_join_pt(array $items): string
{
    $items = array_values(array_filter(array_map('strval', $items), static function ($s) {
        return trim($s) !== '';
    }));
    $n = count($items);
    if ($n === 0) {
        return '';
    }
    if ($n === 1) {
        return $items[0];
    }
    if ($n === 2) {
        return $items[0] . ' e ' . $items[1];
    }
    return implode(', ', array_slice($items, 0, -1)) . ' e ' . $items[$n - 1];
}

function gcv_ops_embarque_text(array $exc): string
{
    $city = trim((string)($exc['departure_city_name'] ?? ''));
    $point = trim((string)($exc['meeting_point'] ?? ''));
    if ($city !== '' && $point !== '' && strcasecmp($city, $point) !== 0 && stripos($point, $city) === false) {
        return $city . ' (' . $point . ')';
    }
    return $city !== '' ? $city : $point;
}

function gcv_ops_coverage_publish_text(array $exc): string
{
    $yes = ['Passeio com guia local'];
    $no = [];
    $map = [
        'include_transport' => 'Transporte',
        'include_entry' => 'entradas',
        'include_lunch' => 'almoço',
    ];
    foreach ($map as $col => $label) {
        if (!empty($exc[$col]) && ((int)$exc[$col] === 1 || $exc[$col] === true || $exc[$col] === '1')) {
            $yes[] = $label;
        } else {
            $no[] = $label;
        }
    }
    $out = 'Incluso: ' . gcv_ops_join_pt($yes);
    if ($no) {
        $out .= "\nNão incluso: " . gcv_ops_join_pt($no);
    }
    return $out;
}

/**
 * Corpo atualizado do passeio (publicado ou nova inscrição).
 *
 * @param 'published'|'booking' $kind
 */
function gcv_ops_guide_tour_snapshot(int $excursionId, ?array $exc = null, string $kind = 'published'): string
{
    if ((!$exc || empty($exc['id'])) && $excursionId > 0) {
        $exc = gcv_ops_load_excursion($excursionId) ?: [];
    }
    $exc = $exc ?: [];
    $g = gcv_ops_group_counts($excursionId, $exc);
    $life = function_exists('gcv_resolve_excursion_lifecycle')
        ? gcv_resolve_excursion_lifecycle($exc)
        : '';
    $quorum = max(0, (int)($exc['quorum'] ?? 0));
    $confirmed = in_array($life, ['confirmada', 'soldout'], true);
    if ($kind === 'booking') {
        $head = 'Nova inscrição';
    } else {
        $head = $confirmed ? '✅ Passeio CONFIRMADO!' : '✅ Passeio EM FORMAÇÃO!';
    }
    $when = trim(gcv_ops_date_br((string)($exc['date_iso'] ?? '')) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    $unitGuide = gcv_ops_guide_unit_cents($exc);
    $inscritosWord = $g['total'] === 1 ? 'inscrito' : 'inscritos';
    return $head . "\n\n"
        . 'Destino: ' . gcv_ops_excursion_title($exc) . "\n"
        . 'Data: ' . $when . "\n"
        . 'Embarque: ' . gcv_ops_embarque_text($exc) . "\n"
        . 'Confirmados por fora: ' . gcv_ops_pessoas($g['por_fora']) . "\n"
        . 'Inscritos: ' . gcv_ops_pessoas($g['platform']) . "\n"
        . 'Quórum: ' . gcv_ops_quorum_text($quorum) . "\n"
        . 'Grupo total: ' . $g['total'] . '/' . $g['max'] . ' ' . $inscritosWord . "\n"
        . 'Valor a receber por inscrição: ' . gcv_ops_brl($unitGuide)
        . ' (total até o momento ' . gcv_ops_brl((int)$g['guide_cents']) . ")\n\n"
        . gcv_ops_coverage_publish_text($exc) . "\n\n"
        . 'No dia, leia o QR de cada grupo na Agenda.';
}

function gcv_ops_meeting_point_text(array $exc): string
{
    $point = trim((string)($exc['meeting_point'] ?? ''));
    $city = trim((string)($exc['departure_city_name'] ?? ''));
    if ($point !== '' && $city !== '' && stripos($point, $city) === false) {
        return $point . ' · ' . $city;
    }
    return $point !== '' ? $point : $city;
}

function gcv_ops_format_phone_display(string $raw): string
{
    $d = preg_replace('/\D+/', '', $raw) ?? '';
    if ($d === '') {
        return '';
    }
    if (str_starts_with($d, '55') && strlen($d) >= 12) {
        $rest = substr($d, 2);
        if (strlen($rest) === 11) {
            return '+55 (' . substr($rest, 0, 2) . ') ' . substr($rest, 2, 5) . '-' . substr($rest, 7);
        }
    }
    if (strlen($d) === 11) {
        return '(' . substr($d, 0, 2) . ') ' . substr($d, 2, 5) . '-' . substr($d, 7);
    }
    return $raw;
}

/**
 * @return array{guide_long:float,guide_short:float,client_long:float,client_short:float,arrive_min:int,tolerance_min:int}
 */
function gcv_ops_notify_cfg(): array
{
    $hours = static function (string $key, float $default): float {
        $v = (float)setting($key, (string)$default);
        return $v > 0 ? $v : $default;
    };
    $mins = static function (string $key, int $default): int {
        $v = (int)setting($key, (string)$default);
        return $v >= 0 ? $v : $default;
    };
    return [
        'guide_long' => $hours('notify_guide_hours_long', 24),
        'guide_short' => $hours('notify_guide_hours_short', 3),
        'client_long' => $hours('notify_client_hours_long', 24),
        'client_short' => $hours('notify_client_hours_short', 2),
        'arrive_min' => $mins('notify_arrive_minutes', 15),
        'tolerance_min' => $mins('notify_late_tolerance_minutes', 15),
    ];
}

function gcv_ops_hours_phrase(float $h, string $loc = 'pt'): string
{
    $whole = abs($h - round($h)) < 0.05;
    $n = $whole ? (int)round($h) : $h;
    if ($whole) {
        if ($loc === 'en') {
            return $n === 1 ? '1 hour' : ($n . ' hours');
        }
        if ($loc === 'es') {
            return $n === 1 ? '1 hora' : ($n . ' horas');
        }
        return $n === 1 ? '1 hora' : ($n . ' horas');
    }
    $s = rtrim(rtrim(number_format($h, 1, $loc === 'en' ? '.' : ',', ''), '0'), $loc === 'en' ? '.' : ',');
    if ($loc === 'en') {
        return $s . ' hours';
    }
    return $s . ' horas';
}

function gcv_ops_minutes_phrase(int $m, string $loc = 'pt'): string
{
    if ($loc === 'en') {
        return $m === 1 ? '1 minute' : ($m . ' minutes');
    }
    if ($loc === 'es') {
        return $m === 1 ? '1 minuto' : ($m . ' minutos');
    }
    return $m === 1 ? '1 minuto' : ($m . ' minutos');
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

function gcv_ops_notify_guide_registration_pending(int $guideUserId): void
{
    if ($guideUserId <= 0) {
        return;
    }
    $c = gcv_ops_guide_contact($guideUserId);
    $name = trim((string)($c['name'] ?? '')) ?: 'Guia';
    $text = "📬 Seu cadastro de guia está em aprovação.\n\n"
        . 'Olá, ' . $name . "!\n\n"
        . "Recebemos seus dados. Nossa equipe vai analisar o perfil e você recebe um aviso neste WhatsApp quando for aprovado.\n\n"
        . 'Enquanto isso, acompanhe o status no painel.';
    if (!gcv_ops_wa_guide($guideUserId, $text, ['type' => 'guide_registration_pending'])) {
        error_log('gcv_ops_notify_guide_registration_pending: WhatsApp não enviado ao guia ' . $guideUserId);
    }
    $adminText = "⏳ Novo guia aguardando aprovação\n\n"
        . 'Nome: ' . $name . "\n"
        . 'Email: ' . (string)($c['email'] ?? '') . "\n"
        . (($c['phone'] ?? '') !== '' ? 'WhatsApp: ' . $c['phone'] . "\n" : '')
        . "\nPainel → Guias credenciados.";
    gcv_ops_wa_agency($adminText);
}

function gcv_ops_notify_guide_pending_approval(int $excursionId): void
{
    $exc = gcv_ops_load_excursion($excursionId);
    if (!$exc) {
        return;
    }
    $guideId = (int)($exc['guide_user_id'] ?? 0);
    $when = trim(gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    $title = gcv_ops_excursion_title($exc);
    $price = gcv_ops_brl((int)($exc['price_cents'] ?? 0));
    $net = gcv_ops_brl((int)($exc['guide_net_cents'] ?? $exc['guide_payout_planned_cents'] ?? 0));
    $city = (string)($exc['departure_city_name'] ?? '');

    if ($guideId > 0) {
        $text = "📬 Seu passeio foi enviado para aprovação.\n\n"
            . 'Passeio: ' . $title . "\n"
            . 'Quando: ' . $when . "\n"
            . ($city !== '' ? 'Embarque: ' . $city . "\n" : '')
            . 'Preço no site: ' . $price . " por pessoa\n"
            . ($net !== 'R$ 0,00' ? 'Você recebe: ' . $net . " por pessoa\n" : '')
            . "\nAvisamos você neste WhatsApp quando for aprovado ou recusado.";
        if (!gcv_ops_wa_guide($guideId, $text)) {
            error_log('gcv_ops_notify_guide_pending_approval: WhatsApp não enviado ao guia (excursão ' . $excursionId . ', guia ' . $guideId . ')');
        }
    } else {
        error_log('gcv_ops_notify_guide_pending_approval: excursão ' . $excursionId . ' sem guia');
    }

    $guide = $guideId > 0 ? gcv_ops_guide_contact($guideId) : ['name' => 'Guia', 'phone' => ''];
    $adminText = "⏳ Passeio aguardando aprovação\n\n"
        . 'Guia: ' . (string)($guide['name'] ?? 'Guia') . "\n"
        . 'Passeio: ' . $title . "\n"
        . 'Quando: ' . $when . "\n"
        . 'Preço: ' . $price . "\n"
        . 'ID: #' . $excursionId . "\n\n"
        . 'Painel → Aprovações de Excursões.';
    gcv_ops_wa_agency($adminText);
}

function gcv_ops_notify_guide_new_booking(array $sale, ?array $exc, int $spots): void
{
    $guideId = (int)($sale['guide_user_id'] ?? ($exc['guide_user_id'] ?? 0));
    $exc = is_array($exc) ? $exc : [];
    $title = trim((string)($sale['excursion_title'] ?? ''));
    if ($title === '') {
        $title = gcv_ops_excursion_title($exc);
    }
    $when = '';
    if ($exc) {
        $when = trim(gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    }
    $client = trim((string)($sale['tourist_name'] ?? '')) ?: 'Cliente';
    $clientEmail = trim((string)($sale['tourist_email'] ?? ''));
    $clientPhone = trim((string)($sale['tourist_phone'] ?? ''));
    if ($clientPhone === '') {
        $clientPhone = gcv_ops_client_phone($sale);
    }
    $people = max(1, $spots);
    $pax = $people === 1 ? '1 pessoa' : ($people . ' pessoas');
    $amount = gcv_ops_brl((int)($sale['sold_price_cents'] ?? 0));
    $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    $guide = $guideId > 0 ? gcv_ops_guide_contact($guideId) : ['name' => 'Guia', 'phone' => ''];
    $guideName = (string)($guide['name'] ?? 'Guia');
    $excId = (int)($sale['excursion_id'] ?? ($exc['id'] ?? 0));
    $textGuide = $excId > 0
        ? gcv_ops_guide_tour_snapshot($excId, null, 'booking')
        : ('Nova inscrição' . ($title !== '' ? "\n\nDestino: " . $title : ''));
    if ($guideId > 0) {
        if (!gcv_ops_wa_guide($guideId, $textGuide)) {
            error_log('gcv_ops_notify_guide_new_booking: WhatsApp não enviado ao guia (excursão ' . $excId . ', guia ' . $guideId . ')');
        }
    } else {
        error_log('gcv_ops_notify_guide_new_booking: venda sem guia (sale ' . (int)($sale['id'] ?? 0) . ')');
    }

    $textAgency = "💰 Nova venda no site\n\n"
        . 'Guia: ' . $guideName . "\n"
        . 'Passeio: ' . $title . "\n"
        . ($when !== '' ? 'Quando: ' . $when . "\n" : '')
        . 'Pessoas: ' . $pax . "\n"
        . 'Valor pago: ' . $amount . "\n"
        . "\nCliente: " . $client . "\n";
    if ($clientPhone !== '') {
        $textAgency .= 'Telefone do cliente: ' . $clientPhone . "\n";
    }
    if ($clientEmail !== '') {
        $textAgency .= 'E-mail do cliente: ' . $clientEmail . "\n";
    }
    if ($code !== '') {
        $textAgency .= 'Código: ' . $code . "\n";
    }
    if (!gcv_ops_wa_agency($textAgency)) {
        error_log('gcv_ops_notify_guide_new_booking: WhatsApp não enviado à VPS (sale ' . (int)($sale['id'] ?? 0) . ')');
    }
}

function gcv_ops_notify_guide_approved(int $excursionId): void
{
    $exc = gcv_ops_load_excursion($excursionId);
    if (!$exc) {
        return;
    }
    if (!empty($exc['notify_approved_at'])) {
        return;
    }
    $guideId = (int)($exc['guide_user_id'] ?? 0);
    if ($guideId <= 0) {
        error_log('gcv_ops_notify_guide_approved: excursão ' . $excursionId . ' sem guia');
        return;
    }
    $when = trim(gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    $title = gcv_ops_excursion_title($exc);
    $text = gcv_ops_guide_tour_snapshot($excursionId, $exc, 'published');
    $okGuide = gcv_ops_wa_guide($guideId, $text);
    if (!$okGuide) {
        error_log('gcv_ops_notify_guide_approved: WhatsApp não enviado ao guia (excursão ' . $excursionId . ', guia ' . $guideId . ')');
    }
    $guide = gcv_ops_guide_contact($guideId);
    $okAgency = false;
    if (!gcv_ops_phones_same((string)($guide['phone'] ?? ''), gcv_admin_whatsapp_phone())) {
        $okAgency = gcv_ops_wa_agency(
            "✅ Passeio APROVADO\n\n"
            . 'Guia: ' . (string)($guide['name'] ?? 'Guia') . "\n"
            . 'Passeio: ' . $title . "\n"
            . 'Quando: ' . $when . "\n"
            . 'ID: #' . $excursionId
        );
        if (!$okAgency) {
            error_log('gcv_ops_notify_guide_approved: WhatsApp não enviado à VPS (excursão ' . $excursionId . ')');
        }
    }
    if (!$okGuide && !$okAgency) {
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
 * @return array{por_fora:int,platform:int,cents:int,guide_cents:int,total:int,max:int}
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
    $guideCents = 0;
    if ($excursionId > 0) {
        foreach (gcv_ops_paid_sales_for_excursion($excursionId) as $s) {
            $platform += max(1, (int)($s['spots'] ?? 1));
            $cents += max(0, (int)($s['sold_price_cents'] ?? 0));
            $guideCents += max(0, (int)($s['guide_amount_cents'] ?? 0));
        }
    }
    $max = max(1, (int)($exc['max_people'] ?? 10));
    return [
        'por_fora' => $porFora,
        'platform' => $platform,
        'cents' => $cents,
        'guide_cents' => $guideCents,
        'total' => $porFora + $platform,
        'max' => $max,
    ];
}

function gcv_ops_group_update_text(int $excursionId, ?array $exc = null): string
{
    if ((!$exc || empty($exc['id'])) && $excursionId > 0) {
        $exc = gcv_ops_load_excursion($excursionId) ?: [];
    }
    $exc = $exc ?: [];
    $g = gcv_ops_group_counts($excursionId, $exc);
    $unitGuide = gcv_ops_guide_unit_cents($exc);
    $quorum = max(0, (int)($exc['quorum'] ?? 0));
    $inscritosWord = $g['total'] === 1 ? 'inscrito' : 'inscritos';
    return 'Confirmados por fora: ' . gcv_ops_pessoas($g['por_fora']) . "\n"
        . 'Inscritos: ' . gcv_ops_pessoas($g['platform']) . "\n"
        . 'Quórum: ' . gcv_ops_quorum_text($quorum) . "\n"
        . 'Grupo total: ' . $g['total'] . '/' . $g['max'] . ' ' . $inscritosWord . "\n"
        . 'Valor a receber por inscrição: ' . gcv_ops_brl($unitGuide)
        . ' (total até o momento ' . gcv_ops_brl((int)$g['guide_cents']) . ')';
}

function gcv_ops_roster_text(int $excursionId): string
{
    $sales = gcv_ops_paid_sales_for_excursion($excursionId);
    if (!$sales) {
        return "Nenhum inscrito na plataforma ainda.";
    }
    $out = "Grupos inscritos na plataforma:\n";
    $n = 1;
    foreach ($sales as $s) {
        $pax = max(1, (int)($s['spots'] ?? 1));
        $phone = trim((string)($s['tourist_phone'] ?? ''));
        if ($phone === '') {
            $phone = gcv_ops_client_phone($s);
        }
        $phoneDisp = gcv_ops_format_phone_display($phone);
        $out .= "\nGrupo {$n}: " . (trim((string)($s['tourist_name'] ?? '')) ?: 'Cliente') . "\n";
        $out .= 'Pessoas no grupo: ' . $pax . "\n";
        $out .= 'Telefone: ' . ($phoneDisp !== '' ? $phoneDisp : '—') . "\n";
        $code = strtoupper(trim((string)($s['reservation_id'] ?? '')));
        if ($code !== '') {
            $out .= 'Código: ' . $code . "\n";
        }
        $n++;
    }
    return trim($out);
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
    $cfg = gcv_ops_notify_cfg();
    $when = trim(gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    $title = gcv_ops_excursion_title($exc);
    $h = gcv_ops_hours_phrase($cfg['guide_long'], 'pt');
    $text = "⏰ Faltam {$h} para o passeio.\n\n"
        . 'Passeio: ' . $title . "\n"
        . 'Quando: ' . $when . "\n"
        . 'Ponto: ' . gcv_ops_meeting_point_text($exc) . "\n\n"
        . gcv_ops_group_update_text($excursionId, $exc) . "\n\n"
        . gcv_ops_roster_text($excursionId) . "\n\n"
        . gcv_ops_guide_qr_scan_lines();
    $guideId = (int)($exc['guide_user_id'] ?? 0);
    gcv_ops_wa_guide($guideId, $text, ['kind' => 'd24h', 'excursion_id' => $excursionId]);
    $email = gcv_ops_guide_contact($guideId)['email'] ?? '';
    if ($email !== '') {
        gcv_ops_mail_plain($email, 'Faltam ' . $h . ' — ' . $title, $text);
    }
}

function gcv_ops_notify_client_d12h(array $sale, array $exc): void
{
    if (!empty($sale['notify_d12h_sent_at'])) {
        return;
    }
    $id = (int)($sale['id'] ?? 0);
    if ($id > 0 && !gcv_ops_mark_sale_col($id, 'notify_d12h_sent_at')) {
        return;
    }
    $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    $guide = gcv_ops_guide_contact((int)($sale['guide_user_id'] ?? $exc['guide_user_id'] ?? 0));
    $pax = max(1, (int)($sale['spots'] ?? 1));
    $counts = gcv_ops_group_counts((int)($exc['id'] ?? $sale['excursion_id'] ?? 0), $exc);
    $title = gcv_ops_excursion_title($exc);
    $guidePhone = gcv_ops_format_phone_display((string)($guide['phone'] ?? ''));
    $loc = gcv_ops_sale_locale($sale);
    $when = gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5);
    $point = gcv_ops_meeting_point_text($exc);
    $hLong = gcv_ops_notify_cfg()['client_long'];
    $hPt = gcv_ops_hours_phrase($hLong, 'pt');
    $hEn = gcv_ops_hours_phrase($hLong, 'en');
    $hEs = gcv_ops_hours_phrase($hLong, 'es');
    if ($loc === 'en') {
        $caption = "🎫 {$hEn} to your tour\n\n"
            . 'Tour: ' . $title . "\n"
            . 'When: ' . $when . "\n"
            . 'Meeting point: ' . $point . "\n"
            . gcv_ops_included_text($exc) . "\n"
            . 'People in your booking: ' . $pax . "\n"
            . 'Group size: ' . $counts['total'] . '/' . $counts['max'] . " registered\n"
            . 'Guide: ' . $guide['name'] . ($guidePhone !== '' ? ' · ' . $guidePhone : '') . "\n"
            . 'Code: ' . $code . "\n\n"
            . 'Show the QR to the guide at boarding.';
    } elseif ($loc === 'es') {
        $caption = "🎫 Faltan {$hEs} para tu paseo\n\n"
            . 'Paseo: ' . $title . "\n"
            . 'Cuándo: ' . $when . "\n"
            . 'Punto de encuentro: ' . $point . "\n"
            . gcv_ops_included_text($exc) . "\n"
            . 'Personas en tu reserva: ' . $pax . "\n"
            . 'Inscritos en el grupo: ' . $counts['total'] . '/' . $counts['max'] . "\n"
            . 'Guía: ' . $guide['name'] . ($guidePhone !== '' ? ' · ' . $guidePhone : '') . "\n"
            . 'Código: ' . $code . "\n\n"
            . 'Muestra el QR al guía en el embarque.';
    } else {
        $caption = "🎫 Faltam {$hPt} para o seu passeio\n\n"
            . 'Passeio: ' . $title . "\n"
            . 'Quando: ' . $when . "\n"
            . 'Ponto de encontro: ' . $point . "\n"
            . gcv_ops_included_text($exc) . "\n"
            . 'Pessoas na sua reserva: ' . $pax . "\n"
            . 'Inscritos no grupo: ' . $counts['total'] . '/' . $counts['max'] . "\n"
            . 'Guia: ' . $guide['name'] . ($guidePhone !== '' ? ' · ' . $guidePhone : '') . "\n"
            . 'Código: ' . $code . "\n\n"
            . 'Apresente o QR ao guia no embarque.';
    }
    $phone = gcv_ops_client_phone($sale);
    $png = gcv_ops_voucher_png($sale, $exc, $code !== '' ? $code : 'GCV');
    gcv_ops_wa_client($sale, $caption, ['kind' => 'd24h']);
    if ($phone !== '' && $png !== '' && function_exists('gcv_whatsapp_send_image')) {
        gcv_whatsapp_send_image($phone, 'QR ' . $code, $png);
    }
    $email = trim((string)($sale['tourist_email'] ?? ''));
    if ($email !== '') {
        gcv_ops_mail_plain($email, gcv_inbox_title_from_body($caption), $caption);
    }
}

function gcv_ops_notify_client_dayof(array $sale, array $exc): void
{
    if (!empty($sale['notify_dayof_sent_at'])) {
        return;
    }
    $id = (int)($sale['id'] ?? 0);
    if ($id > 0 && !gcv_ops_mark_sale_col($id, 'notify_dayof_sent_at')) {
        return;
    }
    $loc = gcv_ops_sale_locale($sale);
    $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    $guide = gcv_ops_guide_contact((int)($sale['guide_user_id'] ?? $exc['guide_user_id'] ?? 0));
    $pax = max(1, (int)($sale['spots'] ?? 1));
    $counts = gcv_ops_group_counts((int)($exc['id'] ?? $sale['excursion_id'] ?? 0), $exc);
    $guidePhone = gcv_ops_format_phone_display((string)($guide['phone'] ?? ''));
    $title = gcv_ops_excursion_title($exc);
    $when = trim(gcv_ops_date_br((string)($exc['date_iso'] ?? '')) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    $point = gcv_ops_meeting_point_text($exc);
    $voucherUrl = $code !== '' ? gcv_ops_confirm_url($code, $loc) : '';
    $guideLine = $guide['name'] . ($guidePhone !== '' ? ' · ' . $guidePhone : '');
    if ($loc === 'en') {
        $caption = "🥾 Today is your tour day!\n\n"
            . 'Tour: ' . $title . "\n"
            . 'When: ' . $when . "\n"
            . 'Meeting point: ' . $point . "\n"
            . gcv_ops_included_text($exc) . "\n"
            . 'People in your booking: ' . $pax . "\n"
            . 'Group size: ' . $counts['total'] . '/' . $counts['max'] . " registered\n"
            . 'Guide: ' . $guideLine . "\n"
            . 'Code: ' . $code . "\n\n"
            . "Show this QR CODE to the guide at boarding.\n"
            . ($voucherUrl !== '' ? 'Voucher: ' . $voucherUrl : '');
    } elseif ($loc === 'es') {
        $caption = "🥾 ¡Hoy es el día de tu paseo!\n\n"
            . 'Paseo: ' . $title . "\n"
            . 'Cuándo: ' . $when . "\n"
            . 'Punto de encuentro: ' . $point . "\n"
            . gcv_ops_included_text($exc) . "\n"
            . 'Personas en tu reserva: ' . $pax . "\n"
            . 'Inscritos en el grupo: ' . $counts['total'] . '/' . $counts['max'] . "\n"
            . 'Guía: ' . $guideLine . "\n"
            . 'Código: ' . $code . "\n\n"
            . "Muestra este QR CODE al guía en el embarque.\n"
            . ($voucherUrl !== '' ? 'Comprobante: ' . $voucherUrl : '');
    } else {
        $caption = "🥾 Hoje é o dia do seu passeio!\n\n"
            . 'Passeio: ' . $title . "\n"
            . 'Quando: ' . $when . "\n"
            . 'Ponto de encontro: ' . $point . "\n"
            . gcv_ops_included_text($exc) . "\n"
            . 'Pessoas na sua reserva: ' . $pax . "\n"
            . 'Inscritos no grupo: ' . $counts['total'] . '/' . $counts['max'] . "\n"
            . 'Guia: ' . $guideLine . "\n"
            . 'Código: ' . $code . "\n\n"
            . "Apresente este QR CODE ao guia no embarque.\n"
            . ($voucherUrl !== '' ? 'Comprovante: ' . $voucherUrl : '');
    }
    gcv_ops_send_reservation_qr($sale, $exc, trim($caption), 'dayof');
    $email = trim((string)($sale['tourist_email'] ?? ''));
    if ($email !== '') {
        gcv_ops_mail_plain($email, gcv_inbox_title_from_body($caption), $caption);
    }
}

function gcv_ops_notify_guide_dayof(int $excursionId): void
{
    $exc = gcv_ops_load_excursion($excursionId);
    if (!$exc || !empty($exc['notify_dayof_guide_at'])) {
        return;
    }
    $sales = gcv_ops_paid_sales_for_excursion($excursionId);
    if (!$sales) {
        return;
    }
    try {
        db()->prepare('UPDATE gcv_excursions SET notify_dayof_guide_at = NOW() WHERE id = ? AND notify_dayof_guide_at IS NULL')
            ->execute([$excursionId]);
    } catch (Throwable $e) {
        return;
    }
    $when = trim(gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    $title = gcv_ops_excursion_title($exc);
    $text = "🥾 Hoje é o dia do passeio!\n\n"
        . 'Passeio: ' . $title . "\n"
        . 'Quando: ' . $when . "\n"
        . 'Ponto: ' . gcv_ops_meeting_point_text($exc) . "\n\n"
        . gcv_ops_group_update_text($excursionId, $exc) . "\n\n"
        . gcv_ops_roster_text($excursionId) . "\n\n"
        . gcv_ops_guide_qr_scan_lines();
    $guideId = (int)($exc['guide_user_id'] ?? 0);
    gcv_ops_wa_guide($guideId, $text, ['kind' => 'dayof', 'excursion_id' => $excursionId]);
    $email = gcv_ops_guide_contact($guideId)['email'] ?? '';
    if ($email !== '') {
        gcv_ops_mail_plain($email, 'Hoje: ' . $title, $text);
    }
}

function gcv_ops_notify_client_pix_paid(array $sale, ?array $exc = null): void
{
    $id = (int)($sale['id'] ?? 0);
    if (!empty($sale['notify_pix_paid_sent_at'])) {
        return;
    }
    $loc = gcv_ops_sale_locale($sale);
    $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    $title = trim((string)($sale['excursion_title'] ?? ''));
    if ($title === '' && is_array($exc) && $exc) {
        $title = gcv_ops_excursion_title($exc);
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
    $cfg = gcv_ops_notify_cfg();
    $when = trim(gcv_ops_date_br((string)$exc['date_iso']) . ' às ' . substr((string)($exc['departure_time'] ?? ''), 0, 5));
    $title = gcv_ops_excursion_title($exc);
    $h = gcv_ops_hours_phrase($cfg['guide_short'], 'pt');
    $text = "⏰ Faltam {$h} para o início do passeio.\n\n"
        . 'Passeio: ' . $title . "\n"
        . 'Quando: ' . $when . "\n"
        . 'Ponto: ' . gcv_ops_meeting_point_text($exc) . "\n\n"
        . gcv_ops_group_update_text($excursionId, $exc) . "\n\n"
        . gcv_ops_roster_text($excursionId) . "\n\n"
        . gcv_ops_guide_qr_scan_lines();
    $guideId = (int)($exc['guide_user_id'] ?? 0);
    gcv_ops_wa_guide($guideId, $text, ['kind' => 'h3', 'excursion_id' => $excursionId]);
    $email = gcv_ops_guide_contact($guideId)['email'] ?? '';
    if ($email !== '') {
        gcv_ops_mail_plain($email, 'Faltam ' . $h . ' — ' . $title, $text);
    }
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
    $point = gcv_ops_meeting_point_text($exc);
    $title = gcv_ops_excursion_title($exc);
    $code = strtoupper(trim((string)($sale['reservation_id'] ?? '')));
    $pax = max(1, (int)($sale['spots'] ?? 1));
    $counts = gcv_ops_group_counts((int)($exc['id'] ?? $sale['excursion_id'] ?? 0), $exc);
    $guidePhone = gcv_ops_format_phone_display((string)($guide['phone'] ?? ''));
    $guideLine = $guide['name'] . ($guidePhone !== '' ? ' · ' . $guidePhone : '');
    $hShort = gcv_ops_notify_cfg()['client_short'];
    $hPt = gcv_ops_hours_phrase($hShort, 'pt');
    $hEn = gcv_ops_hours_phrase($hShort, 'en');
    $hEs = gcv_ops_hours_phrase($hShort, 'es');
    if ($loc === 'en') {
        $text = "⏰ {$hEn} to departure.\n\n"
            . 'Tour: ' . $title . "\n"
            . 'Time: ' . $time . "\n"
            . 'Meeting point: ' . $point . "\n"
            . 'People in your booking: ' . $pax . "\n"
            . 'Group size: ' . $counts['total'] . '/' . $counts['max'] . " registered\n"
            . 'Guide: ' . $guideLine . "\n"
            . 'Bring the QR for reservation ' . $code . '.';
    } elseif ($loc === 'es') {
        $text = "⏰ Faltan {$hEs} para la salida.\n\n"
            . 'Paseo: ' . $title . "\n"
            . 'Hora: ' . $time . "\n"
            . 'Punto de encuentro: ' . $point . "\n"
            . 'Personas en tu reserva: ' . $pax . "\n"
            . 'Inscritos en el grupo: ' . $counts['total'] . '/' . $counts['max'] . "\n"
            . 'Guía: ' . $guideLine . "\n"
            . 'Lleva el QR de la reserva ' . $code . '.';
    } else {
        $text = "⏰ Faltam {$hPt} para o passeio.\n\n"
            . 'Passeio: ' . $title . "\n"
            . 'Horário: ' . $time . "\n"
            . 'Ponto de encontro: ' . $point . "\n"
            . 'Pessoas na sua reserva: ' . $pax . "\n"
            . 'Inscritos no grupo: ' . $counts['total'] . '/' . $counts['max'] . "\n"
            . 'Guia: ' . $guideLine . "\n"
            . 'Leve o QR da reserva ' . $code . '.';
    }
    gcv_ops_wa_client($sale, $text, ['kind' => 'h2']);
    $email = trim((string)($sale['tourist_email'] ?? ''));
    if ($email !== '') {
        gcv_ops_mail_plain($email, gcv_inbox_title_from_body($text), $text);
    }
}

function gcv_ops_notify_guide_m15(int $excursionId): void
{
    $exc = gcv_ops_load_excursion($excursionId);
    if (!$exc || !empty($exc['notify_m15_guide_at'])) {
        return;
    }
    if (!gcv_ops_is_group_excursion($exc)) {
        return;
    }
    $cfg = gcv_ops_notify_cfg();
    if ($cfg['arrive_min'] <= 0) {
        return;
    }
    try {
        db()->prepare('UPDATE gcv_excursions SET notify_m15_guide_at = NOW() WHERE id = ? AND notify_m15_guide_at IS NULL')
            ->execute([$excursionId]);
    } catch (Throwable $e) {
        return;
    }
    $title = gcv_ops_excursion_title($exc);
    $time = substr((string)($exc['departure_time'] ?? ''), 0, 5);
    $m = gcv_ops_minutes_phrase($cfg['arrive_min'], 'pt');
    $tol = $cfg['tolerance_min'] > 0
        ? ('Tolerância de ' . gcv_ops_minutes_phrase($cfg['tolerance_min'], 'pt') . ' para atrasos (excursão).')
        : '';
    $text = "🚐 Embarque em {$m}.\n\n"
        . 'Passeio: ' . $title . "\n"
        . 'Horário previsto: ' . $time . "\n"
        . 'Ponto: ' . gcv_ops_meeting_point_text($exc) . "\n\n"
        . "Peça ao grupo para chegar com {$m} de antecedência.\n"
        . $tol . "\n\n"
        . gcv_ops_guide_qr_scan_lines();
    $guideId = (int)($exc['guide_user_id'] ?? 0);
    gcv_ops_wa_guide($guideId, $text, ['kind' => 'm15', 'excursion_id' => $excursionId]);
    $email = gcv_ops_guide_contact($guideId)['email'] ?? '';
    if ($email !== '') {
        gcv_ops_mail_plain($email, 'Embarque em ' . $m . ' — ' . $title, $text);
    }
}

function gcv_ops_notify_client_m15(array $sale, array $exc): void
{
    if (!empty($sale['notify_m15_sent_at'])) {
        return;
    }
    if (!gcv_ops_is_group_excursion($exc)) {
        return;
    }
    $cfg = gcv_ops_notify_cfg();
    if ($cfg['arrive_min'] <= 0) {
        return;
    }
    $id = (int)($sale['id'] ?? 0);
    if ($id > 0 && !gcv_ops_mark_sale_col($id, 'notify_m15_sent_at')) {
        return;
    }
    $loc = gcv_ops_sale_locale($sale);
    $guide = gcv_ops_guide_contact((int)($sale['guide_user_id'] ?? $exc['guide_user_id'] ?? 0));
    $time = substr((string)($exc['departure_time'] ?? ''), 0, 5);
    $point = gcv_ops_meeting_point_text($exc);
    $title = gcv_ops_excursion_title($exc);
    $guidePhone = gcv_ops_format_phone_display((string)($guide['phone'] ?? ''));
    $guideLine = $guide['name'] . ($guidePhone !== '' ? ' · ' . $guidePhone : '');
    $mPt = gcv_ops_minutes_phrase($cfg['arrive_min'], 'pt');
    $mEn = gcv_ops_minutes_phrase($cfg['arrive_min'], 'en');
    $mEs = gcv_ops_minutes_phrase($cfg['arrive_min'], 'es');
    $tolPt = $cfg['tolerance_min'] > 0
        ? ('Tolerância de ' . gcv_ops_minutes_phrase($cfg['tolerance_min'], 'pt') . ' para atrasos (somente em excursão).')
        : '';
    $tolEn = $cfg['tolerance_min'] > 0
        ? (gcv_ops_minutes_phrase($cfg['tolerance_min'], 'en') . ' delay tolerance for group tours.')
        : '';
    $tolEs = $cfg['tolerance_min'] > 0
        ? ('Tolerancia de ' . gcv_ops_minutes_phrase($cfg['tolerance_min'], 'es') . ' para retrasos (excursión).')
        : '';
    if ($loc === 'en') {
        $text = "🚐 Please arrive {$mEn} before departure.\n\n"
            . 'Tour: ' . $title . "\n"
            . 'Scheduled time: ' . $time . "\n"
            . 'Meeting point: ' . $point . "\n"
            . 'Guide: ' . $guideLine . "\n\n"
            . $tolEn;
    } elseif ($loc === 'es') {
        $text = "🚐 Llega {$mEs} antes de la hora prevista.\n\n"
            . 'Paseo: ' . $title . "\n"
            . 'Horario previsto: ' . $time . "\n"
            . 'Punto de encuentro: ' . $point . "\n"
            . 'Guía: ' . $guideLine . "\n\n"
            . $tolEs;
    } else {
        $text = "🚐 Chegue com {$mPt} de antecedência.\n\n"
            . 'Passeio: ' . $title . "\n"
            . 'Horário previsto: ' . $time . "\n"
            . 'Ponto de encontro: ' . $point . "\n"
            . 'Guia: ' . $guideLine . "\n\n"
            . $tolPt;
    }
    gcv_ops_wa_client($sale, $text, ['kind' => 'm15']);
    $email = trim((string)($sale['tourist_email'] ?? ''));
    if ($email !== '') {
        gcv_ops_mail_plain($email, gcv_inbox_title_from_body($text), $text);
    }
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
    $title = gcv_ops_excursion_title($exc);
    $okGuide = "✅ Presença confirmada\n\n"
        . 'Reserva: ' . $code . "\n"
        . 'Cliente: ' . $client . "\n"
        . 'Pessoas: ' . $pax . "\n"
        . 'Passeio: ' . $title;
    gcv_ops_wa_guide($guideId, $okGuide, ['kind' => 'checkin']);
    $loc = gcv_ops_sale_locale($sale);
    if ($loc === 'en') {
        $okClient = "✅ Attendance confirmed!\n\n"
            . 'Reservation: ' . $code . "\n"
            . 'Tour: ' . $title . "\n"
            . 'People: ' . $pax . "\n\n"
            . 'Have a great tour!';
    } elseif ($loc === 'es') {
        $okClient = "✅ ¡Presencia confirmada!\n\n"
            . 'Reserva: ' . $code . "\n"
            . 'Paseo: ' . $title . "\n"
            . 'Personas: ' . $pax . "\n\n"
            . '¡Buen paseo!';
    } else {
        $okClient = "✅ Presença confirmada!\n\n"
            . 'Reserva: ' . $code . "\n"
            . 'Passeio: ' . $title . "\n"
            . 'Pessoas: ' . $pax . "\n\n"
            . 'Bom passeio!';
    }
    gcv_ops_wa_client($sale, $okClient, ['kind' => 'checkin']);
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
    gcv_inbox_ensure_schema();
    $tz = new DateTimeZone('America/Sao_Paulo');
    $now = new DateTimeImmutable('now', $tz);
    $reminders = 0;
    $noshow = 0;
    $h2 = 0;
    $review = 0;

    $cfg = gcv_ops_notify_cfg();
    $lookDays = (int)max(2, ceil(max($cfg['guide_long'], $cfg['client_long'])) + 1);
    $stmt = db()->query(
        "SELECT e.id FROM gcv_excursions e
         WHERE e.deleted_at IS NULL
           AND e.status IN ('published','soldout')
           AND e.date_iso >= DATE_SUB(CURDATE(), INTERVAL 2 DAY)
           AND e.date_iso <= DATE_ADD(CURDATE(), INTERVAL {$lookDays} DAY)"
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

        $guideLongAt = $cfg['guide_long'] + 0.5;
        $guideShortAt = $cfg['guide_short'] + 0.25;
        $clientLongAt = $cfg['client_long'] + 0.5;
        $clientShortAt = $cfg['client_short'] + 0.25;
        $arriveAt = $cfg['arrive_min'] > 0 ? ($cfg['arrive_min'] / 60.0) + 0.25 : 0;

        if ($hoursToStart <= $guideLongAt && $hoursToStart >= 0 && empty($exc['notify_d12h_guide_at'])) {
            gcv_ops_notify_guide_d12h($excId);
            $reminders++;
        }
        if ($hoursToStart <= $guideShortAt && $hoursToStart >= 0 && empty($exc['notify_h2_guide_at'])) {
            gcv_ops_notify_guide_h2($excId);
            $h2++;
        }
        if ($arriveAt > 0 && $hoursToStart <= $arriveAt && $hoursToStart >= 0 && empty($exc['notify_m15_guide_at'])) {
            gcv_ops_notify_guide_m15($excId);
            $reminders++;
        }
        if ($isTourDay && $now->format('H') >= '05' && empty($exc['notify_dayof_guide_at'])) {
            gcv_ops_notify_guide_dayof($excId);
            $reminders++;
        }
        foreach ($sales as $sale) {
            if ($hoursToStart <= $clientLongAt && $hoursToStart >= 0 && empty($sale['notify_d12h_sent_at'])) {
                gcv_ops_notify_client_d12h($sale, $exc);
                $reminders++;
            }
            if ($hoursToStart <= $clientShortAt && $hoursToStart >= 0 && empty($sale['notify_h2_sent_at'])) {
                gcv_ops_notify_client_h2($sale, $exc);
                $h2++;
            }
            if ($arriveAt > 0 && $hoursToStart <= $arriveAt && $hoursToStart >= 0 && empty($sale['notify_m15_sent_at'])) {
                gcv_ops_notify_client_m15($sale, $exc);
                $reminders++;
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
            $payoutHour = 16;
            $payoutMin = 20;
            if (function_exists('gcv_payout_after_hm')) {
                [$payoutHour, $payoutMin] = gcv_payout_after_hm();
            } elseif (function_exists('gcv_payout_after_hour')) {
                $payoutHour = gcv_payout_after_hour();
            }
            $pastStart = $now >= $start;
            $nowH = (int)$now->format('G');
            $nowM = (int)$now->format('i');
            $atPayoutWindow = $isTourDay && ($nowH > $payoutHour || ($nowH === $payoutHour && $nowM >= $payoutMin));
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
