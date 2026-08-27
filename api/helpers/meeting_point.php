<?php
declare(strict_types=1);

require_once __DIR__ . '/google_places.php';

/**
 * Extrai e valida campos de ponto de encontro do body.
 *
 * @param array<string,mixed> $body
 * @return array{point:string,place_id:?string,lat:?float,lng:?float}|array{error:string}
 */
function gcv_meeting_point_from_body(array $body, bool $required = true): array
{
    $point = trim((string)($body['meeting_point'] ?? ''));
    if ($point === '' && $required) {
        return ['error' => 'Ponto de encontro obrigatório'];
    }
    if (mb_strlen($point) > 300) {
        return ['error' => 'Ponto de encontro: máximo 300 caracteres'];
    }
    $placeId = trim((string)($body['meeting_point_place_id'] ?? ''));
    if ($placeId === '') {
        $placeId = null;
    }
    $lat = null;
    $lng = null;
    if (isset($body['meeting_point_lat']) && $body['meeting_point_lat'] !== '' && $body['meeting_point_lat'] !== null) {
        $lat = (float)$body['meeting_point_lat'];
        if ($lat < -90 || $lat > 90) {
            return ['error' => 'Latitude inválida'];
        }
    }
    if (isset($body['meeting_point_lng']) && $body['meeting_point_lng'] !== '' && $body['meeting_point_lng'] !== null) {
        $lng = (float)$body['meeting_point_lng'];
        if ($lng < -180 || $lng > 180) {
            return ['error' => 'Longitude inválida'];
        }
    }
    return [
        'point' => $point,
        'place_id' => $placeId,
        'lat' => $lat,
        'lng' => $lng,
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
