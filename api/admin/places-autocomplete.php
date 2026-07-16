<?php
declare(strict_types=1);

/**
 * Proxy Places Autocomplete (New) — evita expor a chave no browser se preferir.
 * GET ?q=Alto+Paraiso
 *
 * Requer GOOGLE_PLACES_API_KEY no .env (Places API / Places API New).
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';

header('Content-Type: application/json; charset=utf-8');
require_admin();

$q = trim((string)($_GET['q'] ?? ''));
if (mb_strlen($q) < 2) {
    echo json_encode(['ok' => true, 'data' => ['predictions' => []]]);
    exit;
}

$key = $_ENV['GOOGLE_PLACES_API_KEY'] ?? $_ENV['GOOGLE_MAPS_API_KEY'] ?? '';
if ($key === '') {
    http_response_code(503);
    echo json_encode([
        'ok' => false,
        'error' => 'Configure GOOGLE_PLACES_API_KEY no api/.env (Google Cloud → Places API).',
        'how' => 'https://developers.google.com/maps/documentation/places/web-service/autocomplete',
    ]);
    exit;
}

// Places API (New) autocomplete
$payload = json_encode([
    'input' => $q,
    'languageCode' => 'pt-BR',
    'includedRegionCodes' => ['br'],
], JSON_UNESCAPED_UNICODE);

$ch = curl_init('https://places.googleapis.com/v1/places:autocomplete');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-Goog-Api-Key: ' . $key,
        'X-Goog-FieldMask: suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
    ],
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_TIMEOUT => 12,
]);
$raw = curl_exec($ch);
$code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode((string)$raw, true);
if ($code >= 400 || !is_array($data)) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => 'Falha no Google Places', 'detail' => $data ?: $raw]);
    exit;
}

$out = [];
foreach (($data['suggestions'] ?? []) as $s) {
    $p = $s['placePrediction'] ?? null;
    if (!$p) continue;
    $out[] = [
        'place_id' => $p['placeId'] ?? '',
        'description' => $p['text']['text'] ?? '',
        'main_text' => $p['structuredFormat']['mainText']['text'] ?? '',
        'secondary_text' => $p['structuredFormat']['secondaryText']['text'] ?? '',
    ];
}

echo json_encode(['ok' => true, 'data' => ['predictions' => $out]]);
