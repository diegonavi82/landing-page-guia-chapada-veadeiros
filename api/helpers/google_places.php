<?php
declare(strict_types=1);

/**
 * Google Places API (New) — autocomplete + detalhes (lat/lng).
 */

function gcv_google_places_api_key(): string
{
    $places = trim((string)($_ENV['GOOGLE_PLACES_API_KEY'] ?? getenv('GOOGLE_PLACES_API_KEY') ?: ''));
    if ($places !== '') {
        return $places;
    }
    return trim((string)($_ENV['GOOGLE_MAPS_API_KEY'] ?? getenv('GOOGLE_MAPS_API_KEY') ?: ''));
}

/**
 * Centro + raio para viés do Places (Chapada inteira, ou cidade de saída).
 *
 * @return array{lat:float,lng:float,radius:float}
 */
function gcv_places_bias_for_city(?string $cityName, ?float $lat = null, ?float $lng = null): array
{
    if ($lat !== null && $lng !== null) {
        return ['lat' => $lat, 'lng' => $lng, 'radius' => 28000.0];
    }
    $n = mb_strtolower(trim((string)$cityName));
    $n = str_replace(
        ['á', 'à', 'ã', 'â', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú', 'ç', '’', '´'],
        ['a', 'a', 'a', 'a', 'e', 'e', 'i', 'o', 'o', 'o', 'u', 'c', "'", "'"],
        $n
    );
    $map = [
        'alto paraiso' => [-14.1328, -47.5100, 22000.0],
        'sao jorge' => [-14.1835, -47.8090, 18000.0],
        'cavalcante' => [-13.7975, -47.4567, 25000.0],
        'teresina' => [-13.7720, -47.2658, 25000.0],
        'sao joao' => [-14.7058, -47.5247, 25000.0],
    ];
    foreach ($map as $needle => $c) {
        if ($n !== '' && str_contains($n, $needle)) {
            return ['lat' => $c[0], 'lng' => $c[1], 'radius' => $c[2]];
        }
    }
    // Sem cidade: cobre Teresina (norte) até São João d'Aliança (sul)
    return ['lat' => -14.15, 'lng' => -47.48, 'radius' => 120000.0];
}

/**
 * @param array{lat?:float,lng?:float,radius?:float,city?:string}|null $bias
 * @return array{ok:bool,predictions?:list<array<string,string>>,error?:string,detail?:mixed}
 */
function gcv_places_autocomplete(string $query, string $language = 'pt-BR', ?array $bias = null): array
{
    $q = trim($query);
    if (mb_strlen($q) < 2) {
        return ['ok' => true, 'predictions' => []];
    }
    $key = gcv_google_places_api_key();
    if ($key === '') {
        return gcv_nominatim_autocomplete($q, $bias);
    }

    $resolved = gcv_places_bias_for_city(
        isset($bias['city']) ? (string)$bias['city'] : null,
        isset($bias['lat']) && $bias['lat'] !== null ? (float)$bias['lat'] : null,
        isset($bias['lng']) && $bias['lng'] !== null ? (float)$bias['lng'] : null
    );
    $payload = [
        'input' => $q,
        'languageCode' => $language,
        'includedRegionCodes' => ['br'],
        'locationBias' => [
            'circle' => [
                'center' => ['latitude' => $resolved['lat'], 'longitude' => $resolved['lng']],
                'radius' => $resolved['radius'],
            ],
        ],
    ];

    $ch = curl_init('https://places.googleapis.com/v1/places:autocomplete');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-Goog-Api-Key: ' . $key,
            'X-Goog-FieldMask: suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 12,
    ]);
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode((string)$raw, true);
    if ($code >= 400 || !is_array($data)) {
        return gcv_nominatim_autocomplete($q, $bias);
    }

    $out = [];
    foreach (($data['suggestions'] ?? []) as $s) {
        $p = $s['placePrediction'] ?? null;
        if (!$p) {
            continue;
        }
        $out[] = [
            'place_id' => (string)($p['placeId'] ?? ''),
            'description' => (string)($p['text']['text'] ?? ''),
            'main_text' => (string)($p['structuredFormat']['mainText']['text'] ?? ''),
            'secondary_text' => (string)($p['structuredFormat']['secondaryText']['text'] ?? ''),
        ];
    }
    $cityHint = is_array($bias) ? trim((string)($bias['city'] ?? '')) : '';
    if ($out === [] && $cityHint !== '' && !str_contains(mb_strtolower($q), mb_strtolower($cityHint))) {
        $payload['input'] = $q . ', ' . $cityHint . ', Goiás';
        $ch = curl_init('https://places.googleapis.com/v1/places:autocomplete');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-Goog-Api-Key: ' . $key,
                'X-Goog-FieldMask: suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
            CURLOPT_TIMEOUT => 12,
        ]);
        $raw = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $data = json_decode((string)$raw, true);
        if ($code < 400 && is_array($data)) {
            foreach (($data['suggestions'] ?? []) as $s) {
                $p = $s['placePrediction'] ?? null;
                if (!$p) {
                    continue;
                }
                $out[] = [
                    'place_id' => (string)($p['placeId'] ?? ''),
                    'description' => (string)($p['text']['text'] ?? ''),
                    'main_text' => (string)($p['structuredFormat']['mainText']['text'] ?? ''),
                    'secondary_text' => (string)($p['structuredFormat']['secondaryText']['text'] ?? ''),
                ];
            }
        }
    }
    if ($out === []) {
        $nom = gcv_nominatim_autocomplete($q, $bias);
        if (!empty($nom['predictions'])) {
            return $nom;
        }
    }
    return ['ok' => true, 'predictions' => $out];
}

/**
 * @return array{ok:bool,place?:array<string,mixed>,error?:string,detail?:mixed}
 */
function gcv_places_details(string $placeId, string $language = 'pt-BR'): array
{
    $placeId = trim($placeId);
    if ($placeId === '') {
        return ['ok' => false, 'error' => 'place_id obrigatório'];
    }
    if (str_starts_with($placeId, 'osm:')) {
        return gcv_nominatim_details($placeId);
    }
    // Autocomplete às vezes devolve "places/ChIJ..."
    if (str_starts_with($placeId, 'places/')) {
        $placeId = substr($placeId, 7);
    }
    $key = gcv_google_places_api_key();
    if ($key === '') {
        return ['ok' => false, 'error' => 'Local sem detalhes. Escolha uma sugestão da lista.'];
    }

    $url = 'https://places.googleapis.com/v1/places/' . rawurlencode($placeId)
        . '?languageCode=' . rawurlencode($language);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'X-Goog-Api-Key: ' . $key,
            'X-Goog-FieldMask: id,displayName,formattedAddress,location,googleMapsUri',
        ],
        CURLOPT_TIMEOUT => 12,
    ]);
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode((string)$raw, true);
    if ($code >= 400 || !is_array($data)) {
        return ['ok' => false, 'error' => 'Falha ao buscar local no Google', 'detail' => $data ?: $raw];
    }

    $lat = isset($data['location']['latitude']) ? (float)$data['location']['latitude'] : null;
    $lng = isset($data['location']['longitude']) ? (float)$data['location']['longitude'] : null;
    $name = trim((string)($data['displayName']['text'] ?? ''));
    $addr = trim((string)($data['formattedAddress'] ?? ''));
    $maps = trim((string)($data['googleMapsUri'] ?? ''));
    if ($maps === '' && $lat !== null && $lng !== null) {
        $maps = 'https://www.google.com/maps?q=' . rawurlencode($lat . ',' . $lng);
    }

    return [
        'ok' => true,
        'place' => [
            'place_id' => 'places/' . $placeId,
            'name' => $name,
            'formatted_address' => $addr,
            'label' => $name !== '' ? ($addr !== '' ? ($name . ' — ' . $addr) : $name) : $addr,
            'lat' => $lat,
            'lng' => $lng,
            'maps_url' => $maps,
        ],
    ];
}

function gcv_nominatim_http(string $url): ?array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 12,
        CURLOPT_USERAGENT => 'GuiaChapadaVeadeiros/1.0 (contato@guiachapadaveadeiros.com)',
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
        ],
    ]);
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code >= 400 || !is_string($raw) || $raw === '') {
        return null;
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function gcv_nominatim_place_from_row(array $row, ?string $forcedId = null): array
{
    $lat = isset($row['lat']) ? (float)$row['lat'] : null;
    $lng = isset($row['lon']) ? (float)$row['lon'] : null;
    $osmType = strtolower(trim((string)($row['osm_type'] ?? '')));
    $osmId = trim((string)($row['osm_id'] ?? ''));
    $placeId = $forcedId;
    if ($placeId === null || $placeId === '') {
        $placeId = ($osmType !== '' && $osmId !== '') ? ('osm:' . $osmType . '/' . $osmId) : '';
    }
    $display = trim((string)($row['display_name'] ?? ''));
    $name = trim((string)($row['name'] ?? ''));
    $details = is_array($row['namedetails'] ?? null) ? $row['namedetails'] : [];
    if ($name === '') {
        $name = trim((string)($details['name'] ?? ''));
    }
    if ($name === '' && $display !== '') {
        $name = trim(explode(',', $display)[0]);
    }
    $maps = ($lat !== null && $lng !== null)
        ? ('https://www.google.com/maps?q=' . rawurlencode($lat . ',' . $lng))
        : '';
    return [
        'place_id' => $placeId,
        'name' => $name,
        'formatted_address' => $display,
        'label' => $name !== '' ? $name : $display,
        'lat' => $lat,
        'lng' => $lng,
        'maps_url' => $maps,
    ];
}

/**
 * @param array{lat?:float,lng?:float,radius?:float,city?:string}|null $bias
 * @return array{ok:bool,predictions:list<array<string,mixed>>}
 */
function gcv_nominatim_autocomplete(string $query, ?array $bias = null): array
{
    $resolved = gcv_places_bias_for_city(
        isset($bias['city']) ? (string)$bias['city'] : null,
        isset($bias['lat']) && $bias['lat'] !== null ? (float)$bias['lat'] : null,
        isset($bias['lng']) && $bias['lng'] !== null ? (float)$bias['lng'] : null
    );
    $deg = max(0.12, ((float)$resolved['radius']) / 111000.0);
    $left = $resolved['lng'] - $deg;
    $right = $resolved['lng'] + $deg;
    $top = $resolved['lat'] + $deg;
    $bottom = $resolved['lat'] - $deg;
    $url = 'https://nominatim.openstreetmap.org/search?' . http_build_query([
        'q' => $query,
        'format' => 'jsonv2',
        'addressdetails' => 0,
        'limit' => 8,
        'countrycodes' => 'br',
        'accept-language' => 'pt-BR',
        'viewbox' => $left . ',' . $top . ',' . $right . ',' . $bottom,
        'bounded' => 0,
    ], '', '&', PHP_QUERY_RFC3986);
    $rows = gcv_nominatim_http($url);
    if (!is_array($rows) || isset($rows['error'])) {
        return ['ok' => true, 'predictions' => []];
    }
    $out = [];
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $place = gcv_nominatim_place_from_row($row);
        if ($place['place_id'] === '' && $place['lat'] === null) {
            continue;
        }
        $out[] = [
            'place_id' => $place['place_id'],
            'description' => $place['formatted_address'] !== '' ? $place['formatted_address'] : $place['name'],
            'main_text' => $place['name'],
            'secondary_text' => $place['formatted_address'],
            'lat' => $place['lat'],
            'lng' => $place['lng'],
            'maps_url' => $place['maps_url'],
        ];
    }
    return ['ok' => true, 'predictions' => $out];
}

function gcv_nominatim_details(string $placeId): array
{
    $id = trim($placeId);
    if (str_starts_with($id, 'osm:')) {
        $id = substr($id, 4);
    }
    $parts = explode('/', $id, 2);
    if (count($parts) !== 2 || $parts[1] === '') {
        return ['ok' => false, 'error' => 'place_id inválido'];
    }
    $letter = strtoupper(substr($parts[0], 0, 1));
    if (!in_array($letter, ['N', 'W', 'R'], true)) {
        return ['ok' => false, 'error' => 'place_id inválido'];
    }
    $osmId = preg_replace('/\D+/', '', $parts[1]) ?? '';
    if ($osmId === '') {
        return ['ok' => false, 'error' => 'place_id inválido'];
    }
    $url = 'https://nominatim.openstreetmap.org/lookup?' . http_build_query([
        'osm_ids' => $letter . $osmId,
        'format' => 'jsonv2',
        'accept-language' => 'pt-BR',
    ], '', '&', PHP_QUERY_RFC3986);
    $rows = gcv_nominatim_http($url);
    if (!is_array($rows) || empty($rows[0]) || !is_array($rows[0])) {
        return ['ok' => false, 'error' => 'Local não encontrado'];
    }
    return ['ok' => true, 'place' => gcv_nominatim_place_from_row($rows[0], 'osm:' . strtolower($parts[0]) . '/' . $osmId)];
}

/**
 * @return array{ok:bool,place?:array<string,mixed>,error?:string}
 */
function gcv_places_reverse(float $lat, float $lng): array
{
    if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
        return ['ok' => false, 'error' => 'Coordenadas inválidas'];
    }
    $url = 'https://nominatim.openstreetmap.org/reverse?' . http_build_query([
        'lat' => $lat,
        'lon' => $lng,
        'format' => 'jsonv2',
        'zoom' => 18,
        'addressdetails' => 1,
        'accept-language' => 'pt-BR',
    ], '', '&', PHP_QUERY_RFC3986);
    $row = gcv_nominatim_http($url);
    if (!is_array($row) || (isset($row['error']) && !isset($row['lat']))) {
        $maps = 'https://www.google.com/maps?q=' . rawurlencode($lat . ',' . $lng);
        return [
            'ok' => true,
            'place' => [
                'place_id' => '',
                'name' => 'Minha localização',
                'formatted_address' => '',
                'label' => 'Minha localização',
                'lat' => $lat,
                'lng' => $lng,
                'maps_url' => $maps,
            ],
        ];
    }
    $place = gcv_nominatim_place_from_row($row);
    $place['lat'] = $lat;
    $place['lng'] = $lng;
    if ($place['maps_url'] === '') {
        $place['maps_url'] = 'https://www.google.com/maps?q=' . rawurlencode($lat . ',' . $lng);
    }
    if ($place['label'] === '') {
        $place['label'] = 'Minha localização';
        $place['name'] = 'Minha localização';
    }
    return ['ok' => true, 'place' => $place];
}

/**
 * Text Search (New) — útil para seed/geocode por nome.
 *
 * @return array{ok:bool,place?:array<string,mixed>,error?:string}
 */
function gcv_places_text_search(string $textQuery, string $language = 'pt-BR'): array
{
    $q = trim($textQuery);
    if ($q === '') {
        return ['ok' => false, 'error' => 'query vazia'];
    }
    $key = gcv_google_places_api_key();
    if ($key === '') {
        return ['ok' => false, 'error' => 'GOOGLE_PLACES_API_KEY ausente'];
    }

    $payload = [
        'textQuery' => $q,
        'languageCode' => $language,
        'regionCode' => 'BR',
        'locationBias' => [
            'circle' => [
                'center' => ['latitude' => -14.15, 'longitude' => -47.48],
                'radius' => 120000.0,
            ],
        ],
        'pageSize' => 1,
    ];
    $ch = curl_init('https://places.googleapis.com/v1/places:searchText');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-Goog-Api-Key: ' . $key,
            'X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri',
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 15,
    ]);
    $raw = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = json_decode((string)$raw, true);
    if ($code >= 400 || !is_array($data) || empty($data['places'][0])) {
        return ['ok' => false, 'error' => 'Local não encontrado', 'detail' => $data ?: $raw];
    }
    $p = $data['places'][0];
    $id = (string)($p['id'] ?? '');
    if ($id !== '' && !str_starts_with($id, 'places/')) {
        $id = 'places/' . $id;
    }
    $lat = isset($p['location']['latitude']) ? (float)$p['location']['latitude'] : null;
    $lng = isset($p['location']['longitude']) ? (float)$p['location']['longitude'] : null;
    $name = trim((string)($p['displayName']['text'] ?? ''));
    $addr = trim((string)($p['formattedAddress'] ?? ''));
    $maps = trim((string)($p['googleMapsUri'] ?? ''));
    if ($maps === '' && $lat !== null && $lng !== null) {
        $maps = 'https://www.google.com/maps?q=' . rawurlencode($lat . ',' . $lng);
    }
    return [
        'ok' => true,
        'place' => [
            'place_id' => $id,
            'name' => $name,
            'formatted_address' => $addr,
            'label' => $name !== '' ? $name : $addr,
            'lat' => $lat,
            'lng' => $lng,
            'maps_url' => $maps,
        ],
    ];
}

function gcv_maps_url_from_meeting(?string $label, $lat, $lng, ?string $placeId = null): string
{
    $latF = is_numeric($lat) ? (float)$lat : null;
    $lngF = is_numeric($lng) ? (float)$lng : null;
    if ($latF !== null && $lngF !== null) {
        return 'https://www.google.com/maps?q=' . rawurlencode($latF . ',' . $lngF);
    }
    $pid = trim((string)$placeId);
    if ($pid !== '') {
        if (str_starts_with($pid, 'places/')) {
            $pid = substr($pid, 7);
        }
        return 'https://www.google.com/maps/search/?api=1&query_place_id=' . rawurlencode($pid);
    }
    $label = trim((string)$label);
    if ($label !== '') {
        return 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode($label);
    }
    return '';
}
