<?php
declare(strict_types=1);

/**
 * Relógio da confirmação operacional (America/Sao_Paulo).
 *
 * O prazo conta só dentro de duas janelas:
 *   06:00–09:00 e 16:00–22:00.
 * Fora delas o tempo para. O fim da janela não entra na conta.
 */

function gcv_ops_clock_tz(): DateTimeZone
{
    return new DateTimeZone('America/Sao_Paulo');
}

function gcv_ops_clock_accept_seconds(): int
{
    return 4 * 3600 + 20 * 60;
}

/** Prazo do contratante para escolher o guia, no mesmo relógio. */
function gcv_ops_clock_choice_seconds(): int
{
    return 6 * 3600;
}

function gcv_ops_clock_now(): DateTimeImmutable
{
    return new DateTimeImmutable('now', gcv_ops_clock_tz());
}

/**
 * @return list<array{0:int,1:int}> início inclusive e fim exclusive, em segundos do dia
 */
function gcv_ops_clock_windows(): array
{
    return [
        [6 * 3600, 9 * 3600],
        [16 * 3600, 22 * 3600],
    ];
}

function gcv_ops_clock_is_open(?DateTimeImmutable $at = null): bool
{
    $at = ($at ?? gcv_ops_clock_now())->setTimezone(gcv_ops_clock_tz());
    $sec = ((int)$at->format('H')) * 3600 + ((int)$at->format('i')) * 60 + (int)$at->format('s');
    foreach (gcv_ops_clock_windows() as [$start, $end]) {
        if ($sec >= $start && $sec < $end) {
            return true;
        }
    }
    return false;
}

/** Instante real em que $activeSeconds de janela aberta se esgotam. */
function gcv_ops_clock_active_until(DateTimeImmutable $from, int $activeSeconds): DateTimeImmutable
{
    $tz = gcv_ops_clock_tz();
    $cursor = $from->setTimezone($tz);
    $left = max(0, $activeSeconds);
    if ($left === 0) {
        return $cursor;
    }
    for ($day = 0; $day < 21 && $left > 0; $day++) {
        $date = $cursor->format('Y-m-d');
        $midnight = new DateTimeImmutable($date . ' 00:00:00', $tz);
        foreach (gcv_ops_clock_windows() as [$start, $end]) {
            $winStart = $midnight->modify('+' . $start . ' seconds');
            $winEnd = $midnight->modify('+' . $end . ' seconds');
            if ($cursor >= $winEnd) {
                continue;
            }
            $fromHere = $cursor > $winStart ? $cursor : $winStart;
            $room = $winEnd->getTimestamp() - $fromHere->getTimestamp();
            if ($room <= 0) {
                continue;
            }
            if ($room >= $left) {
                return $fromHere->modify('+' . $left . ' seconds');
            }
            $left -= $room;
            $cursor = $winEnd;
        }
        $cursor = $midnight->modify('+1 day');
    }
    return $cursor;
}

function gcv_ops_clock_label(DateTimeImmutable $at): string
{
    $at = $at->setTimezone(gcv_ops_clock_tz());
    return $at->format('d/m/Y') . ' às ' . $at->format('H:i');
}

function gcv_ops_clock_label_from_sql(string $sql): string
{
    $sql = trim($sql);
    if ($sql === '') {
        return '';
    }
    try {
        return gcv_ops_clock_label(new DateTimeImmutable($sql, gcv_ops_clock_tz()));
    } catch (Throwable $e) {
        return $sql;
    }
}
