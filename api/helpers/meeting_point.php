<?php
declare(strict_types=1);

require_once __DIR__ . '/google_places.php';
require_once __DIR__ . '/meeting_points_catalog.php';

/**
 * Extrai e valida campos de ponto de encontro do body.
 *
 * @param array<string,mixed> $body
 * @return array{point:string,place_id:?string,lat:?float,lng:?float}|array{error:string}
 */
function gcv_meeting_point_from_body(array $body, bool $required = true, ?string $cityName = null): array
{
    $point = trim((string)($body['meeting_point'] ?? ''));
    $placeId = trim((string)($body['meeting_point_place_id'] ?? ''));
    if ($point === '' && $placeId === '') {
        return $required ? ['error' => 'Selecione o ponto de encontro'] : [
            'point' => '',
            'place_id' => null,
            'lat' => null,
            'lng' => null,
        ];
    }
    if ($cityName === null || $cityName === '') {
        $cityName = gcv_city_name_by_id((int)($body['departure_city_id'] ?? 0));
    }
    $match = gcv_meeting_point_match($point, $placeId !== '' ? $placeId : null, $cityName);
    if (!$match) {
        return ['error' => 'Selecione um ponto de encontro da lista desta cidade'];
    }
    return [
        'point' => $match['label_pt'],
        'place_id' => $match['id'],
        'lat' => null,
        'lng' => null,
    ];
}

function gcv_excursion_save_meeting_point(int $excursionId, string $point, ?string $placeId, $lat, $lng): void
{
    if ($excursionId <= 0) {
        return;
    }
    $latVal = is_numeric($lat) ? (float)$lat : null;
    $lngVal = is_numeric($lng) ? (float)$lng : null;
    try {
        db()->prepare(
            'UPDATE gcv_excursions SET
                meeting_point = ?,
                meeting_point_place_id = ?,
                meeting_point_lat = ?,
                meeting_point_lng = ?
             WHERE id = ?'
        )->execute([
            $point !== '' ? mb_substr($point, 0, 300) : null,
            $placeId !== null && $placeId !== '' ? mb_substr($placeId, 0, 220) : null,
            $latVal,
            $lngVal,
            $excursionId,
        ]);
    } catch (Throwable $e) {
        // fallback coluna antiga
        try {
            db()->prepare('UPDATE gcv_excursions SET meeting_point = ? WHERE id = ?')
                ->execute([$point !== '' ? mb_substr($point, 0, 300) : null, $excursionId]);
        } catch (Throwable $e2) {
            // ignore
        }
    }
}
