<?php
declare(strict_types=1);

/**
 * Regras de campos obrigatórios do cadastro do guia.
 * Foto, documento (RG/CNH), e-mail, telefone, nascimento, cidade, nome/razão, CPF/CNPJ e PIX.
 * Apelido e descrição são opcionais.
 */
require_once __DIR__ . '/marketplace/guide_financial_service.php';

function gcv_guide_profile_digits(string $s): string
{
    return preg_replace('/\D+/', '', $s) ?? '';
}

/** @return 'M'|'F'|'' */
function gcv_normalize_sexo($value): string
{
    $s = strtolower(trim((string)$value));
    if (in_array($s, ['f', 'female', 'feminino', 'mulher', 'w'], true)) {
        return 'F';
    }
    if (in_array($s, ['m', 'male', 'masculino', 'homem', 'h'], true)) {
        return 'M';
    }
    return '';
}

/**
 * @param array<string,mixed> $p  Linha de gcv_guides + email + legal_name/pix
 * @return list<string>
 */
function gcv_guide_profile_missing(array $p): array
{
    $missing = [];
    if (trim((string)($p['full_name'] ?? '')) === '') {
        $missing[] = 'full_name';
    }
    if (trim((string)($p['email'] ?? '')) === '') {
        $missing[] = 'email';
    }
    $phone = gcv_guide_profile_digits((string)($p['phone'] ?? ''));
    if (strlen($phone) < 10) {
        $missing[] = 'phone';
    }
    if (empty($p['birth_date'])) {
        $missing[] = 'birth_date';
    }
    $sexo = gcv_normalize_sexo($p['sexo'] ?? '');
    if ($sexo === '') {
        $missing[] = 'sexo';
    }
    if (empty($p['base_city_id'])) {
        $missing[] = 'base_city_id';
    }
    if (empty($p['photo_3x4_url']) && empty($p['photo_url'])) {
        $missing[] = 'photo_3x4_url';
    }
    if (trim((string)($p['id_document_url'] ?? '')) === '') {
        $missing[] = 'id_document_url';
    }
    $legal = trim((string)($p['legal_name'] ?? ''));
    if ($legal === '') {
        $legal = trim((string)($p['full_name'] ?? ''));
    }
    if ($legal === '') {
        $missing[] = 'legal_name';
    }
    $person = strtoupper((string)($p['person_type'] ?? 'PF'));
    if ($person === 'CNPJ') {
        $person = 'PJ';
    }
    $pixType = strtolower(trim((string)($p['pix_key_type'] ?? '')));
    $pixDigits = gcv_guide_profile_digits((string)($p['pix_key'] ?? ''));
    if ($person === 'PJ') {
        $cnpj = gcv_guide_profile_digits((string)($p['cnpj'] ?? ''));
        if (strlen($cnpj) !== 14 && $pixType === 'cnpj' && strlen($pixDigits) === 14) {
            $cnpj = $pixDigits;
        }
        if (strlen($cnpj) !== 14) {
            $missing[] = 'cpf_cnpj';
        }
    } else {
        $cpf = gcv_guide_profile_digits((string)($p['cpf'] ?? ''));
        if (strlen($cpf) !== 11 && $pixType === 'cpf' && strlen($pixDigits) === 11) {
            $cpf = $pixDigits;
        }
        if (strlen($cpf) !== 11) {
            $missing[] = 'cpf_cnpj';
        }
    }
    $pix = trim((string)($p['pix_key'] ?? ''));
    $pixType = strtolower(trim((string)($p['pix_key_type'] ?? '')));
    if ($pix === '' || !in_array($pixType, ['cpf', 'cnpj', 'email', 'phone', 'random'], true)) {
        $missing[] = 'pix_key';
    }
    return $missing;
}

/**
 * @param array<string,mixed> $profile
 * @param array<string,mixed>|null $financial
 * @return array<string,mixed>
 */
function gcv_guide_profile_merge_financial(array $profile, ?array $financial): array
{
    if (!$financial) {
        return $profile;
    }
    if (trim((string)($profile['legal_name'] ?? '')) === '') {
        $profile['legal_name'] = (string)($financial['legal_name'] ?? '');
    }
    if (trim((string)($profile['person_type'] ?? '')) === '') {
        $profile['person_type'] = (string)($financial['person_type'] ?? '');
    }
    if (gcv_guide_profile_digits((string)($profile['cpf'] ?? '')) === '') {
        $profile['cpf'] = (string)($financial['cpf'] ?? '');
    }
    if (gcv_guide_profile_digits((string)($profile['cnpj'] ?? '')) === '') {
        $profile['cnpj'] = (string)($financial['cnpj'] ?? '');
    }
    if (trim((string)($profile['pix_key'] ?? '')) === '') {
        $profile['pix_key'] = (string)($financial['pix_key'] ?? '');
    }
    if (trim((string)($profile['pix_key_type'] ?? '')) === '') {
        $profile['pix_key_type'] = (string)($financial['pix_key_type'] ?? '');
    }
    return $profile;
}

function gcv_guide_profile_is_complete(int $userId): bool
{
    $stmt = db()->prepare(
        'SELECT g.*, u.email
         FROM gcv_guides g
         JOIN gcv_users u ON u.id = g.user_id
         WHERE g.user_id = ?
         LIMIT 1'
    );
    $stmt->execute([$userId]);
    $p = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$p) {
        return false;
    }
    $fin = function_exists('gcv_guide_financial_get') ? gcv_guide_financial_get($userId) : null;
    $merged = gcv_guide_profile_merge_financial($p, $fin);
    return gcv_guide_profile_missing($merged) === [];
}
