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
