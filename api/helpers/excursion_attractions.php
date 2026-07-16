<?php
declare(strict_types=1);

/**
 * Helpers: 1 a 4 atrativos por excursão (gcv_excursion_attractions).
 * gcv_excursions.attraction_id permanece como o primeiro (compatível com APIs antigas).
 */

function gcv_excursion_normalize_attraction_ids(array $body): array
{
    $ids = [];
    if (isset($body['attraction_ids']) && is_array($body['attraction_ids'])) {
        foreach ($body['attraction_ids'] as $raw) {
            $id = (int)$raw;
            if ($id > 0 && !in_array($id, $ids, true)) {
                $ids[] = $id;
            }
        }
    } elseif (!empty($body['attraction_id'])) {
        $ids[] = (int)$body['attraction_id'];
    }
    return array_slice($ids, 0, 4);
}

function gcv_excursion_validate_attraction_ids(array $ids): ?string
{
    $n = count($ids);
    if ($n < 1) {
        return 'Selecione pelo menos 1 atrativo';
    }
    if ($n > 4) {
        return 'No máximo 4 atrativos por dia';
    }
    return null;
}

/** @return list<array{id:int,title_pt:?string,slug:?string,cover_url:?string,sort_order:int}> */
function gcv_excursion_load_attractions(int $excursionId): array
{
    $stmt = db()->prepare(
        'SELECT a.id, a.title_pt, a.title_en, a.title_es, a.slug, a.cover_url, a.entry_price_cents, x.sort_order
         FROM gcv_excursion_attractions x
         INNER JOIN gcv_attractions a ON a.id = x.attraction_id
         WHERE x.excursion_id = ?
         ORDER BY x.sort_order ASC, a.title_pt ASC'
    );
    $stmt->execute([$excursionId]);
    $rows = $stmt->fetchAll();
    if ($rows) {
        return $rows;
    }
    // Fallback legado
    $stmt = db()->prepare(
        'SELECT a.id, a.title_pt, a.title_en, a.title_es, a.slug, a.cover_url, a.entry_price_cents, 0 AS sort_order
         FROM gcv_excursions e
         INNER JOIN gcv_attractions a ON a.id = e.attraction_id
         WHERE e.id = ?'
    );
    $stmt->execute([$excursionId]);
    $one = $stmt->fetch();
    return $one ? [$one] : [];
}

function gcv_excursion_save_attractions(int $excursionId, array $attractionIds): void
{
    $ids = [];
    foreach ($attractionIds as $raw) {
        $id = (int)$raw;
        if ($id > 0 && !in_array($id, $ids, true)) {
            $ids[] = $id;
        }
    }
    $ids = array_slice($ids, 0, 4);
    if ($ids === []) {
        throw new InvalidArgumentException('Selecione pelo menos 1 atrativo');
    }

    db()->prepare('DELETE FROM gcv_excursion_attractions WHERE excursion_id = ?')->execute([$excursionId]);
    $ins = db()->prepare(
        'INSERT INTO gcv_excursion_attractions (excursion_id, attraction_id, sort_order) VALUES (?,?,?)'
    );
    foreach ($ids as $i => $aid) {
        $ins->execute([$excursionId, $aid, $i]);
    }
    // Principal = primeiro
    db()->prepare('UPDATE gcv_excursions SET attraction_id = ? WHERE id = ?')->execute([$ids[0], $excursionId]);
}

function gcv_excursion_titles_joined(array $attrRows, string $lang = 'pt'): string
{
    $key = 'title_' . $lang;
    $parts = [];
    foreach ($attrRows as $a) {
        $t = trim((string)($a[$key] ?? ''));
        if ($t === '') {
            $t = trim((string)($a['title_pt'] ?? ''));
        }
        if ($t !== '') {
            $parts[] = $t;
        }
    }
    return implode(' + ', $parts);
}
