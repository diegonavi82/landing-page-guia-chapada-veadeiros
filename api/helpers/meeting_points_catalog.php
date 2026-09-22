<?php
declare(strict_types=1);

/**
 * Pontos de encontro oficiais por cidade de saída.
 *
 * @return list<array{id:string,city:string,label_pt:string,label_en:string,label_es:string,maps_url:string}>
 */
function gcv_meeting_points_catalog(): array
{
    return [
        [
            'id' => 'alto-paraiso-cat',
            'city' => 'alto_paraiso',
            'label_pt' => 'CAT — Centro de Atendimento ao Turista',
            'label_en' => 'CAT — Tourist Information Center',
            'label_es' => 'CAT — Centro de Atención al Turista',
            'maps_url' => 'https://maps.app.goo.gl/quazQXB8qUs3TFCQ9',
        ],
        [
            'id' => 'alto-paraiso-quintal-maria',
            'city' => 'alto_paraiso',
            'label_pt' => 'Padaria Quintal de Maria',
            'label_en' => 'Padaria Quintal de Maria',
            'label_es' => 'Padaria Quintal de Maria',
            'maps_url' => 'https://maps.app.goo.gl/xFKx1HUzN8kqBdFE7',
        ],
        [
            'id' => 'alto-paraiso-santa-maria',
            'city' => 'alto_paraiso',
            'label_pt' => 'Padaria Santa Maria, Rodoviária',
            'label_en' => 'Santa Maria Bakery, Bus Station',
            'label_es' => 'Panadería Santa Maria, Rodoviaria',
            'maps_url' => 'https://maps.app.goo.gl/eBT1rehvkYZa9Ui57',
        ],
        [
            'id' => 'alto-paraiso-sol-chapada',
            'city' => 'alto_paraiso',
            'label_pt' => 'Sol da Chapada (Arco Disco Voador)',
            'label_en' => 'Sol da Chapada (Flying Saucer Arch)',
            'label_es' => 'Sol da Chapada (Arco Disco Volador)',
            'maps_url' => 'https://maps.app.goo.gl/tfgThzVMtKRmU5yu6',
        ],
        [
            'id' => 'cavalcante-cat',
            'city' => 'cavalcante',
            'label_pt' => 'CAT — Centro de Atendimento ao Turista',
            'label_en' => 'CAT — Tourist Information Center',
            'label_es' => 'CAT — Centro de Atención al Turista',
            'maps_url' => 'https://maps.app.goo.gl/LHWVrMersNPqhk3n8',
        ],
        [
            'id' => 'cavalcante-cafe-delicias',
            'city' => 'cavalcante',
            'label_pt' => 'Padaria Café com Delícias',
            'label_en' => 'Padaria Café com Delícias',
            'label_es' => 'Padaria Café com Delícias',
            'maps_url' => 'https://maps.app.goo.gl/EfK5qGQTgApPjT9BA',
        ],
        [
            'id' => 'cavalcante-requinte',
            'city' => 'cavalcante',
            'label_pt' => 'Padaria e Confeitaria Requinte',
            'label_en' => 'Padaria e Confeitaria Requinte',
            'label_es' => 'Padaria e Confeitaria Requinte',
            'maps_url' => 'https://maps.app.goo.gl/QgVXbPogsDsEGvfr6',
        ],
        [
            'id' => 'sao-jorge-cat',
            'city' => 'sao_jorge',
            'label_pt' => 'CAT — Centro de Atendimento ao Turista',
            'label_en' => 'CAT — Tourist Information Center',
            'label_es' => 'CAT — Centro de Atención al Turista',
            'maps_url' => 'https://maps.app.goo.gl/EcjHSBkyFnFsEfWB9',
        ],
        [
            'id' => 'sao-jorge-cafe-brigadeiro',
            'city' => 'sao_jorge',
            'label_pt' => 'Café com Brigadeiro',
            'label_en' => 'Café com Brigadeiro',
            'label_es' => 'Café com Brigadeiro',
            'maps_url' => 'https://maps.app.goo.gl/amSXK9LL2NBy7yLe8',
        ],
        [
            'id' => 'sao-jorge-casa-delicias',
            'city' => 'sao_jorge',
            'label_pt' => 'Casa de Delícias Café da Manhã',
            'label_en' => 'Casa de Delícias Breakfast',
            'label_es' => 'Casa de Delícias Desayuno',
            'maps_url' => 'https://maps.app.goo.gl/UnAz3mw38XMZQY6M9',
        ],
        [
            'id' => 'sao-jorge-tapioca',
            'city' => 'sao_jorge',
            'label_pt' => 'Tapioca do Cerrado',
            'label_en' => 'Tapioca do Cerrado',
            'label_es' => 'Tapioca do Cerrado',
            'maps_url' => 'https://maps.app.goo.gl/Ey3w8RqhoERwbdAr8',
        ],
    ];
}

function gcv_meeting_norm(string $raw): string
{
    $s = trim(mb_strtolower($raw));
    if (class_exists('Normalizer')) {
        $n = Normalizer::normalize($s, Normalizer::FORM_D);
        if (is_string($n)) {
            $s = $n;
        }
    } elseif (function_exists('iconv')) {
        $n = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
        if (is_string($n) && $n !== '') {
            $s = $n;
        }
    }
    $s = preg_replace('/[^a-z0-9]+/', '', $s) ?? '';
    return $s;
}

function gcv_meeting_city_key(string $name): string
{
    $n = gcv_meeting_norm($name);
    if ($n === '') {
        return '';
    }
    if (str_contains($n, 'cavalcante')) {
        return 'cavalcante';
    }
    if (str_contains($n, 'saojorge') || str_contains($n, 'vilasaojorge')) {
        return 'sao_jorge';
    }
    if (str_contains($n, 'altoparaiso')) {
        return 'alto_paraiso';
    }
    return '';
}

function gcv_meeting_point_by_id(string $id): ?array
{
    $id = trim($id);
    if ($id === '') {
        return null;
    }
    foreach (gcv_meeting_points_catalog() as $row) {
        if ($row['id'] === $id) {
            return $row;
        }
    }
    return null;
}

function gcv_meeting_point_label(array $row, string $lang = 'pt'): string
{
    $lang = in_array($lang, ['pt', 'en', 'es'], true) ? $lang : 'pt';
    $key = 'label_' . $lang;
    $label = trim((string)($row[$key] ?? ''));
    return $label !== '' ? $label : (string)$row['label_pt'];
}

function gcv_city_name_by_id(int $cityId): string
{
    if ($cityId <= 0 || !function_exists('db')) {
        return '';
    }
    static $cache = [];
    if (array_key_exists($cityId, $cache)) {
        return $cache[$cityId];
    }
    try {
        $st = db()->prepare('SELECT name FROM gcv_cities WHERE id = ?');
        $st->execute([$cityId]);
        $cache[$cityId] = trim((string)($st->fetchColumn() ?: ''));
    } catch (Throwable $e) {
        $cache[$cityId] = '';
    }
    return $cache[$cityId];
}

function gcv_meeting_point_match(string $point, ?string $placeId, ?string $cityName = null): ?array
{
    $cityKey = $cityName ? gcv_meeting_city_key($cityName) : '';
    $placeId = trim((string)$placeId);
    if ($placeId !== '') {
        $row = gcv_meeting_point_by_id($placeId);
        if ($row && ($cityKey === '' || $row['city'] === $cityKey)) {
            return $row;
        }
    }
    $norm = gcv_meeting_norm($point);
    if ($norm === '') {
        return null;
    }
    foreach (gcv_meeting_points_catalog() as $row) {
        if ($cityKey !== '' && $row['city'] !== $cityKey) {
            continue;
        }
        $aliases = [
            $row['label_pt'],
            $row['label_en'],
            $row['label_es'],
            $row['id'],
        ];
        if ($row['id'] === 'alto-paraiso-quintal-maria') {
            $aliases[] = 'Pararia Quintal de Maria';
        }
        foreach ($aliases as $alias) {
            if (gcv_meeting_norm((string)$alias) === $norm) {
                return $row;
            }
        }
    }
    return null;
}

function gcv_meeting_point_public(?string $placeId, string $fallback, string $lang = 'pt'): array
{
    $row = $placeId ? gcv_meeting_point_by_id($placeId) : null;
    if (!$row) {
        $row = gcv_meeting_point_match($fallback, $placeId);
    }
    if (!$row) {
        return [
            'label' => $fallback,
            'maps_url' => '',
            'id' => '',
        ];
    }
    return [
        'label' => gcv_meeting_point_label($row, $lang),
        'maps_url' => (string)$row['maps_url'],
        'id' => (string)$row['id'],
    ];
}
