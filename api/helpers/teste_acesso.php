<?php
declare(strict_types=1);

/**
 * Passeios de teste (slug teste-*, tarifário "Teste …").
 * O catálogo público não os lista. Só a conta logada da lista abaixo vê e paga.
 * A excursão em grupo criada nessa compra entra no carrossel só para essas contas.
 */

require_once __DIR__ . '/db.php';

function gcv_teste_emails(): array
{
    return [
        'priscilacsp@yahoo.com.br',
        'diegonavi82@gmail.com',
        'cecybfr@gmail.com',
        'viscardo@gmail.com',
    ];
}

function gcv_teste_email_ok(string $email): bool
{
    $email = strtolower(trim($email));
    return $email !== '' && in_array($email, gcv_teste_emails(), true);
}

function gcv_teste_logada(): bool
{
    try {
        if (!function_exists('current_user')) {
            require_once __DIR__ . '/auth.php';
        }
        $user = current_user();
        if (!$user || (string)($user['status'] ?? '') !== 'active') {
            return false;
        }
        return gcv_teste_email_ok((string)($user['email'] ?? ''));
    } catch (Throwable $e) {
        return false;
    }
}

function gcv_teste_mensagem(string $locale): string
{
    $msgs = [
        'pt' => 'Esse passeio de teste só pode ser comprado com a conta de teste, logada.',
        'en' => 'This test tour can only be bought while the test account is signed in.',
        'es' => 'Este paseo de prueba solo se puede comprar con la cuenta de prueba iniciada.',
    ];
    return $msgs[$locale] ?? $msgs['pt'];
}

function gcv_teste_guia_id(): int
{
    static $id = null;
    if ($id !== null) {
        return $id;
    }
    $id = 0;
    try {
        $st = db()->prepare(
            "SELECT u.id
             FROM gcv_users u
             LEFT JOIN gcv_guides g ON g.user_id = u.id
             WHERE LOWER(u.email) IN ('diegonavi82@gmail.com', 'diegocsp82@gmail.com')
               AND u.status = 'active'
             ORDER BY (g.user_id IS NULL) ASC, u.id ASC
             LIMIT 1"
        );
        $st->execute();
        $id = (int)$st->fetchColumn();
    } catch (Throwable $e) {
        error_log('gcv_teste_guia_id: ' . $e->getMessage());
        $id = 0;
    }
    return $id;
}

/**
 * @param list<int> $ids
 */
function gcv_teste_so_atracoes(array $ids): bool
{
    $ids = array_values(array_unique(array_filter(array_map('intval', $ids), static fn(int $id): bool => $id > 0)));
    if (!$ids) {
        return false;
    }
    try {
        $place = implode(',', array_fill(0, count($ids), '?'));
        $st = db()->prepare("SELECT id, slug FROM gcv_attractions WHERE id IN ($place)");
        $st->execute($ids);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        return false;
    }
    if (count($rows) !== count($ids)) {
        return false;
    }
    foreach ($rows as $row) {
        if (!str_starts_with((string)($row['slug'] ?? ''), 'teste-')) {
            return false;
        }
    }
    return true;
}

/** Saída de teste: slug, anotação ou atrativo teste-*. Não entra na fila dos outros guias. */
function gcv_excursion_is_teste(array $exc): bool
{
    $slug = strtolower(trim((string)($exc['cart_slug'] ?? '')));
    if ($slug !== '' && str_starts_with($slug, 'teste-')) {
        return true;
    }
    $notes = (string)($exc['notes_pt'] ?? '');
    if (preg_match('/^\s*TESTE\b/u', $notes)) {
        return true;
    }
    $attrId = (int)($exc['attraction_id'] ?? 0);
    return $attrId > 0 && gcv_teste_so_atracoes([$attrId]);
}

/**
 * Tira o guia colocado na criação, quando ele ainda não aceitou a proposta.
 * Sem isso o sistema trata o Diego como se já tivesse confirmado a guiagem.
 */
function gcv_teste_soltar_guia_sem_aceite(int $excursionId): void
{
    if ($excursionId <= 0) {
        return;
    }
    try {
        $st = db()->prepare(
            'SELECT guide_user_id FROM gcv_excursions WHERE id = ? AND deleted_at IS NULL LIMIT 1'
        );
        $st->execute([$excursionId]);
        $guideId = (int)$st->fetchColumn();
        if ($guideId <= 0) {
            return;
        }
        $acc = db()->prepare(
            "SELECT 1 FROM gcv_guide_queue_offers
             WHERE excursion_id = ? AND status = 'accepted' LIMIT 1"
        );
        $acc->execute([$excursionId]);
        if ($acc->fetchColumn()) {
            return;
        }
        $seat = db()->prepare(
            'SELECT 1 FROM gcv_excursion_guide_seats WHERE excursion_id = ? LIMIT 1'
        );
        $seat->execute([$excursionId]);
        if ($seat->fetchColumn()) {
            return;
        }
        db()->prepare(
            'UPDATE gcv_excursions SET guide_user_id = NULL WHERE id = ? AND guide_user_id = ?'
        )->execute([$excursionId, $guideId]);
        db()->prepare(
            "UPDATE gcv_sales
             SET guide_user_id = NULL, guide_name = NULL, guide_cpf = NULL, guide_cnpj = NULL, updated_at = NOW()
             WHERE excursion_id = ? AND guide_user_id = ? AND deleted_at IS NULL
               AND payout_status <> 'PAYOUT_PAID'"
        )->execute([$excursionId, $guideId]);
        db()->prepare(
            'UPDATE gcv_booking_trips SET guide_user_id = NULL WHERE excursion_id = ? AND guide_user_id = ?'
        )->execute([$excursionId, $guideId]);
    } catch (Throwable $e) {
        error_log('gcv_teste_soltar_guia_sem_aceite: ' . $e->getMessage());
    }
}

/**
 * @param list<array<string,mixed>> $trips
 */
function gcv_teste_classificar_trips(array $trips): string
{
    if (!function_exists('gcv_private_trip_attraction_ids')) {
        require_once __DIR__ . '/private_departure.php';
    }
    $temTeste = false;
    $temOutro = false;
    foreach ($trips as $trip) {
        if (!is_array($trip)) {
            continue;
        }
        $ids = gcv_private_trip_attraction_ids($trip);
        if ($ids) {
            if (gcv_teste_so_atracoes($ids)) {
                $temTeste = true;
            } else {
                $temOutro = true;
            }
            continue;
        }
        $cart = strtolower((string)($trip['cartId'] ?? $trip['cart_id'] ?? $trip['id'] ?? ''));
        if (str_contains($cart, 'roteiro-teste-')) {
            $temTeste = true;
        } elseif ($cart !== '') {
            $temOutro = true;
        }
    }
    if ($temTeste && $temOutro) {
        return 'misto';
    }
    return $temTeste ? 'teste' : 'nenhum';
}

/**
 * null = pode seguir. Abaixo de R$ 1 só passa se o carrinho inteiro for de teste e a conta for a da lista.
 */
function gcv_teste_pagamento_erro(array $data, int $amountCents): ?string
{
    $trips = [];
    foreach (is_array($data['trips'] ?? null) ? $data['trips'] : [] as $trip) {
        if (is_array($trip)) {
            $trips[] = $trip;
        }
    }
    $classe = gcv_teste_classificar_trips($trips);
    if ($classe === 'nenhum') {
        return $amountCents < 100 ? 'invalid_amount' : null;
    }
    if ($classe === 'misto' || !gcv_teste_logada()) {
        return 'teste_restrito';
    }
    if (!function_exists('current_user')) {
        require_once __DIR__ . '/auth.php';
    }
    $user = current_user();
    $session = strtolower(trim((string)($user['email'] ?? '')));
    $email = strtolower(trim((string)($data['email'] ?? '')));
    if ($email !== '' && $session !== '' && $email !== $session) {
        return 'teste_restrito';
    }
    return $amountCents < 1 ? 'invalid_amount' : null;
}

/**
 * Tira do carrossel público a excursão criada pelo passeio de teste.
 *
 * @param list<array<string,mixed>> $rows
 * @return list<array<string,mixed>>
 */
function gcv_teste_ocultar_excursao_publica(array $rows): array
{
    if (!$rows) {
        return [];
    }
    $ids = [];
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $id = (int)($row['attraction_id'] ?? 0);
        if ($id > 0) {
            $ids[$id] = true;
        }
    }
    $hide = [];
    if ($ids) {
        try {
            $place = implode(',', array_fill(0, count($ids), '?'));
            $st = db()->prepare("SELECT id FROM gcv_attractions WHERE id IN ($place) AND slug LIKE 'teste-%'");
            $st->execute(array_keys($ids));
            foreach ($st->fetchAll(PDO::FETCH_COLUMN) ?: [] as $id) {
                $hide[(int)$id] = true;
            }
        } catch (Throwable $e) {
            $hide = [];
        }
    }
    $out = [];
    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }
        $slug = strtolower((string)($row['cart_slug'] ?? ''));
        if (str_starts_with($slug, 'teste-')) {
            continue;
        }
        $id = (int)($row['attraction_id'] ?? 0);
        if ($id > 0 && isset($hide[$id])) {
            continue;
        }
        $out[] = $row;
    }
    return $out;
}

/**
 * Excursão em grupo do teste: uma saída por atrativo, data, cidade e transporte.
 * O guia é o Diego, para a fila real não abrir.
 * O carrossel só mostra essa saída para quem está em gcv_teste_emails().
 *
 * @param array<string,mixed> $reservation
 * @return array<string,mixed>|null
 */
function gcv_teste_group_departure_sync(array $reservation): ?array
{
    if (!function_exists('gcv_private_trip_mode')) {
        require_once __DIR__ . '/private_departure.php';
    }
    $trips = [];
    foreach (['trips', 'packages'] as $key) {
        if (!is_array($reservation[$key] ?? null)) {
            continue;
        }
        foreach ($reservation[$key] as $trip) {
            if (is_array($trip)) {
                $trips[] = $trip;
            }
        }
        if ($trips) {
            break;
        }
    }
    $chosen = null;
    foreach ($trips as $trip) {
        if (gcv_private_trip_mode($trip) === 'privativo') {
            continue;
        }
        $ids = gcv_private_trip_attraction_ids($trip);
        if (!gcv_teste_so_atracoes($ids)) {
            continue;
        }
        $row = gcv_teste_group_departure_ensure($trip, $ids);
        if ($chosen === null && $row) {
            $chosen = $row;
        }
    }
    return $chosen;
}

/**
 * @param array<string,mixed> $trip
 * @param list<int> $attrIds
 * @return array<string,mixed>|null
 */
function gcv_teste_group_departure_ensure(array $trip, array $attrIds): ?array
{
    $cityId = gcv_private_city_id($trip);
    $date = substr(trim((string)($trip['dateIso'] ?? $trip['date_iso'] ?? $trip['dateISO'] ?? '')), 0, 10);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) || $cityId <= 0 || !$attrIds) {
        return null;
    }
    $attrId = (int)$attrIds[0];
    $transport = gcv_private_trip_has_transport($trip);
    $slug = 'teste-grupo-' . $attrId . '-' . $date . '-' . $cityId . '-' . ($transport ? 't' : 's');
    $time = function_exists('gcv_normalize_departure_time')
        ? gcv_normalize_departure_time((string)($trip['hora'] ?? '08:00'))
        : '08:00:00';
    if ($time === '') {
        $time = '08:00:00';
    }
    $notes = 'TESTE · excursão de centavos. Não entra no catálogo público.';
    try {
        $existing = db()->prepare(
            'SELECT id FROM gcv_excursions WHERE cart_slug = ? AND deleted_at IS NULL LIMIT 1'
        );
        $existing->execute([$slug]);
        $id = (int)$existing->fetchColumn();
        if ($id <= 0) {
            $stmt = db()->prepare(
                'INSERT INTO gcv_excursions (
                  status, date_iso, departure_time, departure_city_id, attraction_id, guide_user_id,
                  price_cents, quorum, max_people, booked_people, preconfirmed_people,
                  include_transport, include_entry, include_lunch,
                  notes_pt, cart_slug,
                  business_mode, created_by_origin, approved_at,
                  offer_transport, price_transport_cents, quorum_transport, max_people_transport, booked_people_transport,
                  tour_type
                ) VALUES (
                  \'published\', ?, ?, ?, ?, ?,
                  8, 2, 4, 0, 0,
                  ?, 0, 0,
                  ?, ?,
                  \'ADMINISTRATIVE\', \'API\', NOW(),
                  ?, ?, 0, ?, 0,
                  \'excursao\'
                )'
            );
            $stmt->execute([
                $date,
                $time,
                $cityId,
                $attrId,
                null,
                $transport ? 1 : 0,
                $notes,
                $slug,
                $transport ? 1 : 0,
                $transport ? 22 : null,
                $transport ? 4 : 0,
            ]);
            $id = (int)db()->lastInsertId();
            if ($id > 0) {
                require_once __DIR__ . '/excursion_attractions.php';
                gcv_excursion_save_attractions($id, $attrIds);
            }
        } else {
            gcv_teste_soltar_guia_sem_aceite($id);
        }
        if ($id <= 0) {
            return null;
        }
        $st = db()->prepare(
            'SELECT e.*, c.name AS departure_city_name, a.title_pt AS attraction_title
             FROM gcv_excursions e
             LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
             LEFT JOIN gcv_attractions a ON a.id = e.attraction_id
             WHERE e.id = ? LIMIT 1'
        );
        $st->execute([$id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    } catch (Throwable $e) {
        error_log('gcv_teste_group_departure_ensure: ' . $e->getMessage());
        return null;
    }
}
