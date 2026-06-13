<?php
// Diagnóstico temporário — DELETE após resolver
$envFile = __DIR__ . '/.env';
$lines = file_exists($envFile) ? file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) : [];
$env = [];
foreach ($lines as $line) {
    if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
    [$k, $v] = explode('=', $line, 2);
    $env[trim($k)] = trim($v);
}

$host = $env['DB_HOST'] ?? 'N/A';
$name = $env['DB_NAME'] ?? 'N/A';
$user = $env['DB_USER'] ?? 'N/A';
$pass = $env['DB_PASS'] ?? '';

echo "<h3>Diagnóstico DB</h3>";
echo "ENV file: " . ($envFile) . " — " . (file_exists($envFile) ? "✅ existe" : "❌ NÃO encontrado") . "<br>";
echo "DB_HOST: $host<br>";
echo "DB_NAME: $name<br>";
echo "DB_USER: $user<br>";
echo "DB_PASS: " . (strlen($pass) > 0 ? str_repeat('*', strlen($pass)) . " (" . strlen($pass) . " chars)" : "❌ VAZIO") . "<br><br>";

try {
    $pdo = new PDO("mysql:host=$host;dbname=$name;charset=utf8mb4", $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "✅ Conexão com banco: OK<br>";
    $row = $pdo->query("SELECT COUNT(*) as total FROM gcv_users")->fetch();
    echo "Usuários na base: " . $row['total'] . "<br>";

    // Verificar tabelas críticas
    $tables = ['gcv_users','gcv_sessions','gcv_guides','gcv_tours','gcv_bookings'];
    echo "<br><b>Tabelas:</b><br>";
    foreach ($tables as $t) {
        try {
            $pdo->query("SELECT 1 FROM $t LIMIT 1");
            echo "✅ $t existe<br>";
        } catch (Exception $ex) {
            echo "❌ $t AUSENTE: " . htmlspecialchars($ex->getMessage()) . "<br>";
        }
    }

    // Verificar sessões ativas
    $sessions = $pdo->query("SELECT COUNT(*) as total FROM gcv_sessions WHERE expires_at > NOW()")->fetch();
    echo "<br>Sessões ativas: " . $sessions['total'] . "<br>";
} catch (Exception $e) {
    echo "❌ Erro: " . htmlspecialchars($e->getMessage()) . "<br>";
}
