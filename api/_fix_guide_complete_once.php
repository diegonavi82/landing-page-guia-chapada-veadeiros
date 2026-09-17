<?php
/**
 * ONE-SHOT: marca profile_complete=1 nos guias pending que já enviaram cadastro completo.
 * https://www.guiachapadaveadeiros.com/api/_fix_guide_complete_once.php?key=GCV-MKT-2026
 */
declare(strict_types=1);
header('Content-Type: text/plain; charset=utf-8');

if ((string)($_GET['key'] ?? '') !== 'GCV-MKT-2026') {
    http_response_code(403);
    echo "Forbidden\n";
    exit;
}

require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/guide_profile.php';
require_once __DIR__ . '/helpers/marketplace/guide_financial_service.php';

$pdo = db();
$rows = $pdo->query(
    "SELECT g.user_id, u.email, u.status, g.full_name, g.profile_complete
     FROM gcv_guides g
     JOIN gcv_users u ON u.id = g.user_id
     WHERE u.status IN ('pending','suspended')
        OR LOWER(u.email) = 'diegonavi82@gmail.com'"
)->fetchAll(PDO::FETCH_ASSOC) ?: [];

$ok = 0;
$skip = 0;
foreach ($rows as $row) {
    $uid = (int)$row['user_id'];
    $complete = gcv_guide_profile_is_complete($uid);
    echo $row['email'] . ' status=' . $row['status']
        . ' was_complete=' . (int)$row['profile_complete']
        . ' now_complete=' . ($complete ? 1 : 0)
        . ' name=' . ($row['full_name'] ?: '-') . "\n";
    if ($complete) {
        $pdo->prepare('UPDATE gcv_guides SET profile_complete = 1 WHERE user_id = ?')->execute([$uid]);
        $ok++;
    } else {
        $skip++;
    }
}
echo "FEITO: marked={$ok} still_incomplete={$skip}\n";
