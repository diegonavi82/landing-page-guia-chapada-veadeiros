<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../marketplace_schema.php';
require_once __DIR__ . '/../pix_key.php';
require_once __DIR__ . '/audit_service.php';
require_once __DIR__ . '/constants.php';

/**
 * Perfil financeiro obrigatório do guia.
 *
 * @return array<string,mixed>|null
 */
function gcv_guide_financial_get(int $guideUserId): ?array
{
    gcv_marketplace_ensure_schema();
    $stmt = db()->prepare(
        'SELECT * FROM gcv_guide_financial WHERE guide_user_id = ? AND deleted_at IS NULL LIMIT 1'
    );
    $stmt->execute([$guideUserId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) {
        return $row;
    }

    // Espelha dados legados se existirem
    $g = db()->prepare(
        'SELECT user_id, full_name, pix_holder_name, person_type, cpf, cnpj, pix_key, pix_key_type,
                bank_name, bank_agency, bank_account, pix_verified_at
         FROM gcv_guides WHERE user_id = ? LIMIT 1'
    );
    $g->execute([$guideUserId]);
    $legacy = $g->fetch(PDO::FETCH_ASSOC);
    if (!$legacy) {
        return null;
    }
    return [
        'guide_user_id' => $guideUserId,
        'legal_name' => $legacy['full_name'] ?? $legacy['pix_holder_name'] ?? '',
        'person_type' => $legacy['person_type'] ?? 'PF',
        'cpf' => $legacy['cpf'] ?? null,
        'cnpj' => $legacy['cnpj'] ?? null,
        'pix_key' => $legacy['pix_key'] ?? '',
        'pix_key_type' => $legacy['pix_key_type'] ?? null,
        'pix_holder_name' => $legacy['pix_holder_name'] ?? $legacy['full_name'] ?? '',
        'bank_name' => $legacy['bank_name'] ?? null,
        'bank_agency' => $legacy['bank_agency'] ?? null,
        'bank_account' => $legacy['bank_account'] ?? null,
        'status' => !empty($legacy['pix_verified_at']) ? 'active' : 'incomplete',
        'legacy' => true,
    ];
}

function gcv_guide_financial_is_ready(int $guideUserId): bool
{
    $p = gcv_guide_financial_get($guideUserId);
    if (!$p) {
        return false;
    }
    $pix = trim((string)($p['pix_key'] ?? ''));
    $type = trim((string)($p['pix_key_type'] ?? ''));
    $name = trim((string)($p['legal_name'] ?? $p['pix_holder_name'] ?? ''));
    $status = (string)($p['status'] ?? '');
    if ($pix === '' || $type === '' || $name === '') {
        return false;
    }
    if ($status === 'blocked') {
        return false;
    }
    $person = strtoupper((string)($p['person_type'] ?? 'PF'));
    if ($person === 'PJ') {
        $cnpj = preg_replace('/\D+/', '', (string)($p['cnpj'] ?? '')) ?? '';
        return strlen($cnpj) === 14;
    }
    $cpf = preg_replace('/\D+/', '', (string)($p['cpf'] ?? '')) ?? '';
    return strlen($cpf) === 11;
}

/**
 * @param array<string,mixed> $data
 * @return array<string,mixed>
 */
function gcv_guide_financial_upsert(int $guideUserId, array $data, ?int $actorId = null, string $origin = 'GUIDE'): array
{
    gcv_marketplace_ensure_schema();
    $before = gcv_guide_financial_get($guideUserId) ?: [];

    $legalName = trim((string)($data['legal_name'] ?? $data['nome'] ?? $before['legal_name'] ?? ''));
    $personType = strtoupper(trim((string)($data['person_type'] ?? $data['tipo_pessoa'] ?? $before['person_type'] ?? 'PF')));
    if ($personType === 'CPF') {
        $personType = 'PF';
    }
    if ($personType === 'CNPJ') {
        $personType = 'PJ';
    }
    if (!in_array($personType, ['PF', 'PJ'], true)) {
        $personType = 'PF';
    }
    $cpfIn = preg_replace('/\D+/', '', (string)($data['cpf'] ?? '')) ?: '';
    $cnpjIn = preg_replace('/\D+/', '', (string)($data['cnpj'] ?? '')) ?: '';
    $unifiedDoc = preg_replace('/\D+/', '', (string)($data['document'] ?? $data['cpf_cnpj'] ?? '')) ?: '';
    if ($unifiedDoc !== '') {
        if ($personType === 'PJ') {
            $cnpjIn = $unifiedDoc;
            $cpfIn = '';
        } else {
            $cpfIn = $unifiedDoc;
            $cnpjIn = '';
        }
    }
    if ($personType === 'PJ') {
        $cnpj = $cnpjIn !== '' ? $cnpjIn : (preg_replace('/\D+/', '', (string)($before['cnpj'] ?? '')) ?: null);
        $cpf = null;
    } else {
        $cpf = $cpfIn !== '' ? $cpfIn : (preg_replace('/\D+/', '', (string)($before['cpf'] ?? '')) ?: null);
        $cnpj = null;
    }
    $pixKey = trim((string)($data['pix_key'] ?? $before['pix_key'] ?? ''));
    $pixType = strtolower(trim((string)($data['pix_key_type'] ?? $before['pix_key_type'] ?? '')));
    $holder = trim((string)($data['pix_holder_name'] ?? $data['titular'] ?? $before['pix_holder_name'] ?? $legalName));
    $bank = trim((string)($data['bank_name'] ?? $data['banco'] ?? $before['bank_name'] ?? '')) ?: null;
    $agency = trim((string)($data['bank_agency'] ?? $data['agencia'] ?? $before['bank_agency'] ?? '')) ?: null;
    $account = trim((string)($data['bank_account'] ?? $data['conta'] ?? $before['bank_account'] ?? '')) ?: null;
    $status = strtolower(trim((string)($data['status'] ?? $before['status'] ?? 'incomplete')));

    if ($legalName === '' || strlen($legalName) < 2) {
        throw new InvalidArgumentException('Nome obrigatório');
    }
    if ($pixKey === '' || !in_array($pixType, ['cpf', 'cnpj', 'email', 'phone', 'random'], true)) {
        throw new InvalidArgumentException('Chave PIX e tipo obrigatórios');
    }
    if (function_exists('gcv_pix_key_normalize')) {
        $norm = gcv_pix_key_normalize($pixKey);
        if (!empty($norm['ok']) && !empty($norm['key'])) {
            $pixKey = (string)$norm['key'];
            if (!empty($norm['type']) && $pixType === '') {
                $pixType = (string)$norm['type'];
            }
        }
    }
    if ($personType === 'PF' && ($cpf === null || strlen($cpf) !== 11 || !gcv_pix_cpf_valid($cpf))) {
        throw new InvalidArgumentException('CPF inválido');
    }
    if ($personType === 'PJ' && ($cnpj === null || strlen($cnpj) !== 14 || !gcv_pix_cnpj_valid($cnpj))) {
        throw new InvalidArgumentException('CNPJ inválido');
    }
    if (!in_array($status, ['incomplete', 'pending_review', 'active', 'blocked'], true)) {
        $status = 'pending_review';
    }
    // Guia não pode auto-ativar
    if ($origin === GcvCreatedBy::GUIDE && $status === 'active') {
        $status = 'pending_review';
    }

    $exists = db()->prepare(
        'SELECT guide_user_id FROM gcv_guide_financial WHERE guide_user_id = ? AND deleted_at IS NULL'
    );
    $exists->execute([$guideUserId]);
    if ($exists->fetch()) {
        db()->prepare(
            'UPDATE gcv_guide_financial SET
              legal_name=?, person_type=?, cpf=?, cnpj=?, pix_key=?, pix_key_type=?, pix_holder_name=?,
              bank_name=?, bank_agency=?, bank_account=?, status=?, updated_at=NOW()
             WHERE guide_user_id=?'
        )->execute([
            $legalName, $personType, $cpf, $cnpj, $pixKey, $pixType, $holder,
            $bank, $agency, $account, $status, $guideUserId,
        ]);
    } else {
        db()->prepare(
            'INSERT INTO gcv_guide_financial (
              guide_user_id, legal_name, person_type, cpf, cnpj, pix_key, pix_key_type, pix_holder_name,
              bank_name, bank_agency, bank_account, status
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $guideUserId, $legalName, $personType, $cpf, $cnpj, $pixKey, $pixType, $holder,
            $bank, $agency, $account, $status,
        ]);
    }

    // Espelha campos essenciais em gcv_guides (compatibilidade)
    try {
        db()->prepare(
            'UPDATE gcv_guides SET
              pix_key=?, pix_key_type=?, pix_holder_name=?, cpf=COALESCE(?, cpf),
              cnpj=?, person_type=?, bank_name=?, bank_agency=?, bank_account=?
             WHERE user_id=?'
        )->execute([
            $pixKey, $pixType, $holder, $cpf, $cnpj, $personType, $bank, $agency, $account, $guideUserId,
        ]);
    } catch (Throwable $e) {
        // ignore
    }

    $after = gcv_guide_financial_get($guideUserId) ?: [];
    gcv_audit_diff('guide_financial', $guideUserId, $before, $after, $actorId ?? $guideUserId, $origin);
    return $after;
}
