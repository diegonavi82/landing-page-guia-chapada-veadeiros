<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
    'https://www.guiachapadaveadeiros.com',
    'https://guiachapadaveadeiros.com',
];
if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, Accept-Language');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['message' => 'Method not allowed']);
    exit;
}

require_once dirname(__DIR__) . '/db.php';

function gcv_json_error(int $status, string $message, array $extra = []): void
{
    http_response_code($status);
    echo json_encode(array_merge(['message' => $message], $extra));
    exit;
}

function gcv_clean_string(?string $value, int $max): string
{
    $value = trim((string) $value);
    if (mb_strlen($value) > $max) {
        $value = mb_substr($value, 0, $max);
    }
    return $value;
}

$raw = file_get_contents('php://input') ?: '';
$data = json_decode($raw, true);
if (!is_array($data)) {
    gcv_json_error(400, 'Invalid JSON body');
}

$locale = gcv_clean_string($_GET['locale'] ?? ($data['locale'] ?? 'pt'), 8);
if (!in_array($locale, ['pt', 'en', 'es'], true)) {
    $locale = 'pt';
}

$nome = gcv_clean_string($data['nome'] ?? '', 120);
$tipo = gcv_clean_string($data['tipo'] ?? '', 40);
$mensagem = gcv_clean_string($data['mensagem'] ?? '', 4000);
$email = gcv_clean_string($data['email'] ?? '', 190);
$telefone = gcv_clean_string($data['telefone'] ?? '', 40);

$fieldErrors = [];
if (mb_strlen($nome) < 2) {
    $fieldErrors['nome'] = ['Nome muito curto.'];
}
if ($tipo === '') {
    $fieldErrors['tipo'] = ['Selecione o assunto.'];
}
if (mb_strlen($mensagem) < 10) {
    $fieldErrors['mensagem'] = ['Mensagem muito curta.'];
}
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $fieldErrors['email'] = ['E-mail inválido.'];
}

if ($fieldErrors !== []) {
    gcv_json_error(422, 'Validation failed', [
        'error' => 'ValidationError',
        'details' => ['fieldErrors' => $fieldErrors],
    ]);
}

try {
    $pdo = gcv_db();
    gcv_ensure_schema($pdo);

    $stmt = $pdo->prepare(
        'INSERT INTO gcv_contact_messages
            (locale, nome, tipo, email, telefone, mensagem, ip, user_agent)
         VALUES
            (:locale, :nome, :tipo, :email, :telefone, :mensagem, :ip, :user_agent)'
    );

    $stmt->execute([
        ':locale' => $locale,
        ':nome' => $nome,
        ':tipo' => $tipo,
        ':email' => $email !== '' ? $email : null,
        ':telefone' => $telefone !== '' ? $telefone : null,
        ':mensagem' => $mensagem,
        ':ip' => gcv_clean_string($_SERVER['REMOTE_ADDR'] ?? '', 45) ?: null,
        ':user_agent' => gcv_clean_string($_SERVER['HTTP_USER_AGENT'] ?? '', 255) ?: null,
    ]);

    $id = (int) $pdo->lastInsertId();

    $cfg = gcv_load_config();
    $notify = $cfg['notify_emails'] ?? [];
    if (is_array($notify) && $notify !== []) {
        $subject = "[Guia Chapada] Contato #{$id} — {$tipo} — {$nome}";
        $body = "Novo contato no site\n\n"
            . "ID: {$id}\n"
            . "Idioma: {$locale}\n"
            . "Nome: {$nome}\n"
            . "Assunto: {$tipo}\n"
            . ($email !== '' ? "E-mail: {$email}\n" : '')
            . ($telefone !== '' ? "Telefone: {$telefone}\n" : '')
            . "\nMensagem:\n{$mensagem}\n";
        $headers = 'Content-Type: text/plain; charset=UTF-8';
        foreach ($notify as $to) {
            if (is_string($to) && filter_var($to, FILTER_VALIDATE_EMAIL)) {
                @mail($to, $subject, $body, $headers);
            }
        }
    }

    echo json_encode([
        'ok' => true,
        'id' => $id,
        'message' => 'Saved',
    ]);
} catch (Throwable $e) {
    error_log('[gcv contact] ' . $e->getMessage());
    gcv_json_error(500, 'Server error');
}
