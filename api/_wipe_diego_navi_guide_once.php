<?php
/**
 * ONE-SHOT: apaga TODOS os registros do guia Diego Navi Marques Carvalho
 * (diegonavi82@gmail.com) para recadastro do zero.
 * Preserva foto + descrição em api/data/_tmp_diego_navi/
 *
 * https://www.guiachapadaveadeiros.com/api/_wipe_diego_navi_guide_once.php?key=GCV-MKT-2026
 * Apague depois de rodar.
 */
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

if ((string)($_GET['key'] ?? '') !== 'GCV-MKT-2026') {
    http_response_code(403);
    echo "Forbidden\n";
    exit;
}

require_once __DIR__ . '/helpers/db.php';

function out(string $m): void
{
    echo $m . "\n";
}

function table_exists(PDO $pdo, string $table): bool
{
    $st = $pdo->prepare(
        'SELECT 1 FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1'
    );
    $st->execute([$table]);
    return (bool)$st->fetchColumn();
}

function table_columns(PDO $pdo, string $table): array
{
    try {
        $rows = $pdo->query('SHOW COLUMNS FROM `' . str_replace('`', '', $table) . '`')->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        return [];
    }
    $out = [];
    foreach ($rows as $r) {
        $out[strtolower((string)$r['Field'])] = (string)$r['Field'];
    }
    return $out;
}

function run_sql(PDO $pdo, string $label, string $sql, array $params = []): void
{
    try {
        $st = $pdo->prepare($sql);
        $st->execute($params);
        out('OK ' . $label . ' rows=' . $st->rowCount());
    } catch (Throwable $e) {
        out('ERR ' . $label . ': ' . substr($e->getMessage(), 0, 220));
    }
}

$email = 'diegonavi82@gmail.com';
$keepAdminEmail = 'diegocsp82@gmail.com';

try {
    $pdo = db();
    out('OK: conectado');
} catch (Throwable $e) {
    http_response_code(500);
    out('ERRO DB: ' . $e->getMessage());
    exit;
}

$st = $pdo->prepare(
    "SELECT u.id, u.email, u.name, u.role, u.status, u.google_id, u.avatar_url,
            g.id AS guide_id, g.full_name, g.nickname, g.photo_url, g.photo_3x4_url,
            g.bio_pt, g.bio_en, g.bio_es, g.phone, g.cpf, g.pix_key, g.profile_complete, g.approved_at
     FROM gcv_users u
     LEFT JOIN gcv_guides g ON g.user_id = u.id
     WHERE LOWER(u.email) = ?
        OR (g.full_name IS NOT NULL AND LOWER(g.full_name) = LOWER(?))
     ORDER BY u.id ASC"
);
$st->execute([$email, 'Diego Navi Marques Carvalho']);
$found = $st->fetchAll(PDO::FETCH_ASSOC) ?: [];

$targets = [];
foreach ($found as $row) {
    $rowEmail = strtolower(trim((string)($row['email'] ?? '')));
    if ($rowEmail === $keepAdminEmail) {
        out('SKIP admin ' . $keepAdminEmail . ' user_id=' . $row['id']);
        continue;
    }
    $targets[] = $row;
}

if (!$targets) {
    out('Nenhum usuário-alvo encontrado para ' . $email);
    $check = $pdo->prepare('SELECT id, email FROM gcv_users WHERE LOWER(email)=?');
    $check->execute([$email]);
    $left = $check->fetchAll(PDO::FETCH_ASSOC) ?: [];
    out('Confirmacao gcv_users email: ' . json_encode($left, JSON_UNESCAPED_UNICODE));
    out('FEITO (nada a apagar)');
    exit;
}

$ids = [];
foreach ($targets as $row) {
    $ids[] = (int)$row['id'];
    out('ALVO user_id=' . $row['id'] . ' email=' . $row['email'] . ' name=' . $row['name']
        . ' role=' . $row['role'] . ' status=' . $row['status']
        . ' full_name=' . ($row['full_name'] ?? ''));
}
$idList = implode(',', array_map('intval', $ids));
$in = implode(',', array_fill(0, count($ids), '?'));

$primary = $targets[0];
$stashDir = __DIR__ . '/data/_tmp_diego_navi';
if (!is_dir($stashDir)) {
    @mkdir($stashDir, 0755, true);
}

$localPhoto = '/assets/img/imagens/guia-diego-navi.webp';
$photoUrl = trim((string)($primary['photo_3x4_url'] ?: $primary['photo_url'] ?: $primary['avatar_url'] ?: $localPhoto));
$stash = [
    'email' => $email,
    'full_name' => (string)($primary['full_name'] ?: 'Diego Navi Marques Carvalho'),
    'nickname' => (string)($primary['nickname'] ?: 'Diego Navi'),
    'photo_url' => $photoUrl !== '' ? $photoUrl : $localPhoto,
    'photo_file' => 'photo.webp',
    'photo_file_png' => 'photo.png',
    'saved_from_user_id' => (int)$primary['id'],
    'saved_at' => gmdate('c'),
    'note' => 'Arquivo temporário para recadastro do zero. Só foto e descrição são reaproveitadas.',
    'bio_pt' => (string)($primary['bio_pt'] ?? ''),
    'bio_en' => (string)($primary['bio_en'] ?? ''),
    'bio_es' => (string)($primary['bio_es'] ?? ''),
];
file_put_contents(
    $stashDir . '/profile.json',
    json_encode($stash, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)
);
out('STASH gravado em api/data/_tmp_diego_navi/profile.json');
out('STASH_JSON_BEGIN');
out(json_encode($stash, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
out('STASH_JSON_END');

$publicRoot = dirname(__DIR__);
$relPhoto = ltrim((string)parse_url($photoUrl, PHP_URL_PATH), '/');
$srcPhoto = $publicRoot . '/' . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $relPhoto);
if (is_file($srcPhoto)) {
    $ext = strtolower(pathinfo($srcPhoto, PATHINFO_EXTENSION) ?: 'webp');
    $destName = $ext === 'png' ? 'photo.png' : 'photo.webp';
    @copy($srcPhoto, $stashDir . '/' . $destName);
    out('STASH foto copiada: ' . $destName . ' from ' . $relPhoto);
} else {
    out('STASH foto origem não encontrada no disco: ' . $srcPhoto);
}

out('');
out('--- inventario ---');
$scan = [
    'gcv_sessions' => ['user_id'],
    'gcv_password_resets' => ['user_id'],
    'gcv_user_roles' => ['user_id'],
    'gcv_inbox' => ['user_id'],
    'gcv_client_profiles' => ['user_id'],
    'gcv_guides' => ['user_id'],
    'gcv_guide_financial' => ['guide_user_id', 'verified_by'],
    'gcv_guide_reviews' => ['guide_user_id'],
    'gcv_guide_payouts' => ['guide_user_id', 'created_by', 'confirmed_by'],
    'gcv_guide_payout_audit' => ['admin_id'],
    'gcv_sale_payouts' => ['guide_user_id', 'responsible_user_id'],
    'gcv_sales' => ['guide_user_id', 'tourist_user_id'],
    'gcv_tours' => ['guide_id', 'approved_by'],
    'gcv_bookings' => ['client_id'],
    'gcv_excursions' => ['guide_user_id', 'created_by', 'updated_by', 'approved_by'],
    'gcv_audit_log' => ['user_id'],
    'gcv_commission_rules' => ['created_by', 'updated_by'],
    'gcv_media' => ['uploaded_by'],
    'gcv_articles' => ['created_by', 'updated_by'],
    'gcv_attractions' => ['created_by', 'updated_by'],
    'gcv_settings' => ['updated_by'],
    'gcv_users' => ['id'],
];
foreach ($scan as $table => $colsWanted) {
    if (!table_exists($pdo, $table)) {
        continue;
    }
    $cols = table_columns($pdo, $table);
    foreach ($colsWanted as $want) {
        if (!isset($cols[$want])) {
            continue;
        }
        $col = $cols[$want];
        $q = $pdo->prepare("SELECT COUNT(*) FROM `{$table}` WHERE `{$col}` IN ({$in})");
        $q->execute($ids);
        out($table . '.' . $col . '=' . (int)$q->fetchColumn());
    }
}

$fallbackAdminId = 0;
try {
    $a = $pdo->prepare('SELECT id FROM gcv_users WHERE LOWER(email)=? LIMIT 1');
    $a->execute([$keepAdminEmail]);
    $fallbackAdminId = (int)$a->fetchColumn();
} catch (Throwable $e) {
    $fallbackAdminId = 0;
}
out('fallback_admin_id=' . $fallbackAdminId . ' (' . $keepAdminEmail . ')');

out('');
out('--- limpeza ---');
$pdo->beginTransaction();
try {
    $tourIds = [];
    if (table_exists($pdo, 'gcv_tours') && isset(table_columns($pdo, 'gcv_tours')['guide_id'])) {
        $q = $pdo->prepare("SELECT id FROM gcv_tours WHERE guide_id IN ({$in})");
        $q->execute($ids);
        $tourIds = array_map('intval', $q->fetchAll(PDO::FETCH_COLUMN) ?: []);
    }

    run_sql($pdo, 'sessions', "DELETE FROM gcv_sessions WHERE user_id IN ({$in})", $ids);
    if (table_exists($pdo, 'gcv_password_resets')) {
        run_sql($pdo, 'password_resets', "DELETE FROM gcv_password_resets WHERE user_id IN ({$in})", $ids);
    }
    if (table_exists($pdo, 'gcv_user_roles')) {
        run_sql($pdo, 'user_roles', "DELETE FROM gcv_user_roles WHERE user_id IN ({$in})", $ids);
    }
    if (table_exists($pdo, 'gcv_inbox')) {
        run_sql($pdo, 'inbox', "DELETE FROM gcv_inbox WHERE user_id IN ({$in})", $ids);
    }
    if (table_exists($pdo, 'gcv_client_profiles')) {
        run_sql($pdo, 'client_profiles', "DELETE FROM gcv_client_profiles WHERE user_id IN ({$in})", $ids);
    }
    if (table_exists($pdo, 'gcv_guide_financial')) {
        run_sql($pdo, 'guide_financial', "DELETE FROM gcv_guide_financial WHERE guide_user_id IN ({$in})", $ids);
        if (isset(table_columns($pdo, 'gcv_guide_financial')['verified_by'])) {
            run_sql($pdo, 'guide_financial.verified_by NULL', "UPDATE gcv_guide_financial SET verified_by=NULL WHERE verified_by IN ({$in})", $ids);
        }
    }
    if (table_exists($pdo, 'gcv_guide_reviews')) {
        run_sql($pdo, 'guide_reviews', "DELETE FROM gcv_guide_reviews WHERE guide_user_id IN ({$in})", $ids);
    }

    if (table_exists($pdo, 'gcv_guide_payouts')) {
        $payoutCols = table_columns($pdo, 'gcv_guide_payouts');
        if (isset($payoutCols['guide_user_id'])) {
            $payoutIds = [];
            $q = $pdo->prepare("SELECT id FROM gcv_guide_payouts WHERE guide_user_id IN ({$in})");
            $q->execute($ids);
            $payoutIds = array_map('intval', $q->fetchAll(PDO::FETCH_COLUMN) ?: []);
            if ($payoutIds && table_exists($pdo, 'gcv_guide_payout_audit')) {
                $pin = implode(',', array_fill(0, count($payoutIds), '?'));
                run_sql($pdo, 'payout_audit by payout', "DELETE FROM gcv_guide_payout_audit WHERE payout_id IN ({$pin})", $payoutIds);
            }
            run_sql($pdo, 'guide_payouts as guide', "DELETE FROM gcv_guide_payouts WHERE guide_user_id IN ({$in})", $ids);
        }
        if (isset($payoutCols['created_by']) && $fallbackAdminId > 0) {
            run_sql($pdo, 'guide_payouts.created_by reassign', "UPDATE gcv_guide_payouts SET created_by=? WHERE created_by IN ({$in})", array_merge([$fallbackAdminId], $ids));
        }
        if (isset($payoutCols['confirmed_by'])) {
            run_sql($pdo, 'guide_payouts.confirmed_by NULL', "UPDATE gcv_guide_payouts SET confirmed_by=NULL WHERE confirmed_by IN ({$in})", $ids);
        }
    }
    if (table_exists($pdo, 'gcv_guide_payout_audit') && isset(table_columns($pdo, 'gcv_guide_payout_audit')['admin_id'])) {
        run_sql($pdo, 'payout_audit admin', "DELETE FROM gcv_guide_payout_audit WHERE admin_id IN ({$in})", $ids);
    }

    if (table_exists($pdo, 'gcv_sale_payouts')) {
        $sp = table_columns($pdo, 'gcv_sale_payouts');
        if (isset($sp['guide_user_id'])) {
            run_sql($pdo, 'sale_payouts as guide', "DELETE FROM gcv_sale_payouts WHERE guide_user_id IN ({$in})", $ids);
        }
        if (isset($sp['responsible_user_id']) && $fallbackAdminId > 0) {
            run_sql($pdo, 'sale_payouts.responsible reassign', "UPDATE gcv_sale_payouts SET responsible_user_id=? WHERE responsible_user_id IN ({$in})", array_merge([$fallbackAdminId], $ids));
        }
    }

    if (table_exists($pdo, 'gcv_sales')) {
        $sc = table_columns($pdo, 'gcv_sales');
        if (isset($sc['guide_user_id'])) {
            run_sql($pdo, 'sales.guide_user_id NULL', "UPDATE gcv_sales SET guide_user_id=NULL WHERE guide_user_id IN ({$in})", $ids);
        }
        if (isset($sc['tourist_user_id'])) {
            run_sql($pdo, 'sales.tourist_user_id NULL', "UPDATE gcv_sales SET tourist_user_id=NULL WHERE tourist_user_id IN ({$in})", $ids);
        }
    }

    if ($tourIds && table_exists($pdo, 'gcv_bookings')) {
        $tin = implode(',', array_fill(0, count($tourIds), '?'));
        run_sql($pdo, 'bookings of tours', "DELETE FROM gcv_bookings WHERE tour_id IN ({$tin})", $tourIds);
    }
    if (table_exists($pdo, 'gcv_bookings') && isset(table_columns($pdo, 'gcv_bookings')['client_id'])) {
        run_sql($pdo, 'bookings as client', "DELETE FROM gcv_bookings WHERE client_id IN ({$in})", $ids);
    }
    if (table_exists($pdo, 'gcv_tours')) {
        $tc = table_columns($pdo, 'gcv_tours');
        if (isset($tc['guide_id'])) {
            run_sql($pdo, 'tours', "DELETE FROM gcv_tours WHERE guide_id IN ({$in})", $ids);
        }
        if (isset($tc['approved_by'])) {
            run_sql($pdo, 'tours.approved_by NULL', "UPDATE gcv_tours SET approved_by=NULL WHERE approved_by IN ({$in})", $ids);
        }
    }

    if (table_exists($pdo, 'gcv_excursions')) {
        $ec = table_columns($pdo, 'gcv_excursions');
        foreach (['guide_user_id', 'created_by', 'updated_by', 'approved_by'] as $col) {
            if (isset($ec[$col])) {
                run_sql($pdo, "excursions.{$col} NULL", "UPDATE gcv_excursions SET `{$col}`=NULL WHERE `{$col}` IN ({$in})", $ids);
            }
        }
    }

    $nullSets = [
        'gcv_audit_log' => ['user_id'],
        'gcv_commission_rules' => ['created_by', 'updated_by'],
        'gcv_media' => ['uploaded_by'],
        'gcv_articles' => ['created_by', 'updated_by'],
        'gcv_attractions' => ['created_by', 'updated_by'],
        'gcv_settings' => ['updated_by'],
        'gcv_guides' => ['approved_by', 'pix_verified_by'],
    ];
    foreach ($nullSets as $table => $colsWanted) {
        if (!table_exists($pdo, $table)) {
            continue;
        }
        $cols = table_columns($pdo, $table);
        foreach ($colsWanted as $want) {
            if (!isset($cols[$want])) {
                continue;
            }
            run_sql($pdo, "{$table}.{$want} NULL", "UPDATE `{$table}` SET `{$want}`=NULL WHERE `{$want}` IN ({$in})", $ids);
        }
    }

    run_sql($pdo, 'guides', "DELETE FROM gcv_guides WHERE user_id IN ({$in})", $ids);

    try {
        $fks = $pdo->query(
            "SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME
             FROM information_schema.KEY_COLUMN_USAGE
             WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
               AND REFERENCED_TABLE_NAME = 'gcv_users'
               AND TABLE_NAME <> 'gcv_users'"
        )->fetchAll(PDO::FETCH_ASSOC) ?: [];
        foreach ($fks as $fk) {
            $t = (string)$fk['TABLE_NAME'];
            $c = (string)$fk['COLUMN_NAME'];
            if (!table_exists($pdo, $t)) {
                continue;
            }
            $nullable = true;
            try {
                $colInfo = $pdo->query('SHOW COLUMNS FROM `' . str_replace('`', '', $t) . '` LIKE ' . $pdo->quote($c))->fetch(PDO::FETCH_ASSOC);
                $nullable = strtoupper((string)($colInfo['Null'] ?? 'YES')) === 'YES';
            } catch (Throwable $e) {
                $nullable = true;
            }
            if ($nullable) {
                run_sql($pdo, "fk {$t}.{$c} NULL", "UPDATE `{$t}` SET `{$c}`=NULL WHERE `{$c}` IN ({$in})", $ids);
            } else {
                run_sql($pdo, "fk {$t}.{$c} DELETE", "DELETE FROM `{$t}` WHERE `{$c}` IN ({$in})", $ids);
            }
        }
    } catch (Throwable $e) {
        out('AVISO fk scan: ' . $e->getMessage());
    }

    $delUsers = $pdo->prepare("DELETE FROM gcv_users WHERE id IN ({$in})");
    $delUsers->execute($ids);
    out('OK users rows=' . $delUsers->rowCount());

    $pdo->commit();
    out('COMMIT');
} catch (Throwable $e) {
    $pdo->rollBack();
    http_response_code(500);
    out('ROLLBACK: ' . $e->getMessage());
    exit;
}

out('');
out('--- verificacao ---');
$left = $pdo->prepare('SELECT id, email, name, role, status FROM gcv_users WHERE LOWER(email)=? OR id IN (' . $idList . ')');
$left->execute([$email]);
$leftRows = $left->fetchAll(PDO::FETCH_ASSOC) ?: [];
out('gcv_users restantes do email: ' . json_encode($leftRows, JSON_UNESCAPED_UNICODE));

$gLeft = $pdo->prepare(
    "SELECT g.id, g.user_id, g.full_name FROM gcv_guides g
     LEFT JOIN gcv_users u ON u.id = g.user_id
     WHERE g.user_id IN ({$idList}) OR LOWER(COALESCE(g.full_name,'')) = LOWER(?)"
);
$gLeft->execute(['Diego Navi Marques Carvalho']);
out('gcv_guides restantes: ' . json_encode($gLeft->fetchAll(PDO::FETCH_ASSOC) ?: [], JSON_UNESCAPED_UNICODE));

out('email livre para cadastro: ' . ($leftRows ? 'NAO' : 'SIM'));
out('FEITO');
