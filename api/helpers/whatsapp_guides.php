<?php
declare(strict_types=1);

require_once __DIR__ . '/purchase_notify.php';

function gcv_broadcast_format_phone(string $digits): string
{
    $n = preg_replace('/\D+/', '', $digits) ?? '';
    if ($n === '') {
        return '';
    }
    if (strlen($n) === 13 && str_starts_with($n, '55')) {
        return '+55 ' . substr($n, 2, 2) . ' ' . substr($n, 4, 5) . '-' . substr($n, 9);
    }
    if (strlen($n) === 12 && str_starts_with($n, '55')) {
        return '+55 ' . substr($n, 2, 2) . ' ' . substr($n, 4, 4) . '-' . substr($n, 8);
    }
    if (strlen($n) === 11) {
        return '(' . substr($n, 0, 2) . ') ' . substr($n, 2, 5) . '-' . substr($n, 7);
    }
    return '+' . $n;
}

function gcv_broadcast_status_label(string $status): string
{
    return match ($status) {
        'active' => 'Aprovado',
        'pending' => 'Pendente',
        'suspended' => 'Suspenso',
        'inactive' => 'Inativo',
        default => $status !== '' ? $status : '—',
    };
}

/** @return list<array<string,mixed>> */
function gcv_broadcast_guides(): array
{
    $order = ' ORDER BY COALESCE(NULLIF(g.full_name, \'\'), u.name) ASC';
    $select = 'SELECT u.id AS user_id, u.name, u.status, u.avatar_url,
                      g.full_name, g.nickname, g.phone, g.phone_ddi,
                      g.photo_3x4_url, g.photo_url
               FROM gcv_users u
               JOIN gcv_guides g ON g.user_id = u.id';
    $queries = [
        $select . ' WHERE u.role = \'guide\' OR EXISTS (
            SELECT 1 FROM gcv_user_roles r WHERE r.user_id = u.id AND r.role = \'guide\'
         )' . $order,
        $select . ' WHERE u.role = \'guide\'' . $order,
    ];
    $rows = [];
    foreach ($queries as $sql) {
        try {
            $rows = db()->query($sql)->fetchAll();
            break;
        } catch (Throwable $e) {
            continue;
        }
    }

    $sender = gcv_whatsapp_hps_sender();
    $out = [];
    $seen = [];
    foreach ($rows as $row) {
        $uid = (int)($row['user_id'] ?? 0);
        if ($uid <= 0 || isset($seen[$uid])) {
            continue;
        }
        $seen[$uid] = true;
        $phone = gcv_whatsapp_normalize_phone(
            (string)($row['phone'] ?? ''),
            (string)($row['phone_ddi'] ?? '55')
        );
        $name = trim((string)($row['full_name'] ?? ''));
        if ($name === '') {
            $name = trim((string)($row['name'] ?? ''));
        }
        $photo = trim((string)($row['photo_3x4_url'] ?? ''));
        if ($photo === '') {
            $photo = trim((string)($row['photo_url'] ?? ''));
        }
        if ($photo === '') {
            $photo = trim((string)($row['avatar_url'] ?? ''));
        }
        $status = (string)($row['status'] ?? '');
        $out[] = [
            'user_id' => $uid,
            'name' => $name !== '' ? $name : 'Guia #' . $uid,
            'nickname' => trim((string)($row['nickname'] ?? '')),
            'status' => $status,
            'status_label' => gcv_broadcast_status_label($status),
            'phone' => $phone,
            'phone_display' => $phone !== '' ? gcv_broadcast_format_phone($phone) : '',
            'photo_url' => $photo,
            'can_send' => $phone !== '' && $phone !== $sender,
            'is_sender' => $phone !== '' && $phone === $sender,
        ];
    }
    return $out;
}

function gcv_broadcast_find_guide(int $userId): ?array
{
    foreach (gcv_broadcast_guides() as $g) {
        if ((int)$g['user_id'] === $userId) {
            return $g;
        }
    }
    return null;
}
