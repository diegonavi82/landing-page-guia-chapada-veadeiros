<?php
declare(strict_types=1);

/**
 * Constantes de domínio Marketplace / Financeiro.
 * CreatedBy (auditoria) ≠ BusinessMode (regras financeiras).
 */

final class GcvCreatedBy
{
    public const ADMIN = 'ADMIN';
    public const GUIDE = 'GUIDE';
    public const CURSOR = 'CURSOR';
    public const IMPORT = 'IMPORT';
    public const API = 'API';
    public const AI = 'AI';

    /** @return list<string> */
    public static function all(): array
    {
        return [self::ADMIN, self::GUIDE, self::CURSOR, self::IMPORT, self::API, self::AI];
    }

    public static function isValid(string $v): bool
    {
        return in_array(strtoupper($v), self::all(), true);
    }

    public static function normalize(?string $v, string $fallback = self::ADMIN): string
    {
        $u = strtoupper(trim((string)$v));
        return self::isValid($u) ? $u : $fallback;
    }
}

final class GcvBusinessMode
{
    public const ADMINISTRATIVE = 'ADMINISTRATIVE';
    public const GUIDE_MARKETPLACE = 'GUIDE_MARKETPLACE';

    /** @return list<string> */
    public static function all(): array
    {
        return [self::ADMINISTRATIVE, self::GUIDE_MARKETPLACE];
    }

    public static function isValid(string $v): bool
    {
        return in_array(strtoupper($v), self::all(), true);
    }

    public static function normalize(?string $v, string $fallback = self::ADMINISTRATIVE): string
    {
        $u = strtoupper(trim((string)$v));
        return self::isValid($u) ? $u : $fallback;
    }
}

final class GcvPayoutStatus
{
    public const PENDING = 'PAYOUT_PENDING';
    public const PAID = 'PAYOUT_PAID';
    public const REVIEW = 'PAYOUT_REVIEW';
    public const BLOCKED = 'PAYOUT_BLOCKED';

    /** @return list<string> */
    public static function all(): array
    {
        return [self::PENDING, self::PAID, self::REVIEW, self::BLOCKED];
    }
}

final class GcvSaleStatus
{
    public const PENDING = 'PENDING';
    public const PAID = 'PAID';
    public const CANCELLED = 'CANCELLED';
    public const REFUNDED = 'REFUNDED';
    public const DISPUTED = 'DISPUTED';
}
