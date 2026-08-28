<?php
declare(strict_types=1);

/**
 * CRUD de guias no CMS admin (cadastro completo).
 * GET list / GET?id= / POST create / PUT update
 */
require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/guide_languages.php';
require_once __DIR__ . '/../helpers/guide_status.php';

header('Content-Type: application/json; charset=utf-8');
$admin = require_admin();
gcv_cms_ensure_schema();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function gcv_cms_guide_hydrate(array $row): array
{
    $row['languages'] = gcv_guide_languages_normalize($row['languages_json'] ?? null);
    $row['pix_ready'] = trim((string)($row['pix_key'] ?? '')) !== '';
    $row['was_approved'] = gcv_guide_was_approved($row);
    $row['profile_complete'] = (int)($row['profile_complete'] ?? 0) === 1;
    $row['account_label'] = gcv_guide_account_label((string)($row['status'] ?? ''), (bool)$row['was_approved']);
    if (($row['status'] ?? '') === 'pending' && !$row['profile_complete']) {
        $row['account_label'] = 'RASCUNHO';
    }
    return $row;
}

function gcv_cms_guide_select_sql(): string
{
    return 'SELECT u.id AS user_id, u.name, u.email, u.role, u.status, u.avatar_url,
                g.id AS guide_id, g.nickname, g.full_name, g.phone, g.phone_ddi, g.phone_iso,
                g.birth_date, g.base_city_id, g.cadastur, g.pix_key, g.pix_key_type, g.pix_holder_name,
                g.pix_verified_at, g.pix_verified_by,
                g.photo_url, g.diploma_url, g.association_doc_url, g.photo_3x4_url,
                g.bio_pt, g.bio_en, g.bio_es, g.languages_json, g.cpf, g.profile_complete, g.approved_at, g.approved_by,
                c.name AS base_city_name
         FROM gcv_users u
         LEFT JOIN gcv_guides g ON g.user_id = u.id
         LEFT JOIN gcv_cities c ON c.id = g.base_city_id';
}

function gcv_cms_guide_fetch(int $userId): ?array
{
    $select = gcv_cms_guide_select_sql();
    $queries = [
        $select . ' WHERE u.id = ? AND (u.role = \'guide\' OR EXISTS (
            SELECT 1 FROM gcv_user_roles r WHERE r.user_id = u.id AND r.role = \'guide\'
         ))',
        $select . ' WHERE u.id = ? AND u.role = \'guide\'',
    ];
    foreach ($queries as $sql) {
        try {
            $stmt = db()->prepare($sql);
            $stmt->execute([$userId]);
            $row = $stmt->fetch();
            if ($row) return gcv_cms_guide_hydrate($row);
        } catch (Throwable $e) {
            continue;
        }
    }
    return null;
}

function gcv_cms_guides_list(): array
{
    $order = ' ORDER BY CASE WHEN u.status = \'pending\' THEN 0 ELSE 1 END, COALESCE(g.full_name, u.name) ASC';
    $select = 'SELECT u.id AS user_id, u.name, u.email, u.status, u.avatar_url, g.nickname, g.full_name, g.phone, g.phone_ddi,
                g.cadastur, g.pix_key, g.pix_key_type, g.pix_holder_name, g.pix_verified_at, g.approved_at,
                g.photo_3x4_url, g.photo_url, g.languages_json, g.profile_complete, c.name AS base_city_name
         FROM gcv_users u
         LEFT JOIN gcv_guides g ON g.user_id = u.id
         LEFT JOIN gcv_cities c ON c.id = g.base_city_id';
    $queries = [
        $select . ' WHERE u.role = \'guide\' OR EXISTS (
            SELECT 1 FROM gcv_user_roles r WHERE r.user_id = u.id AND r.role = \'guide\'
         )' . $order,
        $select . ' WHERE u.role = \'guide\'' . $order,
    ];
    foreach ($queries as $sql) {
        try {
            $rows = db()->query($sql)->fetchAll();
            foreach ($rows as &$r) {
                $r = gcv_cms_guide_hydrate($r);
            }
            unset($r);
            return $rows;
        } catch (Throwable $e) {
            continue;
        }
    }
    return [];
}

function gcv_cms_allowed_guide_status(?string $status, string $fallback = 'active'): string
{
    $allowed = gcv_guide_account_statuses();
    return in_array((string)$status, $allowed, true) ? (string)$status : $fallback;
}

function gcv_cms_guide_set_status(array $admin, array $body): void
{
    $userId = (int)($body['user_id'] ?? 0);
    $status = gcv_cms_allowed_guide_status((string)($body['status'] ?? ''), '');
    if ($userId <= 0 || $status === '') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Dados inválidos']);
        return;
    }
    $current = gcv_cms_guide_fetch($userId);
    if (!$current) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Guia não encontrado']);
        return;
    }
    $currentStatus = (string)($current['status'] ?? '');
    $wasApproved = gcv_guide_was_approved($current);

    if ($status === 'suspended' && $currentStatus !== 'pending') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Recusar é só para cadastro novo. Perfil já aprovado deve ser cancelado.']);
        return;
    }
    if ($status === 'cancelled' && !$wasApproved) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Cancelar é só para perfil já aprovado. Cadastro novo deve ser recusado.']);
        return;
    }

    db()->prepare('UPDATE gcv_users SET status = ? WHERE id = ?')->execute([$status, $userId]);
    if ($status === 'active') {
        db()->prepare(
            'UPDATE gcv_guides SET approved_at = COALESCE(approved_at, NOW()), approved_by = COALESCE(approved_by, ?) WHERE user_id = ?'
        )->execute([(int)$admin['id'], $userId]);
    }
    echo json_encode(['ok' => true, 'data' => gcv_cms_guide_fetch($userId)]);
}

if ($method === 'GET') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id > 0) {
        $row = gcv_cms_guide_fetch($id);
        if (!$row) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Guia não encontrado']);
            exit;
        }
        echo json_encode(['ok' => true, 'data' => $row]);
        exit;
    }
    echo json_encode(['ok' => true, 'data' => ['guides' => gcv_cms_guides_list()]]);
    exit;
}

$body = gcv_cms_json_body();

if ($method === 'POST' && (string)($body['action'] ?? '') === 'set_status') {
    gcv_cms_guide_set_status($admin, $body);
    exit;
}

if ($method === 'POST') {
    $fullName = trim((string)($body['full_name'] ?? ''));
    $nickname = trim((string)($body['nickname'] ?? ''));
    $email = strtolower(trim((string)($body['email'] ?? '')));
    $phone = trim((string)($body['phone'] ?? ''));
    $pixKey = trim((string)($body['pix_key'] ?? ''));
    $pixType = (string)($body['pix_key_type'] ?? '');
    $photo34 = trim((string)($body['photo_3x4_url'] ?? ''));
    $diploma = trim((string)($body['diploma_url'] ?? ''));
    $birth = trim((string)($body['birth_date'] ?? ''));
    $cityId = isset($body['base_city_id']) ? (int)$body['base_city_id'] : 0;

    $missing = [];
    if ($fullName === '') $missing[] = 'Nome completo';
    if ($nickname === '') $missing[] = 'Apelido';
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $missing[] = 'E-mail';
    if ($phone === '') $missing[] = 'Telefone';
    if ($pixKey === '') $missing[] = 'Chave PIX';
    if (!in_array($pixType, ['cpf', 'cnpj', 'email', 'phone', 'random'], true)) $missing[] = 'Tipo de chave PIX';
    $photoUrl = trim((string)($body['photo_url'] ?? ''));
    if ($photo34 === '' && $photoUrl !== '') $photo34 = $photoUrl;
    if ($photoUrl === '' && $photo34 !== '') $photoUrl = $photo34;
    if ($photo34 === '' && $photoUrl === '') $missing[] = 'Foto';
    if ($birth === '') $missing[] = 'Data de nascimento';
    if ($cityId <= 0) $missing[] = 'Cidade base';
    if ($missing) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Campos obrigatórios: ' . implode(', ', $missing)]);
        exit;
    }

    $exists = db()->prepare('SELECT id FROM gcv_users WHERE email = ?');
    $exists->execute([$email]);
    if ($exists->fetch()) {
        http_response_code(409);
        echo json_encode(['ok' => false, 'error' => 'E-mail já cadastrado']);
        exit;
    }

    $password = (string)($body['password'] ?? '');
    $hash = $password !== '' ? password_hash($password, PASSWORD_DEFAULT) : null;
    $status = gcv_cms_allowed_guide_status((string)($body['status'] ?? 'active'), 'active');
    $diploma = trim((string)($body['diploma_url'] ?? '')) ?: null;
    $assoc = trim((string)($body['association_doc_url'] ?? '')) ?: null;
    $cadastur = trim((string)($body['cadastur'] ?? '')) ?: null;

    db()->beginTransaction();
    try {
        $stmt = db()->prepare(
            'INSERT INTO gcv_users (name, email, password_hash, role, status, email_verified, avatar_url)
             VALUES (?,?,?,?,?,1,?)'
        );
        $stmt->execute([$nickname ?: $fullName, $email, $hash, 'guide', $status, $photoUrl ?: $photo34]);
        $userId = (int)db()->lastInsertId();

        $stmt = db()->prepare(
            'INSERT INTO gcv_guides (
              user_id, nickname, full_name, phone, phone_ddi, phone_iso, birth_date, base_city_id,
              cadastur, pix_key, pix_key_type, pix_holder_name, photo_url, diploma_url,
              association_doc_url, photo_3x4_url, bio_pt, bio_en, bio_es, languages_json,
              profile_complete, approved_at, approved_by
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)'
        );
        $stmt->execute([
            $userId,
            $nickname,
            $fullName,
            $phone,
            trim((string)($body['phone_ddi'] ?? '+55')) ?: '+55',
            strtolower(substr(trim((string)($body['phone_iso'] ?? 'br')), 0, 2)) ?: 'br',
            $birth,
            $cityId,
            $cadastur,
            $pixKey,
            $pixType,
            trim((string)($body['pix_holder_name'] ?? $fullName)) ?: $fullName,
            $photoUrl ?: $photo34,
            $diploma,
            $assoc,
            $photo34 ?: $photoUrl,
            ($body['bio_pt'] ?? null),
            ($body['bio_en'] ?? null),
            ($body['bio_es'] ?? null),
            gcv_guide_languages_json($body['languages'] ?? $body['languages_json'] ?? ['pt']),
            $status === 'active' ? date('Y-m-d H:i:s') : null,
            $status === 'active' ? (int)$admin['id'] : null,
        ]);
        if ($pixKey !== '') {
            db()->prepare(
                'UPDATE gcv_guides SET pix_verified_at = NOW(), pix_verified_by = ? WHERE user_id = ?'
            )->execute([(int)$admin['id'], $userId]);
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        error_log('cms-guides POST: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Erro ao salvar guia']);
        exit;
    }

    echo json_encode(['ok' => true, 'data' => gcv_cms_guide_fetch($userId)]);
    exit;
}

if ($method === 'PUT') {
    $userId = (int)($body['user_id'] ?? 0);
    if ($userId <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'user_id obrigatório']);
        exit;
    }
    $current = gcv_cms_guide_fetch($userId);
    if (!$current) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Guia não encontrado']);
        exit;
    }

    $fullName = trim((string)($body['full_name'] ?? $current['full_name'] ?? ''));
    $nickname = trim((string)($body['nickname'] ?? $current['nickname'] ?? ''));
    $email = strtolower(trim((string)($body['email'] ?? $current['email'] ?? '')));
    $phone = trim((string)($body['phone'] ?? $current['phone'] ?? ''));
    $pixKey = trim((string)($body['pix_key'] ?? $current['pix_key'] ?? ''));
    $pixType = (string)($body['pix_key_type'] ?? $current['pix_key_type'] ?? '');
    $photo34 = trim((string)($body['photo_3x4_url'] ?? $current['photo_3x4_url'] ?? ''));
    $photoUrl = trim((string)($body['photo_url'] ?? $current['photo_url'] ?? ''));
    if ($photo34 === '' && $photoUrl !== '') $photo34 = $photoUrl;
    if ($photoUrl === '' && $photo34 !== '') $photoUrl = $photo34;
    $diploma = trim((string)($body['diploma_url'] ?? $current['diploma_url'] ?? '')) ?: null;
    $birth = trim((string)($body['birth_date'] ?? $current['birth_date'] ?? ''));
    $cityId = (int)($body['base_city_id'] ?? $current['base_city_id'] ?? 0);

    $missing = [];
    if ($fullName === '') $missing[] = 'Nome completo';
    if ($nickname === '') $missing[] = 'Apelido';
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) $missing[] = 'E-mail';
    if ($phone === '') $missing[] = 'Telefone';
    if ($pixKey === '') $missing[] = 'Chave PIX';
    if (!in_array($pixType, ['cpf', 'cnpj', 'email', 'phone', 'random'], true)) $missing[] = 'Tipo de chave PIX';
    if ($photo34 === '' && $photoUrl === '') $missing[] = 'Foto';
    if ($birth === '') $missing[] = 'Data de nascimento';
    if ($cityId <= 0) $missing[] = 'Cidade base';
    if ($missing) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Campos obrigatórios: ' . implode(', ', $missing)]);
        exit;
    }

    $status = gcv_cms_allowed_guide_status(
        (string)($body['status'] ?? $current['status'] ?? 'pending'),
        (string)($current['status'] ?? 'pending')
    );
    $pixChanged = strcasecmp($pixKey, trim((string)($current['pix_key'] ?? ''))) !== 0;
    $pixHolder = trim((string)($body['pix_holder_name'] ?? $current['pix_holder_name'] ?? $fullName)) ?: $fullName;

    db()->beginTransaction();
    try {
        db()->prepare('UPDATE gcv_users SET name=?, email=?, status=?, avatar_url=COALESCE(?, avatar_url) WHERE id=?')
            ->execute([$nickname ?: $fullName, $email, $status, $photoUrl ?: $photo34 ?: null, $userId]);

        if (!empty($current['guide_id'])) {
            db()->prepare(
                'UPDATE gcv_guides SET nickname=?, full_name=?, phone=?, phone_ddi=?, phone_iso=?, birth_date=?,
                 base_city_id=?, cadastur=?, pix_key=?, pix_key_type=?, pix_holder_name=?, photo_url=?,
                 diploma_url=?, association_doc_url=?, photo_3x4_url=?, bio_pt=?, bio_en=?, bio_es=?,
                 languages_json=?, profile_complete=1,
                 pix_verified_at=?, pix_verified_by=? WHERE user_id=?'
            )->execute([
                $nickname,
                $fullName,
                $phone,
                trim((string)($body['phone_ddi'] ?? $current['phone_ddi'] ?? '+55')) ?: '+55',
                strtolower(substr(trim((string)($body['phone_iso'] ?? $current['phone_iso'] ?? 'br')), 0, 2)) ?: 'br',
                $birth,
                $cityId,
                array_key_exists('cadastur', $body)
                    ? (trim((string)$body['cadastur']) ?: null)
                    : ($current['cadastur'] ?? null),
                $pixKey,
                $pixType,
                $pixHolder,
                $photoUrl ?: $photo34,
                $diploma,
                array_key_exists('association_doc_url', $body)
                    ? (trim((string)$body['association_doc_url']) ?: null)
                    : ($current['association_doc_url'] ?? null),
                $photo34 ?: $photoUrl,
                ($body['bio_pt'] ?? $current['bio_pt'] ?? null),
                ($body['bio_en'] ?? $current['bio_en'] ?? null),
                ($body['bio_es'] ?? $current['bio_es'] ?? null),
                gcv_guide_languages_json(
                    $body['languages'] ?? $body['languages_json'] ?? ($current['languages'] ?? $current['languages_json'] ?? ['pt'])
                ),
                $pixKey !== '' ? date('Y-m-d H:i:s') : null,
                $pixKey !== '' ? (int)$admin['id'] : null,
                $userId,
            ]);
        } else {
            db()->prepare(
                'INSERT INTO gcv_guides (
                  user_id, nickname, full_name, phone, phone_ddi, phone_iso, birth_date, base_city_id,
                  pix_key, pix_key_type, pix_holder_name, photo_url, photo_3x4_url, bio_pt, profile_complete
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)'
            )->execute([
                $userId, $nickname, $fullName, $phone,
                trim((string)($body['phone_ddi'] ?? '+55')) ?: '+55',
                strtolower(substr(trim((string)($body['phone_iso'] ?? 'br')), 0, 2)) ?: 'br',
                $birth, $cityId,
                $pixKey, $pixType, $pixHolder, $photoUrl ?: $photo34, $photo34 ?: $photoUrl,
                ($body['bio_pt'] ?? null),
            ]);
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Erro ao atualizar guia']);
        exit;
    }

    echo json_encode(['ok' => true, 'data' => gcv_cms_guide_fetch($userId)]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
