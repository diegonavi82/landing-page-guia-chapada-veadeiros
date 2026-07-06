<?php
/**
 * Copie para config.local.php e preencha com os dados do hPanel (Databases > Management).
 * config.local.php não vai para o Git.
 */
return [
    'db_host' => 'localhost',
    'db_name' => 'u431245201_GuiaChapadaV',
    'db_user' => 'u431245201_diegonavi',
    'db_pass' => 'COLOQUE_A_SENHA_AQUI',
    'db_charset' => 'utf8mb4',
    /** E-mails que recebem cópia ao salvar um contato (opcional). */
    'notify_emails' => ['contato@guiachapadaveadeiros.com'],
    /**
     * Segredo para pix_webhook.php confirmar pagamentos (OpenPix, banco, etc.).
     * Em localhost com mock-server use: dev-local
     */
    'pix_webhook_secret' => '',
    /**
     * Chave pública OpenPix/Woovi (base64) para validar x-webhook-signature.
     * Painel OpenPix → API → Webhooks → Public Key (copie o valor base64).
     * Se vazio, o webhook aceita requisições sem validar assinatura (não recomendado em produção).
     */
    'openpix_webhook_public_key' => '',
    /**
     * App ID OpenPix/Woovi (Authorization header) para consultar pagamentos via API
     * quando o webhook atrasa ou falha. Painel → API → App ID.
     */
    'openpix_app_id' => '',
];
