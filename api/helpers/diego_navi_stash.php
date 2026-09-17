<?php
declare(strict_types=1);

/**
 * Stash temporário de foto + descrição do Diego Navi (recadastro do zero).
 * Não preenche telefone, CPF, PIX, cidade nem marca o perfil como completo.
 */

function gcv_diego_navi_stash_dir(): string
{
    return dirname(__DIR__) . '/data/_tmp_diego_navi';
}

function gcv_diego_navi_stash_path(): string
{
    return gcv_diego_navi_stash_dir() . '/profile.json';
}

function gcv_diego_navi_stash_email(): string
{
    return 'diegonavi82@gmail.com';
}

function gcv_diego_navi_stash_load(): ?array
{
    $file = gcv_diego_navi_stash_path();
    if (!is_readable($file)) {
        return null;
    }
    $data = json_decode((string)file_get_contents($file), true);
    return is_array($data) ? $data : null;
}

function gcv_diego_navi_stash_is_target_email(string $email): bool
{
    return strtolower(trim($email)) === gcv_diego_navi_stash_email();
}

function gcv_diego_navi_stash_bio_for_form(string $bio, int $max = 800): string
{
    $bio = trim($bio);
    if ($bio === '' || mb_strlen($bio) <= $max) {
        return $bio;
    }
    $parts = preg_split("/\n\n+/", $bio) ?: [$bio];
    $out = '';
    foreach ($parts as $p) {
        $p = trim((string)$p);
        if ($p === '') {
            continue;
        }
        $next = $out === '' ? $p : ($out . "\n\n" . $p);
        if (mb_strlen($next) > $max) {
            break;
        }
        $out = $next;
    }
    if ($out !== '') {
        return $out;
    }
    return rtrim(mb_substr($bio, 0, $max - 1)) . '…';
}

/**
 * Aplica só foto e bios se ainda estiverem vazios. Nunca aprova nem completa o perfil.
 */
function gcv_diego_navi_stash_apply_if_needed(int $userId, string $email): void
{
    if ($userId <= 0 || !gcv_diego_navi_stash_is_target_email($email)) {
        return;
    }
    $stash = gcv_diego_navi_stash_load();
    if (!$stash) {
        return;
    }
    $pdo = db();
    $pdo->prepare('INSERT IGNORE INTO gcv_guides (user_id) VALUES (?)')->execute([$userId]);

    $rowStmt = $pdo->prepare(
        'SELECT photo_url, photo_3x4_url, bio_pt, bio_en, bio_es FROM gcv_guides WHERE user_id = ? LIMIT 1'
    );
    $rowStmt->execute([$userId]);
    $row = $rowStmt->fetch(PDO::FETCH_ASSOC) ?: [];

    $photo = trim((string)($stash['photo_url'] ?? ''));
    $bioPt = gcv_diego_navi_stash_bio_for_form((string)($stash['bio_pt'] ?? ''));
    $bioEn = gcv_diego_navi_stash_bio_for_form((string)($stash['bio_en'] ?? ''));
    $bioEs = gcv_diego_navi_stash_bio_for_form((string)($stash['bio_es'] ?? ''));

    $curPhoto = trim((string)($row['photo_url'] ?? ''));
    $cur34 = trim((string)($row['photo_3x4_url'] ?? ''));
    $curBio = trim((string)($row['bio_pt'] ?? ''));

    $newPhoto = $curPhoto !== '' ? $curPhoto : $photo;
    $new34 = $cur34 !== '' ? $cur34 : $photo;
    $newBioPt = $curBio !== '' ? (string)$row['bio_pt'] : $bioPt;
    $newBioEn = trim((string)($row['bio_en'] ?? '')) !== '' ? (string)$row['bio_en'] : $bioEn;
    $newBioEs = trim((string)($row['bio_es'] ?? '')) !== '' ? (string)$row['bio_es'] : $bioEs;

    $changed = ($newPhoto !== $curPhoto)
        || ($new34 !== $cur34)
        || ($newBioPt !== $curBio)
        || ($newBioEn !== trim((string)($row['bio_en'] ?? '')))
        || ($newBioEs !== trim((string)($row['bio_es'] ?? '')));
    if (!$changed) {
        return;
    }

    // Só preenche foto/bio vazios. Nunca zera profile_complete nem aprovação.
    $pdo->prepare(
        'UPDATE gcv_guides SET
            photo_url = ?,
            photo_3x4_url = ?,
            bio_pt = ?,
            bio_en = ?,
            bio_es = ?
         WHERE user_id = ?'
    )->execute([$newPhoto, $new34, $newBioPt, $newBioEn, $newBioEs, $userId]);

    if ($newPhoto !== '') {
        try {
            $av = $pdo->prepare('SELECT avatar_url FROM gcv_users WHERE id = ? LIMIT 1');
            $av->execute([$userId]);
            $curAvatar = trim((string)($av->fetchColumn() ?: ''));
            if ($curAvatar === '') {
                $pdo->prepare('UPDATE gcv_users SET avatar_url = ? WHERE id = ?')
                    ->execute([$newPhoto, $userId]);
            }
        } catch (Throwable $e) {
            // ignore
        }
    }
}
