<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/autoload.php';

function send_mail(string $to, string $subject, string $bodyHtml, string $toName = '', bool $wrapLayout = true): bool {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = $_ENV['SMTP_HOST'] ?? 'smtp.hostinger.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = $_ENV['SMTP_USER'] ?? '';
        $mail->Password   = $_ENV['SMTP_PASS'] ?? '';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = (int)($_ENV['SMTP_PORT'] ?? 587);
        $mail->CharSet    = 'UTF-8';

        $from     = $_ENV['SMTP_FROM'] ?? 'contato@guiachapadaveadeiros.com';
        $fromName = 'Guia Chapada Veadeiros';
        $mail->setFrom($from, $fromName);
        $mail->addAddress($to, $toName);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $wrapLayout ? email_layout($subject, $bodyHtml) : $bodyHtml;
        $mail->AltBody = strip_tags(preg_replace('/<style\b[^>]*>.*?<\/style>/is', '', $bodyHtml) ?? $bodyHtml);
        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log('Mailer error: ' . $mail->ErrorInfo);
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
    $appUrl = $_ENV['APP_URL'] ?? 'https://www.guiachapadaveadeiros.com';
    $body   = "<p>Parabéns, <strong>{$name}</strong>!</p><p>Seu cadastro como guia foi aprovado. Agora você pode criar e publicar passeios.</p><p><a href='{$appUrl}/dashboard/' style='background:#0f3d2e;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;'>Acessar meu painel</a></p>";
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

function mail_payment_released(string $to, string $guideName, string $tourTitle, int $amountCents): void {
    $amount = 'R$ ' . number_format($amountCents / 100, 2, ',', '.');
    $body   = "<p>Olá, <strong>{$guideName}</strong>!</p><p>O pagamento referente ao passeio <strong>\"{$tourTitle}\"</strong> foi liberado na sua conta do Mercado Pago.</p><p><strong>Valor:</strong> {$amount}</p>";
    send_mail($to, 'Seu pagamento foi liberado — ' . $tourTitle, $body, $guideName);
}
