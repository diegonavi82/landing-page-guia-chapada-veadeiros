<?php
declare(strict_types=1);

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
    if ($status === 'draft') {
        return 'rascunho';
    }
    if ($status === 'soldout') {
        return 'confirmada';
    }

    $date = (string)($e['date_iso'] ?? '');
    $today = (new DateTimeImmutable('now', new DateTimeZone('America/Sao_Paulo')))->format('Y-m-d');
    $booked = (int)($e['booked_people'] ?? 0);
    $quorum = max(4, (int)($e['quorum'] ?? 4));

    if ($date !== '' && $date < $today) {
        return $booked >= $quorum ? 'concluida' : 'cancelada';
    }

    if ($booked >= $quorum) {
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
        default => $code,
    };
}

/** Cidades-base permitidas para perfil do guia (slug normalizado). */
function gcv_guide_base_city_names(): array
{
    return ['Alto Paraíso', 'Alto Paraíso de Goiás', 'São Jorge', 'Cavalcante'];
}

function gcv_is_allowed_guide_base_city(string $name): bool
{
    $n = mb_strtolower(trim($name));
    $n = str_replace(['á', 'à', 'ã', 'â', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú', 'ç'], ['a', 'a', 'a', 'a', 'e', 'e', 'i', 'o', 'o', 'o', 'u', 'c'], $n);
    foreach (['alto paraiso', 'sao jorge', 'cavalcante'] as $ok) {
        if (str_contains($n, $ok)) {
            return true;
        }
    }
    return false;
}
