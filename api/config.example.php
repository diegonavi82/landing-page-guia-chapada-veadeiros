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

    /**
     * PIX Sicoob — confirmação automática (webhook + consulta API).
     * Cadastro: developers.sicoob.com.br (certificado e-CNPJ A1 + Client ID).
     * Webhook: PUT /webhook/{chave} com webhookUrl abaixo, ou POST api/sicoob_setup_webhook.php
     *
     * Certificado no servidor:
     *   api/storage/sicoob/Chave_GUIA_CHAPADA_VEADEIROS_SITE.pfx
     */
    'sicoob' => [
        'client_id' => '',
        /** Opcional — alguns ambientes exigem; muitos usam só mTLS */
        'client_secret' => '',
        /** Chave Pix CNPJ (só dígitos) — mesma do QR Code do site */
        'pix_key' => '24354289000105',
        /** Certificado A1 (.pfx) — path relativo a api/ */
        'cert_pfx' => 'storage/sicoob/Chave_GUIA_CHAPADA_VEADEIROS_SITE.pfx',
        'cert_pem' => '',
        'cert_key' => '',
        'cert_pass' => '',
        /** Escopos mínimos: pix.read (+ webhook.read/write para registrar webhook) */
        'scope' => 'pix.read webhook.read webhook.write',
        /** true = homologação (sandbox.sicoob.com.br); false = produção */
        'sandbox' => false,
        /** Só sandbox: token fixo do portal Developers (não use em produção) */
        'sandbox_access_token' => '',
        /** Opcional — padrão sandbox: …/sicoob/sandbox/pix/api/v2 */
        'api_base' => '',
        /** URL base registrada no Sicoob (sem /pix — o banco adiciona) */
        'webhook_base_url' => 'https://www.guiachapadaveadeiros.com/api/sicoob_webhook',
        /** IPs permitidos no webhook (vazio = aceita qualquer — preencha em produção se souber) */
        'webhook_ips' => [],
    ],
];
