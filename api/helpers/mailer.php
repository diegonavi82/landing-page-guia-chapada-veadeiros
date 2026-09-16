<?php
declare(strict_types=1);

$gcvMailerAutoload = __DIR__ . '/../vendor/autoload.php';
$gcvMailerReady = is_readable($gcvMailerAutoload);
if ($gcvMailerReady) {
    require_once $gcvMailerAutoload;
}

/**
 * @param list<array{path?:string,content?:string,name?:string,type?:string}> $attachments
 */
function send_mail(
    string $to,
    string $subject,
    string $bodyHtml,
    string $toName = '',
    bool $wrapLayout = true,
    array $attachments = []
): bool {
    global $gcvMailerReady;
    if (empty($gcvMailerReady) || !class_exists(\PHPMailer\PHPMailer\PHPMailer::class)) {
        error_log('Mailer: api/vendor ausente — rode composer install na pasta do projeto');
        return false;
    }

    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = $_ENV['SMTP_HOST'] ?? 'smtp.hostinger.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = $_ENV['SMTP_USER'] ?? '';
        $mail->Password   = $_ENV['SMTP_PASS'] ?? '';
        $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = (int)($_ENV['SMTP_PORT'] ?? 587);
        $mail->CharSet    = 'UTF-8';
        $mail->Timeout    = 12;
        $mail->SMTPKeepAlive = false;

        $from     = $_ENV['SMTP_FROM'] ?? 'contato@guiachapadaveadeiros.com';
        $fromName = 'Guia Chapada Veadeiros';
        $mail->setFrom($from, $fromName);
        $mail->addAddress($to, $toName);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $wrapLayout ? email_layout($subject, $bodyHtml) : $bodyHtml;
        $mail->AltBody = strip_tags(preg_replace('/<style\b[^>]*>.*?<\/style>/is', '', $bodyHtml) ?? $bodyHtml);

        foreach ($attachments as $att) {
            if (!is_array($att)) {
                continue;
            }
            $name = trim((string)($att['name'] ?? 'anexo'));
            $type = trim((string)($att['type'] ?? 'application/octet-stream'));
            if (!empty($att['path']) && is_readable((string)$att['path'])) {
                $mail->addAttachment((string)$att['path'], $name !== '' ? $name : 'anexo');
                continue;
            }
            if (isset($att['content']) && is_string($att['content']) && $att['content'] !== '') {
                $mail->addStringAttachment(
                    $att['content'],
                    $name !== '' ? $name : 'anexo.bin',
                    \PHPMailer\PHPMailer\PHPMailer::ENCODING_BASE64,
                    $type !== '' ? $type : 'application/octet-stream'
                );
            }
        }

        $mail->send();
        return true;
    } catch (\Throwable $e) {
        error_log('Mailer error: ' . ($mail->ErrorInfo ?? $e->getMessage()));
        return false;
    }
}

function email_layout(string $title, string $body): string {
    $appUrl = $_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com';
    return <<<HTML
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>{$title}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#0f3d2e;padding:24px 32px;">
          <h1 style="margin:0;color:#fff;font-size:20px;">Guia Chapada Veadeiros</h1>
        </td></tr>
        <tr><td style="padding:32px;">{$body}</td></tr>
        <tr><td style="background:#f5f5f5;padding:16px 32px;text-align:center;color:#666;font-size:12px;">
          © 2026 Guia Chapada Veadeiros — <a href="{$appUrl}" style="color:#0f3d2e;">{$appUrl}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
HTML;
}

/* ---- Templates ---- */

function mail_verify_email(string $to, string $name, string $token, string $code6, string $lang = 'pt'): void
{
    $appUrl = rtrim((string)($_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com'), '/');
    $link = $appUrl . '/guia/confirmar-email.html?token=' . rawurlencode($token);
    $subjects = [
        'pt' => 'Confirme seu e-mail — Guia Chapada Veadeiros',
        'en' => 'Confirm your email — Guia Chapada Veadeiros',
        'es' => 'Confirma tu correo — Guia Chapada Veadeiros',
    ];
    $bodies = [
        'pt' => "<p>Olá, <strong>{$name}</strong>!</p><p>Para continuar o cadastro de guia, confirme que este e-mail é seu.</p><p><a href='{$link}' style='background:#0f3d2e;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;'>Confirmar e-mail</a></p><p>Ou digite o código de 6 dígitos:</p><p><strong style='font-size:28px;letter-spacing:6px;'>{$code6}</strong></p><p>O código expira em 24 horas. Se você não se cadastrou, ignore este e-mail.</p>",
        'en' => "<p>Hello, <strong>{$name}</strong>!</p><p>To continue your guide registration, confirm this email is yours.</p><p><a href='{$link}' style='background:#0f3d2e;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;'>Confirm email</a></p><p>Or enter this 6-digit code:</p><p><strong style='font-size:28px;letter-spacing:6px;'>{$code6}</strong></p><p>The code expires in 24 hours. If you did not sign up, ignore this email.</p>",
        'es' => "<p>Hola, <strong>{$name}</strong>!</p><p>Para continuar el registro de guía, confirma que este correo es tuyo.</p><p><a href='{$link}' style='background:#0f3d2e;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;'>Confirmar correo</a></p><p>O escribe el código de 6 dígitos:</p><p><strong style='font-size:28px;letter-spacing:6px;'>{$code6}</strong></p><p>El código caduca en 24 horas. Si no te registraste, ignora este correo.</p>",
    ];
    send_mail($to, $subjects[$lang] ?? $subjects['pt'], $bodies[$lang] ?? $bodies['pt'], $name);
}

function mail_welcome(string $to, string $name, string $lang = 'pt'): void {
    $subjects = ['pt' => 'Bem-vindo ao Guia Chapada Veadeiros!', 'en' => 'Welcome to Guia Chapada Veadeiros!', 'es' => '¡Bienvenido a Guia Chapada Veadeiros!'];
    $bodies   = [
        'pt' => "<p>Olá, <strong>{$name}</strong>!</p><p>Seu cadastro foi realizado com sucesso. Explore as melhores trilhas e cachoeiras da Chapada dos Veadeiros.</p>",
        'en' => "<p>Hello, <strong>{$name}</strong>!</p><p>Your account has been created. Explore the best trails and waterfalls of Chapada dos Veadeiros.</p>",
        'es' => "<p>Hola, <strong>{$name}</strong>!</p><p>Tu cuenta ha sido creada. Explora los mejores senderos y cascadas de la Chapada dos Veadeiros.</p>",
    ];
    send_mail($to, $subjects[$lang] ?? $subjects['pt'], $bodies[$lang] ?? $bodies['pt'], $name);
}

function mail_guide_pending_admin(string $guideName, string $guideEmail): void {
    $admin = $_ENV['SMTP_USER'] ?? 'contato@guiachapadaveadeiros.com';
    $appUrl = $_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com';
    $body  = "<p>Novo guia aguardando aprovação:</p><ul><li><strong>Nome:</strong> {$guideName}</li><li><strong>Email:</strong> {$guideEmail}</li></ul><p><a href='{$appUrl}/dashboard/' style='background:#0f3d2e;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;'>Acessar painel admin</a></p>";
    send_mail($admin, 'Novo guia aguardando aprovação', $body);
}

function mail_guide_approved(string $to, string $name): void {
    $appUrl = rtrim((string)($_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com'), '/');
    $publish = $appUrl . '/dashboard/#publicar';
    $body   = "<p>Parabéns, <strong>{$name}</strong>!</p><p>Seu cadastro como guia foi aprovado. Agora você pode publicar sua primeira excursão.</p><p><a href='{$publish}' style='background:#0f3d2e;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;'>Publicar excursão</a></p>";
    send_mail($to, 'Seu cadastro de guia foi aprovado!', $body, $name);
}

function mail_guide_rejected(string $to, string $name, string $reason = ''): void {
    $body = "<p>Olá, <strong>{$name}</strong>.</p><p>Após análise, seu cadastro como guia não foi aprovado.</p>" . ($reason ? "<p><strong>Motivo:</strong> {$reason}</p>" : '') . "<p>Se tiver dúvidas, entre em contato conosco.</p>";
    send_mail($to, 'Atualização sobre seu cadastro de guia', $body, $name);
}

function mail_tour_pending_admin(string $tourTitle, string $guideName): void {
    $admin  = $_ENV['SMTP_USER'] ?? 'contato@guiachapadaveadeiros.com';
    $appUrl = $_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com';
    $body   = "<p>Novo passeio aguardando aprovação:</p><ul><li><strong>Título:</strong> {$tourTitle}</li><li><strong>Guia:</strong> {$guideName}</li></ul><p><a href='{$appUrl}/dashboard/' style='background:#0f3d2e;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;'>Aprovar no painel</a></p>";
    send_mail($admin, 'Novo passeio aguardando aprovação', $body);
}

function mail_tour_approved(string $to, string $guideName, string $tourTitle): void {
    $appUrl = $_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com';
    $body   = "<p>Olá, <strong>{$guideName}</strong>!</p><p>Seu passeio <strong>\"{$tourTitle}\"</strong> foi aprovado e está visível em <a href='{$appUrl}/excursoes.html'>excursoes.html</a>.</p>";
    send_mail($to, 'Seu passeio foi aprovado!', $body, $guideName);
}

function mail_tour_rejected(string $to, string $guideName, string $tourTitle, string $reason = ''): void {
    $body = "<p>Olá, <strong>{$guideName}</strong>.</p><p>Seu passeio <strong>\"{$tourTitle}\"</strong> não foi aprovado.</p>" . ($reason ? "<p><strong>Motivo:</strong> {$reason}</p>" : '');
    send_mail($to, 'Atualização sobre seu passeio', $body, $guideName);
}

function mail_booking_confirmed(string $to, string $clientName, string $tourTitle, string $date, int $spots, int $totalCents): void {
    $total = 'R$ ' . number_format($totalCents / 100, 2, ',', '.');
    $body  = "<p>Olá, <strong>{$clientName}</strong>!</p><p>Sua reserva foi confirmada:</p><ul><li><strong>Passeio:</strong> {$tourTitle}</li><li><strong>Data:</strong> {$date}</li><li><strong>Vagas:</strong> {$spots}</li><li><strong>Total:</strong> {$total}</li></ul><p>Você receberá os detalhes de encontro em breve.</p>";
    send_mail($to, 'Reserva confirmada — ' . $tourTitle, $body, $clientName);
}

function mail_payment_approved(string $to, string $clientName, string $tourTitle): void {
    $body = "<p>Olá, <strong>{$clientName}</strong>!</p><p>Seu pagamento para <strong>\"{$tourTitle}\"</strong> foi confirmado. Até logo na trilha!</p>";
    send_mail($to, 'Pagamento confirmado — ' . $tourTitle, $body, $clientName);
}

function mail_reset_password(string $to, string $name, string $token, string $code6, string $lang = 'pt'): void {
    $appUrl = $_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com';
    $link   = "{$appUrl}/resetar-senha.html?token={$token}";
    $subjects = ['pt' => 'Recuperação de senha', 'en' => 'Password reset', 'es' => 'Recuperación de contraseña'];
    $bodies   = [
        'pt' => "<p>Olá, <strong>{$name}</strong>!</p><p>Clique no link abaixo para redefinir sua senha (expira em 1 hora):</p><p><a href='{$link}' style='background:#0f3d2e;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;'>Redefinir senha</a></p><p>Ou use o código: <strong style='font-size:24px;letter-spacing:4px;'>{$code6}</strong></p><p>Se não solicitou, ignore este email.</p>",
        'en' => "<p>Hello, <strong>{$name}</strong>!</p><p>Click below to reset your password (expires in 1 hour):</p><p><a href='{$link}' style='background:#0f3d2e;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;'>Reset password</a></p><p>Or use code: <strong style='font-size:24px;letter-spacing:4px;'>{$code6}</strong></p>",
        'es' => "<p>Hola, <strong>{$name}</strong>!</p><p>Haz clic para restablecer tu contraseña (expira en 1 hora):</p><p><a href='{$link}' style='background:#0f3d2e;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;'>Restablecer contraseña</a></p><p>O usa el código: <strong style='font-size:24px;letter-spacing:4px;'>{$code6}</strong></p>",
    ];
    send_mail($to, $subjects[$lang] ?? $subjects['pt'], $bodies[$lang] ?? $bodies['pt'], $name);
}

function mail_guide_new_booking(
    string $to,
    string $guideName,
    string $tourTitle,
    string $date,
    string $time,
    string $clientName,
    string $clientEmail,
    string $clientPhone,
    int $people,
    int $amountCents
): void {
    $amount = 'R$ ' . number_format(max(0, $amountCents) / 100, 2, ',', '.');
    $when = trim($date . ($time !== '' ? ' às ' . $time : ''));
    $pax = $people === 1 ? '1 pessoa' : ($people . ' pessoas');
    $body = '<p>Olá, <strong>' . htmlspecialchars($guideName) . '</strong>!</p>'
        . '<p>Nova reserva confirmada (PIX pago) no passeio <strong>' . htmlspecialchars($tourTitle) . '</strong>.</p>'
        . '<ul>'
        . ($when !== '' ? '<li><strong>Quando:</strong> ' . htmlspecialchars($when) . '</li>' : '')
        . '<li><strong>Grupo:</strong> ' . htmlspecialchars($pax) . '</li>'
        . '<li><strong>Cliente:</strong> ' . htmlspecialchars($clientName) . '</li>'
        . ($clientEmail !== '' ? '<li><strong>E-mail:</strong> ' . htmlspecialchars($clientEmail) . '</li>' : '')
        . ($clientPhone !== '' ? '<li><strong>Telefone:</strong> ' . htmlspecialchars($clientPhone) . '</li>' : '')
        . '<li><strong>Valor pago:</strong> ' . $amount . '</li>'
        . '</ul>'
        . '<p>Os dados já aparecem na sua <strong>Agenda</strong> no painel.</p>';
    send_mail($to, 'Nova reserva — ' . $tourTitle, $body, $guideName);
}

function mail_payout_pix_failed_admin(
    string $tourTitle,
    int $saleId,
    string $guideName,
    int $amountCents,
    string $error
): void {
    $amount = 'R$ ' . number_format(max(0, $amountCents) / 100, 2, ',', '.');
    $body = '<p>O PIX automático para o guia <strong>não foi enviado</strong>.</p>'
        . '<ul>'
        . '<li><strong>Venda:</strong> #' . (int)$saleId . '</li>'
        . '<li><strong>Passeio:</strong> ' . htmlspecialchars($tourTitle) . '</li>'
        . '<li><strong>Guia:</strong> ' . htmlspecialchars($guideName) . '</li>'
        . '<li><strong>Valor:</strong> ' . $amount . '</li>'
        . '<li><strong>Erro:</strong> ' . htmlspecialchars($error) . '</li>'
        . '</ul>'
        . '<p>O cron tentará de novo. Confira a chave PIX do guia e o painel Admin → Financeiro.</p>';
    $tos = [];
    if (function_exists('gcv_admin_notify_emails')) {
        $tos = gcv_admin_notify_emails();
    }
    if (!$tos) {
        $tos = ['diegonavi82@gmail.com', 'contato@guiachapadaveadeiros.com'];
    }
    foreach ($tos as $to) {
        send_mail($to, '[GCV] FALHA no PIX automático do guia — venda #' . $saleId, $body, 'Diego');
    }
}

function mail_payment_released(string $to, string $guideName, string $tourTitle, int $amountCents): void {
    $amount = 'R$ ' . number_format($amountCents / 100, 2, ',', '.');
    $body   = "<p>Olá, <strong>{$guideName}</strong>!</p><p>O pagamento referente ao passeio <strong>\"{$tourTitle}\"</strong> foi liberado via PIX (Sicoob).</p><p><strong>Valor:</strong> {$amount}</p>";

    send_mail($to, 'Seu pagamento foi liberado — ' . $tourTitle, $body, $guideName);
}
