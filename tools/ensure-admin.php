<?php
/**
 * Promove diegocsp82@gmail.com a admin e define senha se faltar.
 *
 * Uso na Hostinger (SSH / PHP CLI) ou via browser uma vez (depois APAGUE o arquivo):
 *   php tools/ensure-admin.php
 *   php tools/ensure-admin.php 'SuaSenhaForte123'
 *
 * Sem argumento de senha: só promove o role; se não houver password_hash,
 * use /esqueci-senha.html para criar uma.
 */
declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/api/helpers/db.php';

$email = 'diegocsp82@gmail.com';
$name  = 'Diego Navi';
$pass  = $argv[1] ?? ($_GET['password'] ?? '');

$pdo = db();
$stmt = $pdo->prepare('SELECT id, role, password_hash FROM gcv_users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user) {
    $pdo->prepare(
        'UPDATE gcv_users SET role = "admin", status = "active", email_verified = 1, name = ? WHERE id = ?'
    )->execute([$name, (int)$user['id']]);
    echo "OK: usuário #{$user['id']} promovido a admin.\n";

    if ($pass !== '') {
        $hash = password_hash((string)$pass, PASSWORD_BCRYPT, ['cost' => 12]);
        $pdo->prepare('UPDATE gcv_users SET password_hash = ? WHERE id = ?')->execute([$hash, (int)$user['id']]);
        echo "OK: senha atualizada.\n";
    } elseif (empty($user['password_hash'])) {
        echo "AVISO: conta sem senha. Defina com: php tools/ensure-admin.php 'SuaSenha'\n";
        echo "   ou use /esqueci-senha.html\n";
    }
} else {
    $hash = $pass !== ''
        ? password_hash((string)$pass, PASSWORD_BCRYPT, ['cost' => 12])
        : null;
    $pdo->prepare(
        'INSERT INTO gcv_users (name, email, password_hash, role, status, email_verified)
         VALUES (?,?,?,"admin","active",1)'
    )->execute([$name, $email, $hash]);
    echo "OK: admin criado (#" . $pdo->lastInsertId() . ").\n";
    if ($hash === null) {
        echo "AVISO: criado sem senha. Rode de novo com a senha ou use /esqueci-senha.html\n";
    }
}

echo "Login: /admin/login.html → {$email}\n";
