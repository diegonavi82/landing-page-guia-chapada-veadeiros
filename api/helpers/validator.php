<?php
declare(strict_types=1);

function validate_email(string $email): string {
    $email = trim($email);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return '';
    }
    return strtolower($email);
}

function validate_name(string $name): string {
    $name = trim(strip_tags($name));
    if (mb_strlen($name) < 2 || mb_strlen($name) > 120) return '';
    return $name;
}

function validate_password(string $pass): string {
    if (strlen($pass) < 8) return '';
    return $pass;
}

function validate_role(string $role): string {
    return in_array($role, ['guide', 'client'], true) ? $role : '';
}

function validate_lang(string $lang): string {
    return in_array($lang, ['pt', 'en', 'es'], true) ? $lang : 'pt';
}

function validate_positive_int($val): int {
    $v = filter_var($val, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    return $v === false ? 0 : (int)$v;
}

function validate_price(string $val): int {
    $cents = (int)round((float)$val * 100);
    return $cents > 0 ? $cents : 0;
}

function sanitize_text(string $val, int $max = 300): string {
    return mb_substr(trim(strip_tags($val)), 0, $max);
}

function sanitize_textarea(string $val, int $max = 5000): string {
    return mb_substr(trim(strip_tags($val)), 0, $max);
}

function validate_region(string $region): string {
    $allowed = ['alto-paraiso', 'sao-jorge', 'cavalcante', 'teresina', 'sao-joao', 'outro'];
    return in_array($region, $allowed, true) ? $region : 'alto-paraiso';
}

function validate_difficulty(string $diff): string {
    return in_array($diff, ['easy', 'medium', 'hard'], true) ? $diff : 'easy';
}

function body_json(): array {
    $raw = file_get_contents('php://input');
    return $raw ? (json_decode($raw, true) ?? []) : [];
}

/**
 * Valida telefone nacional (DDD + número) + DDI.
 * @return array{ok:bool,error:?string,phone:string,ddi:string,iso:string}
 */
function gcv_validate_contact_phone(string $phone, string $ddi = '+55', string $iso = 'br', bool $required = true): array
{
    $iso = strtolower(substr(preg_replace('/[^a-z]/i', '', $iso) ?: 'br', 0, 2)) ?: 'br';
    $ddiDigits = preg_replace('/\D+/', '', $ddi) ?: '55';
    $ddiOut = '+' . $ddiDigits;
    $digits = preg_replace('/\D+/', '', $phone) ?? '';
    if (str_starts_with($digits, '00')) {
        $digits = substr($digits, 2);
    }
    if ($digits !== '' && str_starts_with($digits, $ddiDigits) && strlen($digits) >= 12) {
        $digits = substr($digits, strlen($ddiDigits));
    }
    if (str_starts_with($digits, '0') && strlen($digits) >= 11) {
        $digits = substr($digits, 1);
    }

    if ($digits === '') {
        return [
            'ok' => !$required,
            'error' => $required ? 'Informe o DDD e o telefone' : null,
            'phone' => '',
            'ddi' => $ddiOut,
            'iso' => $iso,
        ];
    }

    if ($ddiDigits === '55') {
        if (strlen($digits) < 10 || strlen($digits) > 11) {
            return [
                'ok' => false,
                'error' => 'Telefone: DDD (2 dígitos) + número (8 ou 9 dígitos)',
                'phone' => $digits,
                'ddi' => $ddiOut,
                'iso' => $iso,
            ];
        }
        $ddd = (int)substr($digits, 0, 2);
        if ($ddd < 11 || $ddd > 99) {
            return [
                'ok' => false,
                'error' => 'DDI/DDD inválido',
                'phone' => $digits,
                'ddi' => $ddiOut,
                'iso' => $iso,
            ];
        }
        if (strlen($digits) === 11 && $digits[2] !== '9') {
            return [
                'ok' => false,
                'error' => 'Celular precisa do 9 depois do DDD',
                'phone' => $digits,
                'ddi' => $ddiOut,
                'iso' => $iso,
            ];
        }
    } elseif (strlen($digits) < 6 || strlen($digits) > 15) {
        return [
            'ok' => false,
            'error' => 'Telefone inválido',
            'phone' => $digits,
            'ddi' => $ddiOut,
            'iso' => $iso,
        ];
    }

    return [
        'ok' => true,
        'error' => null,
        'phone' => $digits,
        'ddi' => $ddiOut,
        'iso' => $iso,
    ];
}
