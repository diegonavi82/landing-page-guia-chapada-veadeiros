<?php
/**
 * ONE-SHOT: zera o perfil do guia Diego Navi Marques Carvalho.
 * Mantém só foto + biografias (pt/en/es) para o recadastro.
 *
 * https://www.guiachapadaveadeiros.com/api/_reset_diego_navi_profile_once.php?key=GCV-MKT-2026
 */
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

if ((string)($_GET['key'] ?? '') !== 'GCV-MKT-2026') {
    http_response_code(403);
    echo "Forbidden\n";
    exit;
}

require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/diego_navi_stash.php';

function out(string $m): void
{
    echo $m . "\n";
}

function pick_bio(string $db, string $stash): string
{
    $db = trim($db);
    $stash = trim($stash);
    if ($stash !== '' && mb_strlen($stash) >= mb_strlen($db)) {
        return $stash;
    }
    return $db !== '' ? $db : $stash;
}

$keepAdmin = 'diegocsp82@gmail.com';
$guideEmail = 'diegonavi82@gmail.com';
$localPhoto = '/assets/img/imagens/guia-diego-navi.webp';
$keepCols = ['id', 'user_id', 'photo_url', 'photo_3x4_url', 'bio_pt', 'bio_en', 'bio_es', 'created_at', 'updated_at'];

try {
    $pdo = db();
    out('OK db');
} catch (Throwable $e) {
    out('ERRO db: ' . $e->getMessage());
    exit;
}

$st = $pdo->prepare(
    "SELECT u.id, u.email, u.name, u.role, u.status,
            g.id AS guide_id, g.full_name, g.nickname,
            g.photo_url, g.photo_3x4_url, g.bio_pt, g.bio_en, g.bio_es
     FROM gcv_users u
     LEFT JOIN gcv_guides g ON g.user_id = u.id
     WHERE LOWER(u.email) = ?
        OR (
            LOWER(u.email) <> ?
            AND (
                LOWER(TRIM(COALESCE(g.full_name,''))) = 'diego navi marques carvalho'
                OR LOWER(TRIM(COALESCE(g.nickname,''))) IN ('diego navi', 'diego navi marques carvalho')
            )
        )
     ORDER BY u.id ASC"
);
$st->execute([$guideEmail, $keepAdmin]);
$found = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
if (!$found) {
    out('Nenhum perfil encontrado');
    out('FEITO');
    exit;
}

$stash = gcv_diego_navi_stash_load() ?: [];

foreach ($found as $row) {
    $uid = (int)$row['id'];
    $email = strtolower(trim((string)$row['email']));
    out('ALVO user_id=' . $uid . ' email=' . $email . ' status=' . $row['status'] . ' full_name=' . ($row['full_name'] ?? ''));

    if ($email === $keepAdmin) {
        out('SKIP admin ' . $keepAdmin);
        continue;
    }

    $photo = trim((string)($row['photo_3x4_url'] ?: $row['photo_url'] ?: $stash['photo_url'] ?? $localPhoto));
    if ($photo === '') {
        $photo = $localPhoto;
    }
    $bioPt = pick_bio((string)($row['bio_pt'] ?? ''), (string)($stash['bio_pt'] ?? ''));
    $bioEn = pick_bio((string)($row['bio_en'] ?? ''), (string)($stash['bio_en'] ?? ''));
    $bioEs = pick_bio((string)($row['bio_es'] ?? ''), (string)($stash['bio_es'] ?? ''));

    $stashDir = gcv_diego_navi_stash_dir();
    if (!is_dir($stashDir)) {
        @mkdir($stashDir, 0755, true);
    }
    $stashOut = [
        'email' => $guideEmail,
        'full_name' => 'Diego Navi Marques Carvalho',
        'nickname' => 'Diego Navi',
        'photo_url' => $photo,
        'photo_file' => 'photo.webp',
        'photo_file_png' => 'photo.png',
        'saved_from_user_id' => $uid,
        'saved_at' => gmdate('c'),
        'note' => 'Só foto e biografia são reaproveitadas no recadastro.',
        'bio_pt' => $bioPt,
        'bio_en' => $bioEn,
        'bio_es' => $bioEs,
    ];
    file_put_contents(
        $stashDir . '/profile.json',
        json_encode($stashOut, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)
    );
    out('STASH atualizado');

    $pdo->prepare('INSERT IGNORE INTO gcv_guides (user_id) VALUES (?)')->execute([$uid]);

    $cols = [];
    try {
        foreach ($pdo->query('SHOW COLUMNS FROM gcv_guides')->fetchAll(PDO::FETCH_ASSOC) ?: [] as $c) {
            $cols[strtolower((string)$c['Field'])] = $c;
        }
    } catch (Throwable $e) {
        out('ERR columns: ' . $e->getMessage());
        continue;
    }

    $sets = [];
    $params = [];
    foreach ($cols as $low => $c) {
        $name = (string)$c['Field'];
        $nullOk = strtoupper((string)$c['Null']) === 'YES';
        $extra = strtolower((string)($c['Extra'] ?? ''));
        $type = strtolower((string)($c['Type'] ?? ''));
        if (in_array($low, $keepCols, true) || str_contains($extra, 'auto_increment')) {
            continue;
        }
        if ($low === 'profile_complete' || $low === 'needs_resubmit') {
            $sets[] = "`{$name}` = 0";
            continue;
        }
        if ($low === 'languages_json') {
            $sets[] = "`{$name}` = ?";
            $params[] = '["pt"]';
            continue;
        }
        if ($nullOk) {
            $sets[] = "`{$name}` = NULL";
            continue;
        }
        if (preg_match('/^(tinyint|smallint|int|bigint|decimal|float|double)/', $type)) {
            $sets[] = "`{$name}` = 0";
            continue;
        }
        $sets[] = "`{$name}` = ''";
    }
    $sets[] = 'photo_url = ?';
    $params[] = $photo;
    if (isset($cols['photo_3x4_url'])) {
        $sets[] = 'photo_3x4_url = ?';
        $params[] = $photo;
    }
    $sets[] = 'bio_pt = ?';
    $params[] = gcv_diego_navi_stash_bio_for_form($bioPt);
    if (isset($cols['bio_en'])) {
        $sets[] = 'bio_en = ?';
        $params[] = gcv_diego_navi_stash_bio_for_form($bioEn);
    }
    if (isset($cols['bio_es'])) {
        $sets[] = 'bio_es = ?';
        $params[] = gcv_diego_navi_stash_bio_for_form($bioEs);
    }
    $params[] = $uid;
    $pdo->prepare('UPDATE gcv_guides SET ' . implode(', ', $sets) . ' WHERE user_id = ?')->execute($params);
    out('OK guides stripped');

    try {
        $pdo->prepare(
            'UPDATE gcv_users SET avatar_url = ? WHERE id = ? AND (avatar_url IS NULL OR avatar_url = \'\')'
        )->execute([$photo, $uid]);
        $pdo->prepare("UPDATE gcv_users SET status = 'pending' WHERE id = ?")->execute([$uid]);
        out('OK user status=pending');
    } catch (Throwable $e) {
        out('ERR users: ' . $e->getMessage());
    }

    try {
        $delFin = $pdo->prepare('DELETE FROM gcv_guide_financial WHERE guide_user_id = ?');
        $delFin->execute([$uid]);
        out('OK financial deleted rows=' . $delFin->rowCount());
    } catch (Throwable $e) {
        try {
            $pdo->prepare(
                "UPDATE gcv_guide_financial
                 SET legal_name='', pix_key='', pix_key_type='cpf', pix_holder_name='',
                     cpf=NULL, cnpj=NULL, status='incomplete', verified_at=NULL, verified_by=NULL, deleted_at=NOW()
                 WHERE guide_user_id = ?"
            )->execute([$uid]);
            out('OK financial cleared');
        } catch (Throwable $e2) {
            out('ERR financial: ' . $e2->getMessage());
        }
    }

    try {
        $ex = $pdo->prepare(
            "UPDATE gcv_excursions SET status = 'draft'
             WHERE guide_user_id = ? AND deleted_at IS NULL AND status IN ('published','soldout','pending_approval')"
        );
        $ex->execute([$uid]);
        out('OK excursions retracted rows=' . $ex->rowCount());
    } catch (Throwable $e) {
        out('ERR excursions: ' . $e->getMessage());
    }
}

$check = $pdo->prepare(
    "SELECT u.id, u.email, u.status, g.full_name, g.nickname, g.phone, g.cpf, g.pix_key,
            g.cadastur, g.birth_date, g.sexo, g.base_city_id, g.profile_complete, g.approved_at,
            g.id_document_url, CHAR_LENGTH(g.bio_pt) AS bio_len, g.photo_3x4_url, g.photo_url
     FROM gcv_users u
     LEFT JOIN gcv_guides g ON g.user_id = u.id
     WHERE LOWER(u.email) = ?"
);
$check->execute([$guideEmail]);
out('VERIFY ' . json_encode($check->fetch(PDO::FETCH_ASSOC) ?: [], JSON_UNESCAPED_UNICODE));
out('FEITO');
