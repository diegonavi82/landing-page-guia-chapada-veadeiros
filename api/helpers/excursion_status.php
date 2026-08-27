<?php
declare(strict_types=1);

/**
 * Passeio criado/enviado por um guia (não pelo admin no CMS).
 *
 * @param array<string,mixed> $e
 */
function gcv_excursion_is_guide_submitted(array $e): bool
{
    $origin = strtoupper((string)($e['created_by_origin'] ?? ''));
    $mode = strtoupper((string)($e['business_mode'] ?? ''));
    if ($origin === 'GUIDE' || $mode === 'GUIDE_MARKETPLACE') {
        return true;
    }
    $createdBy = (int)($e['created_by'] ?? 0);
    $guideId = (int)($e['guide_user_id'] ?? 0);
    return $createdBy > 0 && $guideId > 0 && $createdBy === $guideId;
}

/**
 * Visível/comprável no site público: publicado e, se veio de guia, aprovado pelo admin.
 *
 * @param array<string,mixed> $e
 */
function gcv_excursion_is_publicly_bookable(array $e): bool
{
    if (!empty($e['deleted_at'])) {
        return false;
    }
    $status = (string)($e['status'] ?? '');
    if (!in_array($status, ['published', 'soldout'], true)) {
        return false;
    }
    if (gcv_excursion_is_guide_submitted($e) && empty($e['approved_at']) && empty($e['approved_by'])) {
        return false;
    }
    return true;
}

/**
 * Cláusula SQL: saídas públicas (carrossel / checkout).
 */
function gcv_excursion_sql_public_live(string $alias = 'e'): string
{
    $a = preg_replace('/[^a-zA-Z0-9_]/', '', $alias) ?: 'e';
    return "{$a}.status IN ('published','soldout')
      AND {$a}.deleted_at IS NULL
      AND NOT (
        ({$a}.created_by_origin = 'GUIDE' OR {$a}.business_mode = 'GUIDE_MARKETPLACE')
        AND {$a}.approved_at IS NULL
      )
      AND (
        {$a}.guide_user_id IS NULL
        OR EXISTS (
          SELECT 1 FROM gcv_users ug
          WHERE ug.id = {$a}.guide_user_id AND ug.status = 'active'
        )
      )";
}

/** Pessoas já confirmadas pelo guia no cadastro (0–5), aparte das vendas PIX. */
function gcv_clamp_preconfirmed($value, int $maxPeople = 12, int $bookedPeople = 0): int
{
    $n = (int)$value;
    if ($n < 0) {
        $n = 0;
    }
    if ($n > 5) {
        $n = 5;
    }
    $room = max(0, $maxPeople - max(0, $bookedPeople));
    if ($n > $room) {
        $n = $room;
    }
    return $n;
}

/**
 * Ocupação real: PIX (booked_people) + pessoas que o guia já confirmou.
 *
 * @param array<string,mixed> $e
 */
function gcv_excursion_occupied_people(array $e): int
{
    return max(0, (int)($e['booked_people'] ?? 0)) + max(0, (int)($e['preconfirmed_people'] ?? 0));
}

/**
 * Status dinâmico da excursão (espelha Navi-Experience).
 * @param array<string,mixed> $e
 */
function gcv_resolve_excursion_lifecycle(array $e): string
{
    $status = (string)($e['status'] ?? 'draft');
    if ($status === 'cancelled') {
        return 'cancelada';
    }
    if ($status === 'rejected') {
        return 'rejeitada';
    }
    if ($status === 'pending_approval') {
        return 'aguardando_aprovacao';
    }
    if ($status === 'draft') {
        return 'rascunho';
    }
    if ($status === 'soldout') {
        return 'confirmada';
    }

    $date = (string)($e['date_iso'] ?? '');
    $today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
    $occupied = gcv_excursion_occupied_people($e);
    $quorum = max(0, (int)($e['quorum'] ?? 0));

    if ($date !== '' && $date < $today) {
        return $occupied >= $quorum ? 'concluida' : 'cancelada';
    }

    if ($occupied >= $quorum) {
        return 'confirmada';
    }
    return 'em_formacao';
}

function gcv_excursion_lifecycle_label(string $code): string
{
    return match ($code) {
        'confirmada' => 'Confirmada',
        'em_formacao' => 'Em formação',
        'concluida' => 'Concluída',
        'cancelada' => 'Cancelada',
        'rascunho' => 'Rascunho',
        'aguardando_aprovacao' => 'Aguardando aprovação',
        'rejeitada' => 'Rejeitada',
        default => $code,
    };
}

/** Cidades-base permitidas para perfil do guia (slug normalizado). */
function gcv_guide_base_city_names(): array
{
    return [
        'Alto Paraíso',
        'Alto Paraíso de Goiás',
        'São Jorge',
        'Cavalcante',
        'Teresina de Goiás',
        "São João d'Aliança",
    ];
}

function gcv_is_allowed_guide_base_city(string $name): bool
{
    $n = mb_strtolower(trim($name));
    $n = str_replace(
        ['á', 'à', 'ã', 'â', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú', 'ç', '’', '´'],
        ['a', 'a', 'a', 'a', 'e', 'e', 'i', 'o', 'o', 'o', 'u', 'c', "'", "'"],
        $n
    );
    foreach (['alto paraiso', 'sao jorge', 'cavalcante', 'teresina', 'sao joao'] as $ok) {
        if (str_contains($n, $ok)) {
            return true;
        }
    }
    return false;
}

/** Horário HH:MM:SS com minutos 00/10/20/30/40/50. */
function gcv_normalize_departure_time(string $time): string
{
    $time = trim($time);
    if (!preg_match('/^(\d{1,2}):(\d{2})/', $time, $m)) {
        return '';
    }
    $h = (int)$m[1];
    $min = (int)$m[2];
    if ($h < 0 || $h > 23) {
        return '';
    }
    $min = (int)(round($min / 10) * 10);
    if ($min >= 60) {
        $min = 50;
    }
    return sprintf('%02d:%02d:00', $h, $min);
}
