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
 * Ocupação real do grupo: PIX a pé + PIX com transporte + confirmados por fora.
 * Serve para vagas / lotação total — não para o quórum de cada modalidade.
 *
 * @param array<string,mixed> $e
 */
function gcv_excursion_occupied_people(array $e): int
{
    return max(0, (int)($e['booked_people'] ?? 0))
        + max(0, (int)($e['booked_people_transport'] ?? 0))
        + max(0, (int)($e['preconfirmed_people'] ?? 0));
}

/**
 * Novas inscrições a pé (Pix pago). Confirmados por fora e van não entram.
 *
 * @param array<string,mixed> $e
 */
function gcv_excursion_platform_inscriptions(array $e): int
{
    return max(0, (int)($e['booked_people'] ?? 0));
}

function gcv_excursion_platform_inscriptions_transport(array $e): int
{
    return max(0, (int)($e['booked_people_transport'] ?? 0));
}

function gcv_excursion_offers_transport(array $e): bool
{
    if (!empty($e['offer_transport'])) {
        return true;
    }
    return (int)($e['price_transport_cents'] ?? 0) > 0;
}

/**
 * Quórum da caminhada (novas inscrições a pé). Quórum 0 = já confirmado.
 *
 * @param array<string,mixed> $e
 */
function gcv_excursion_walking_quorum_met(array $e): bool
{
    $quorum = max(0, (int)($e['quorum'] ?? 0));
    return gcv_excursion_platform_inscriptions($e) >= $quorum;
}

/**
 * Quórum do transporte (0–4). Só vale se a saída oferece van.
 *
 * @param array<string,mixed> $e
 */
function gcv_excursion_transport_quorum_met(array $e): bool
{
    if (!gcv_excursion_offers_transport($e)) {
        return false;
    }
    $quorum = max(0, (int)($e['quorum_transport'] ?? 0));
    return gcv_excursion_platform_inscriptions_transport($e) >= $quorum;
}

/**
 * Van cancelada: caminhada formou com quórum positivo e a van não formou.
 * Quórum 0 na caminhada (já confirmado) não cancela a van — ela ainda pode formar.
 *
 * @param array<string,mixed> $e
 */
function gcv_excursion_transport_cancelled(array $e): bool
{
    if (!gcv_excursion_offers_transport($e)) {
        return false;
    }
    if (gcv_excursion_transport_quorum_met($e)) {
        return false;
    }
    $walkQuorum = max(0, (int)($e['quorum'] ?? 0));
    return $walkQuorum > 0 && gcv_excursion_walking_quorum_met($e);
}

/**
 * Passeio confirmado se a caminhada OU o transporte atingiu o quórum.
 * Van formada confirma o grupo inteiro (a pé também vai).
 *
 * @param array<string,mixed> $e
 */
function gcv_excursion_quorum_met(array $e): bool
{
    return gcv_excursion_walking_quorum_met($e) || gcv_excursion_transport_quorum_met($e);
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
    $quorumMet = gcv_excursion_quorum_met($e);

    if ($date !== '' && $date < $today) {
        return $quorumMet ? 'concluida' : 'cancelada';
    }

    if ($quorumMet) {
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

/** Cidades-base permitidas para perfil do guia e cidade de saída (slug normalizado). */
function gcv_guide_base_city_names(): array
{
    return [
        'Alto Paraíso',
        'Alto Paraíso de Goiás',
        'São Jorge',
        'Cavalcante',
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
    foreach (['alto paraiso', 'sao jorge', 'cavalcante'] as $ok) {
        if (str_contains($n, $ok)) {
            return true;
        }
    }
    return false;
}

function gcv_guide_base_city_error(): string
{
    return 'Cidade deve ser Alto Paraíso, São Jorge ou Cavalcante';
}

/**
 * @param list<array<string,mixed>> $cities
 * @return list<array<string,mixed>>
 */
function gcv_filter_guide_base_cities(array $cities): array
{
    return array_values(array_filter($cities, static function ($c) {
        return gcv_is_allowed_guide_base_city((string)($c['name'] ?? ''));
    }));
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
