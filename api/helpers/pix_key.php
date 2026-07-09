<?php

declare(strict_types=1);

/**
 * Validação e normalização de chave PIX (destino de pagamento a guias).
 */

/** @return array{ok:bool, key?:string, type?:string, error?:string} */
function gcv_pix_key_normalize(string $raw): array
{
    $raw = trim($raw);
    if ($raw === '') {
        return ['ok' => false, 'error' => 'Chave PIX vazia'];
    }

    // E-mail
    if (str_contains($raw, '@')) {
        $email = strtolower($raw);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 77) {
            return ['ok' => false, 'error' => 'E-mail PIX inválido'];
        }
        return ['ok' => true, 'key' => $email, 'type' => 'email'];
    }

    // Chave aleatória (UUID)
    if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $raw)) {
        return ['ok' => true, 'key' => strtolower($raw), 'type' => 'random'];
    }

    $digits = preg_replace('/\D+/', '', $raw) ?? '';

    // Telefone E.164 BR: 11 dígitos (DDD+número) → +55...
    if (preg_match('/^\+?55?\d{10,11}$/', preg_replace('/[\s()-]/', '', $raw) ?? '')) {
        if (strlen($digits) === 10 || strlen($digits) === 11) {
            $digits = '55' . $digits;
        }
        if (strlen($digits) === 12 || strlen($digits) === 13) {
            if (!str_starts_with($digits, '55')) {
                return ['ok' => false, 'error' => 'Telefone PIX inválido'];
            }
            return ['ok' => true, 'key' => '+' . $digits, 'type' => 'phone'];
        }
    }

    // CPF
    if (strlen($digits) === 11 && gcv_pix_cpf_valid($digits)) {
        return ['ok' => true, 'key' => $digits, 'type' => 'cpf'];
    }

    // CNPJ
    if (strlen($digits) === 14 && gcv_pix_cnpj_valid($digits)) {
        return ['ok' => true, 'key' => $digits, 'type' => 'cnpj'];
    }

    return ['ok' => false, 'error' => 'Chave PIX inválida (use CPF, CNPJ, e-mail, telefone ou aleatória)'];
}

function gcv_pix_cpf_valid(string $cpf): bool
{
    if (preg_match('/^(\d)\1{10}$/', $cpf)) {
        return false;
    }
    for ($t = 9; $t < 11; $t++) {
        $sum = 0;
        for ($i = 0; $i < $t; $i++) {
            $sum += (int)$cpf[$i] * (($t + 1) - $i);
        }
        $digit = ((10 * $sum) % 11) % 10;
        if ((int)$cpf[$t] !== $digit) {
            return false;
        }
    }
    return true;
}

function gcv_pix_cnpj_valid(string $cnpj): bool
{
    if (preg_match('/^(\d)\1{13}$/', $cnpj)) {
        return false;
    }
    $w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    $w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    $sum = 0;
    for ($i = 0; $i < 12; $i++) {
        $sum += (int)$cnpj[$i] * $w1[$i];
    }
    $d1 = $sum % 11 < 2 ? 0 : 11 - ($sum % 11);
    if ((int)$cnpj[12] !== $d1) {
        return false;
    }
    $sum = 0;
    for ($i = 0; $i < 13; $i++) {
        $sum += (int)$cnpj[$i] * $w2[$i];
    }
    $d2 = $sum % 11 < 2 ? 0 : 11 - ($sum % 11);
    return (int)$cnpj[13] === $d2;
}

function gcv_pix_keys_equal(string $a, string $b): bool
{
    $na = gcv_pix_key_normalize($a);
    $nb = gcv_pix_key_normalize($b);
    if (!$na['ok'] || !$nb['ok']) {
        return false;
    }
    return hash_equals((string)$na['key'], (string)$nb['key']);
}
