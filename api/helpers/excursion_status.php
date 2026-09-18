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
 * Um único grupo de vagas. Transporte = carro/SUV (até 4), compartilhado com as vagas a pé.
 *
 * Situações:
 * - 0 a pé + 0 carro em 10: a pé 0/10, transporte 0/4
 * - 4 a pé: transporte segue 0/4 (ainda cabem 4)
 * - 6 a pé: transporte 0/4 (cabe exatamente o quórum)
 * - 7 a pé: transporte cancelado (só restam 3, quórum 4 impossível)
 * - 4 no carro: a pé passa a 0/6
 *
 * @return array{
 *   total:int, walk:int, transport:int, occupied:int, remaining:int,
 *   walk_slots:int, transport_slots:int, transport_cap:int,
 *   transport_cancelled:bool, transport_full:bool
 * }
 */
function gcv_excursion_group_occupancy(array $e): array
{
    $total = max(1, (int)($e['max_people'] ?? 10));
    $walk = gcv_excursion_platform_inscriptions($e) + max(0, (int)($e['preconfirmed_people'] ?? 0));
    $transport = gcv_excursion_platform_inscriptions_transport($e);
    $cap = max(0, (int)($e['max_people_transport'] ?? 0));
    $offer = gcv_excursion_offers_transport($e);
    if ($offer && $cap < 1) {
        $cap = 4;
    }
    if ($walk > $total) {
        $walk = $total;
    }
    if ($walk + $transport > $total) {
        $transport = max(0, $total - $walk);
    }
    $quorumT = max(0, (int)($e['quorum_transport'] ?? 0));
    $roomForTransport = max(0, $total - $walk);
    $formed = $quorumT > 0 && $transport >= $quorumT;
    $cancelled = $offer && $quorumT > 0 && !$formed && $roomForTransport < $quorumT;
    $walkSlots = max(0, $total - $transport);
    $transportSlots = 0;
    if ($offer) {
        $transportSlots = $cancelled
            ? $transport
            : max(0, min($cap, $roomForTransport));
    }

    return [
        'total' => $total,
        'walk' => $walk,
        'transport' => $transport,
        'occupied' => $walk + $transport,
        'remaining' => max(0, $total - $walk - $transport),
        'walk_slots' => $walkSlots,
        'transport_slots' => $transportSlots,
        'transport_cap' => $cap,
        'transport_cancelled' => $cancelled,
        'transport_full' => $offer && !$cancelled && $transportSlots > 0 && $transport >= $transportSlots,
    ];
}

/**
 * Quórum da caminhada (novas inscrições a pé). Quórum 0 = já confirmado.
 *
 * @param array<string,mixed> $e
 */
function gcv_excursion_walking_quorum_met(array $e): bool
{
    $quorum = max(0, (int)($e['quorum'] ?? 0));
    $walk = gcv_excursion_platform_inscriptions($e);
    if ($walk < $quorum) {
        return false;
    }
    if ($walk < 1) {
        return $quorum === 0;
    }
    // Grupo de 5 (carro cheio) não confirma até outro grupo a pé deixar vaga para o guia.
    // SUV formado confirma pelo quórum de transporte (gcv_excursion_quorum_met).
    return gcv_walk_sale_has_spare_client_seat($e);
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
 * Transporte (carro/SUV) cancelado quando o quórum dele não cabe mais no grupo.
 * Ex.: 7 a pé em 10 vagas, quórum do carro 4 → só restam 3 → cancela.
 * Se o quórum do carro já foi atingido, não cancela.
 *
 * @param array<string,mixed> $e
 */
function gcv_excursion_transport_cancelled(array $e): bool
{
    return (bool)(gcv_excursion_group_occupancy($e)['transport_cancelled'] ?? false);
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

/**
 * Quórum da caminhada (individual, sem van): 0 = já confirmado; senão 1 até o número de vagas.
 * Se o quórum for maior que as vagas, reduz ao máximo. Se for menor ou igual, mantém.
 */
function gcv_clamp_walk_quorum($value, $maxPeople): int
{
    $n = (int)$value;
    if ($n < 0) {
        return 0;
    }
    $cap = (int)$maxPeople;
    if ($cap < 1) {
        $cap = 1;
    }
    if ($cap > 12) {
        $cap = 12;
    }
    if ($n > $cap) {
        return $cap;
    }
    return $n;
}

/** Carro/SUV comum: 5 assentos. O guia ocupa 1 no veículo do cliente (opção sem transporte). */
function gcv_client_car_seats(): int
{
    return 5;
}

/**
 * Inscrição a pé com menos de 5 pessoas: sobra assento no carro do cliente para o guia.
 *
 * @param array<string,mixed> $e
 */
function gcv_walk_sale_has_spare_client_seat(array $e): bool
{
    static $cache = [];
    $id = (int)($e['id'] ?? 0);
    if ($id > 0 && array_key_exists($id, $cache)) {
        return $cache[$id];
    }
    $ok = false;
    if ($id > 0 && function_exists('db')) {
        try {
            $st = db()->prepare(
                "SELECT 1 FROM gcv_sales
                 WHERE excursion_id = ?
                   AND sale_status = 'PAID'
                   AND COALESCE(include_transport, 0) = 0
                   AND spots > 0 AND spots < 5
                 LIMIT 1"
            );
            $st->execute([$id]);
            $ok = (bool)$st->fetchColumn();
        } catch (Throwable $ex) {
            $ok = false;
        }
    }
    if (!$ok) {
        $walk = function_exists('gcv_excursion_platform_inscriptions')
            ? gcv_excursion_platform_inscriptions($e)
            : max(0, (int)($e['booked_people'] ?? 0));
        $ok = $walk > 0 && $walk < 5;
    }
    if ($id > 0) {
        $cache[$id] = $ok;
    }
    return $ok;
}

/**
 * Há assento para o guia: outro grupo a pé com menos de 5, ou já há inscrição com transporte.
 *
 * @param array<string,mixed> $e
 */
function gcv_walk_has_spare_guide_seat(array $e): bool
{
    if (function_exists('gcv_excursion_platform_inscriptions_transport')
        && gcv_excursion_platform_inscriptions_transport($e) > 0) {
        return true;
    }
    return gcv_walk_sale_has_spare_client_seat($e);
}

function gcv_trip_has_platform_transport(array $trip): bool
{
    if (!empty($trip['comTransporte']) || !empty($trip['with_transport']) || !empty($trip['include_transport'])) {
        return true;
    }
    $cartId = (string)($trip['cartId'] ?? $trip['cart_id'] ?? $trip['id'] ?? '');
    return str_ends_with($cartId, '-t');
}

/** 1 carro → 4 pessoas; 2 → 9; 3+ → sem teto extra (vale o limite do passeio). */
function gcv_walk_max_people_for_vehicles(int $vehicles): int
{
    $cars = max(1, min(8, $vehicles));
    if ($cars >= 3) {
        return 12;
    }
    return max(1, $cars * gcv_client_car_seats() - 1);
}

/**
 * @param array<string,mixed> $trip
 */
function gcv_walk_guide_seat_error(array $trip): ?string
{
    if (gcv_trip_has_platform_transport($trip)) {
        return null;
    }
    $qty = (int)($trip['qty'] ?? $trip['quantity'] ?? $trip['people'] ?? 0);
    if ($qty < 1) {
        return null;
    }
    $vehicles = (int)($trip['clientVehicles'] ?? $trip['client_vehicles'] ?? 0);
    if ($vehicles < 1) {
        $vehicles = 1;
    }
    $cap = gcv_walk_max_people_for_vehicles($vehicles);
    if ($qty <= $cap) {
        return null;
    }
    return 'O guia vai no carro do grupo. Com 1 carro de 5 lugares cabem no máximo 4 pessoas. Informe 2 ou mais carros (ou um veículo maior) para grupos maiores.';
}
