<?php

declare(strict_types=1);

/**
 * Stripe Checkout (cartão). A chave secreta fica só no servidor (api/.env).
 */

function gcv_stripe_secret(): string
{
    $v = $_ENV['STRIPE_SECRET_KEY'] ?? getenv('STRIPE_SECRET_KEY');
    if (!is_string($v)) {
        return '';
    }
    return trim($v);
}

/**
 * @param array<string, mixed> $fields
 * @return array{ok:bool, data?:array<string,mixed>, error?:string, http?:int}
 */
function gcv_stripe_request(string $method, string $path, array $fields = []): array
{
    $secret = gcv_stripe_secret();
    if ($secret === '' || !(str_starts_with($secret, 'sk_') || str_starts_with($secret, 'rk_'))) {
        return ['ok' => false, 'error' => 'stripe_not_configured'];
    }
    if (!function_exists('curl_init')) {
        return ['ok' => false, 'error' => 'curl_missing'];
    }

    $url = 'https://api.stripe.com' . $path;
    $ch = curl_init($url);
    if ($ch === false) {
        return ['ok' => false, 'error' => 'curl_init_failed'];
    }

    $headers = ['Authorization: Bearer ' . $secret];
    $opts = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => strtoupper($method),
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 20,
    ];
    if ($fields) {
        $query = http_build_query($fields, '', '&', PHP_QUERY_RFC3986);
        $query = str_replace(
            ['%7BCHECKOUT_SESSION_ID%7D', '%7bCHECKOUT_SESSION_ID%7d'],
            '{CHECKOUT_SESSION_ID}',
            $query
        );
        $opts[CURLOPT_POSTFIELDS] = $query;
        $headers[] = 'Content-Type: application/x-www-form-urlencoded';
        $opts[CURLOPT_HTTPHEADER] = $headers;
    }
    curl_setopt_array($ch, $opts);
    $raw = curl_exec($ch);
    $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode(is_string($raw) ? $raw : '', true);
    if (!is_array($data)) {
        return ['ok' => false, 'error' => 'stripe_bad_response', 'http' => $http];
    }
    if ($http >= 400 || isset($data['error'])) {
        $msg = 'stripe_error';
        if (is_array($data['error'] ?? null) && isset($data['error']['message'])) {
            $msg = (string) $data['error']['message'];
        }
        error_log('stripe ' . $method . ' ' . $path . ' http=' . $http . ' ' . $msg);
        return ['ok' => false, 'error' => $msg, 'http' => $http];
    }

    return ['ok' => true, 'data' => $data, 'http' => $http];
}

function gcv_stripe_origin(): string
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https');
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
    return ($https ? 'https' : 'http') . '://' . $host;
}

function gcv_stripe_safe_return_path(string $path): string
{
    $path = trim($path);
    if ($path === '' || !str_starts_with($path, '/') || str_starts_with($path, '//') || str_contains($path, '..')) {
        return '/';
    }
    return substr($path, 0, 300);
}

function gcv_stripe_clip(string $text, int $max): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $max);
    }
    return substr($text, 0, $max);
}

function gcv_stripe_locale(string $locale): string
{
    return $locale === 'en' || $locale === 'es' ? $locale : 'pt';
}

function gcv_stripe_trip_iso(array $trip): string
{
    $iso = substr(trim((string) ($trip['dateIso'] ?? $trip['dateISO'] ?? '')), 0, 10);
    if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $iso)) {
        return $iso;
    }
    $label = trim((string) ($trip['dateLabel'] ?? $trip['dateShort'] ?? ''));
    if (preg_match('/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/', $label, $m)) {
        return sprintf('%04d-%02d-%02d', (int) $m[3], (int) $m[2], (int) $m[1]);
    }
    $id = (string) ($trip['cartId'] ?? $trip['id'] ?? '');
    if (preg_match('/(20\d{2}-\d{2}-\d{2})/', $id, $m)) {
        return $m[1];
    }
    return '';
}

function gcv_stripe_trip_date(array $trip): string
{
    $label = trim((string) ($trip['dateLabel'] ?? $trip['dateShort'] ?? ''));
    if (preg_match('/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/', $label, $m)) {
        return sprintf('%02d/%02d/%04d', (int) $m[1], (int) $m[2], (int) $m[3]);
    }
    $iso = gcv_stripe_trip_iso($trip);
    if ($iso === '') {
        return '';
    }
    return substr($iso, 8, 2) . '/' . substr($iso, 5, 2) . '/' . substr($iso, 0, 4);
}

function gcv_stripe_weekday(string $iso, string $locale): string
{
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $iso)) {
        return '';
    }
    $dt = DateTimeImmutable::createFromFormat('!Y-m-d', $iso, new DateTimeZone('America/Sao_Paulo'));
    if (!$dt) {
        return '';
    }
    $names = [
        'pt' => ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
        'en' => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        'es' => ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    ];
    $loc = gcv_stripe_locale($locale);
    return $names[$loc][(int) $dt->format('w')] ?? '';
}

function gcv_stripe_trip_people(array $trip): int
{
    $pessoas = (int) ($trip['pessoas'] ?? 0);
    if ($pessoas > 0) {
        return $pessoas;
    }
    $qty = (int) ($trip['qty'] ?? 0);
    return $qty > 0 ? $qty : 0;
}

/** @return bool|null */
function gcv_stripe_trip_transport(array $trip)
{
    if (array_key_exists('comTransporte', $trip)) {
        $v = $trip['comTransporte'];
        if ($v === true || $v === 1 || $v === '1' || $v === 'true') {
            return true;
        }
        if ($v === false || $v === 0 || $v === '0' || $v === 'false') {
            return false;
        }
    }
    $id = (string) ($trip['cartId'] ?? $trip['id'] ?? '');
    if (preg_match('/-(t|s)(?:-bi-(?:en|es))?$/', $id, $m)) {
        return $m[1] === 't';
    }
    return null;
}

function gcv_stripe_trip_lang(array $trip): string
{
    $code = strtolower(trim((string) ($trip['guiaIdioma'] ?? $trip['idiomaGuia'] ?? '')));
    if (in_array($code, ['pt', 'en', 'es'], true)) {
        return $code;
    }
    $id = (string) ($trip['cartId'] ?? $trip['id'] ?? '');
    if (preg_match('/-bi-(en|es)$/', $id, $m)) {
        return $m[1];
    }
    if (str_starts_with($id, 'roteiro-')) {
        return 'pt';
    }
    return '';
}

function gcv_stripe_trip_mode(array $trip): string
{
    $mode = strtolower(trim((string) ($trip['modalidade'] ?? '')));
    if ($mode === 'excursao' || $mode === 'exclusivo') {
        return $mode;
    }
    $id = (string) ($trip['cartId'] ?? $trip['id'] ?? '');
    if (str_contains($id, '-exclusivo-')) {
        return 'exclusivo';
    }
    if (str_contains($id, '-excursao-')) {
        return 'excursao';
    }
    return '';
}

function gcv_stripe_trip_description(array $trip, string $locale): string
{
    $loc = gcv_stripe_locale($locale);
    $copy = [
        'pt' => [
            'person' => 'pessoa', 'people' => 'pessoas',
            'with' => 'Com translado', 'without' => 'Sem translado',
            'from' => 'Saindo de ', 'date' => 'Data: ', 'day' => 'Dia: ',
            'lang' => 'Idioma do guia: ', 'group' => 'Excursão', 'private' => 'Privativo',
        ],
        'en' => [
            'person' => 'person', 'people' => 'people',
            'with' => 'With transfer', 'without' => 'Without transfer',
            'from' => 'Leaving from ', 'date' => 'Date: ', 'day' => 'Day: ',
            'lang' => 'Guide language: ', 'group' => 'Group', 'private' => 'Private',
        ],
        'es' => [
            'person' => 'persona', 'people' => 'personas',
            'with' => 'Con traslado', 'without' => 'Sin traslado',
            'from' => 'Saliendo de ', 'date' => 'Fecha: ', 'day' => 'Día: ',
            'lang' => 'Idioma del guía: ', 'group' => 'En grupo', 'private' => 'Privado',
        ],
    ];
    $langs = [
        'pt' => ['pt' => 'Português', 'en' => 'Inglês', 'es' => 'Espanhol'],
        'en' => ['pt' => 'Portuguese', 'en' => 'English', 'es' => 'Spanish'],
        'es' => ['pt' => 'Portugués', 'en' => 'Inglés', 'es' => 'Español'],
    ];
    $c = $copy[$loc];
    $bits = [];
    $people = gcv_stripe_trip_people($trip);
    if ($people > 0) {
        $bits[] = $people . ' ' . ($people === 1 ? $c['person'] : $c['people']);
    }
    $ride = gcv_stripe_trip_transport($trip);
    if ($ride !== null) {
        $bits[] = $ride ? $c['with'] : $c['without'];
    }
    $city = trim((string) ($trip['embarque'] ?? ''));
    if ($city !== '') {
        $bits[] = $c['from'] . $city;
    }
    $date = gcv_stripe_trip_date($trip);
    if ($date !== '') {
        $bits[] = $c['date'] . $date;
    }
    $day = gcv_stripe_weekday(gcv_stripe_trip_iso($trip), $loc);
    if ($day !== '') {
        $bits[] = $c['day'] . $day;
    }
    $lang = gcv_stripe_trip_lang($trip);
    if ($lang !== '' && isset($langs[$loc][$lang])) {
        $bits[] = $c['lang'] . $langs[$loc][$lang];
    }
    $mode = gcv_stripe_trip_mode($trip);
    if ($mode === 'exclusivo') {
        $bits[] = $c['private'];
    } elseif ($mode === 'excursao') {
        $bits[] = $c['group'];
    }
    return gcv_stripe_clip(implode(' · ', $bits), 500);
}

function gcv_stripe_item_name(array $trip, string $reservationId): string
{
    $dest = trim((string) ($trip['destino'] ?? $trip['title'] ?? ''));
    if ($dest === '') {
        $dest = 'Passeio Guia Chapada Veadeiros';
    }
    return gcv_stripe_clip($dest . ' (' . $reservationId . ')', 250);
}

function gcv_stripe_trip_cents(array $trip): int
{
    $unit = (int) ($trip['valorUnit'] ?? 0);
    $qty = (int) ($trip['qty'] ?? 0);
    if ($unit > 0 && $qty > 0) {
        return $unit * $qty * 100;
    }
    return 0;
}

/**
 * Um item do Stripe por passeio. A descrição leva pessoas, translado, cidade,
 * data, dia e idioma do guia. Nome e telefone do guia não entram.
 *
 * @return list<array<string, mixed>>
 */
function gcv_stripe_line_items(array $data, string $reservationId, int $cents, string $locale, string $currency = 'brl'): array
{
    $currency = strtolower($currency) === 'usd' ? 'usd' : 'brl';
    $trips = [];
    foreach (is_array($data['trips'] ?? null) ? $data['trips'] : [] as $trip) {
        if (is_array($trip)) {
            $trips[] = $trip;
        }
    }
    if (!$trips) {
        $trips = [[]];
    }

    $amounts = array_map('gcv_stripe_trip_cents', $trips);
    $sum = array_sum($amounts);
    $split = count($trips) > 1 && $sum > 0;
    if ($split && $sum !== $cents) {
        $running = 0;
        $last = count($amounts) - 1;
        for ($i = 0; $i < $last; $i++) {
            $amounts[$i] = (int) round($amounts[$i] * $cents / $sum);
            $running += $amounts[$i];
        }
        $amounts[$last] = $cents - $running;
    }
    if ($split && min($amounts) < 1) {
        $split = false;
    }

    $product = static function (array $trip, string $description) use ($reservationId): array {
        $row = ['name' => gcv_stripe_item_name($trip, $reservationId)];
        if ($description !== '') {
            $row['description'] = $description;
        }
        return $row;
    };

    if (!$split) {
        $parts = [];
        foreach ($trips as $trip) {
            $desc = gcv_stripe_trip_description($trip, $locale);
            $title = trim((string) ($trip['destino'] ?? $trip['title'] ?? ''));
            if (count($trips) > 1 && $title !== '') {
                $desc = $title . ($desc !== '' ? ' · ' . $desc : '');
            }
            if ($desc !== '') {
                $parts[] = $desc;
            }
        }
        return [[
            'quantity' => 1,
            'price_data' => [
                'currency' => $currency,
                'unit_amount' => $cents,
                'product_data' => $product($trips[0], gcv_stripe_clip(implode(' | ', $parts), 500)),
            ],
        ]];
    }

    $items = [];
    foreach ($trips as $i => $trip) {
        $items[] = [
            'quantity' => 1,
            'price_data' => [
                'currency' => $currency,
                'unit_amount' => $amounts[$i],
                'product_data' => $product($trip, gcv_stripe_trip_description($trip, $locale)),
            ],
        ];
    }
    return $items;
}

function gcv_stripe_product_name(array $data, string $reservationId): string
{
    $trips = is_array($data['trips'] ?? null) ? $data['trips'] : [];
    $first = [];
    foreach ($trips as $trip) {
        if (is_array($trip)) {
            $first = $trip;
            break;
        }
    }
    return gcv_stripe_item_name($first, $reservationId);
}
