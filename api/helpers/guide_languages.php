<?php
declare(strict_types=1);

/**
 * Idiomas falados pelo guia (bandeiras no card da excursão).
 * Português (Brasil) é sempre o primeiro e não pode ser removido.
 */

function gcv_guide_allowed_lang_codes(): array
{
    return ['pt', 'en', 'es', 'ru'];
}

/**
 * @param mixed $raw JSON string, array de códigos, ou null
 * @return list<string>
 */
function gcv_guide_languages_normalize($raw): array
{
    $allowed = array_fill_keys(gcv_guide_allowed_lang_codes(), true);
    $codes = [];
    if (is_string($raw)) {
        $trim = trim($raw);
        if ($trim !== '' && $trim !== 'null') {
            $decoded = json_decode($trim, true);
            $raw = is_array($decoded) ? $decoded : [];
        } else {
            $raw = [];
        }
    }
    if (!is_array($raw)) {
        $raw = [];
    }
    foreach ($raw as $c) {
        $c = strtolower(trim((string)$c));
        if ($c === 'br' || $c === 'por') {
            $c = 'pt';
        }
        if ($c === 'us' || $c === 'eng') {
            $c = 'en';
        }
        if ($c === 'spa') {
            $c = 'es';
        }
        if (!isset($allowed[$c])) {
            continue;
        }
        if (!in_array($c, $codes, true)) {
            $codes[] = $c;
        }
    }
    $codes = array_values(array_filter($codes, static fn($c) => $c !== 'pt'));
    array_unshift($codes, 'pt');
    return $codes;
}

function gcv_guide_languages_json($raw): string
{
    return json_encode(gcv_guide_languages_normalize($raw), JSON_UNESCAPED_UNICODE);
}

function gcv_guide_public_slug(string $nickname, int $userId = 0): string
{
    $s = trim($nickname);
    if ($s !== '') {
        if (function_exists('transliterator_transliterate')) {
            $converted = transliterator_transliterate('Any-Latin; Latin-ASCII', $s);
            if (is_string($converted) && $converted !== '') {
                $s = $converted;
            }
        } else {
            $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
            if (is_string($converted) && $converted !== '') {
                $s = $converted;
            }
        }
        $s = strtolower($s);
        $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
        $s = trim($s, '-');
    }
    if ($s !== '') {
        return $s;
    }
    return $userId > 0 ? ('guia-' . $userId) : 'guia';
}

/** @return list<string> */
function gcv_guide_bio_paragraphs(?string $text): array
{
    $t = trim((string)$text);
    if ($t === '') {
        return [];
    }
    $parts = preg_split("/\r\n\r\n|\n\s*\n/", $t) ?: [$t];
    $out = [];
    foreach ($parts as $p) {
        $p = trim((string)$p);
        if ($p !== '') {
            $out[] = $p;
        }
    }
    return $out;
}

/**
 * @return array{pt:list<string>,en:list<string>,es:list<string>}
 */
function gcv_guide_bio_i18n(?string $pt, ?string $en, ?string $es): array
{
    $p = gcv_guide_bio_paragraphs($pt);
    $e = gcv_guide_bio_paragraphs($en);
    $s = gcv_guide_bio_paragraphs($es);
    return [
        'pt' => $p,
        'en' => $e ?: $p,
        'es' => $s ?: $p,
    ];
}
