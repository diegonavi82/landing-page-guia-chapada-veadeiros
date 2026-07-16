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
    /** E-mails que recebem aviso de cada compra Pix confirmada. */
    'purchase_notify_emails' => [
        'diegonavi82@gmail.com',
        'contato@guiachapadaveadeiros.com',
    ],
    /** Compatível: um único e-mail (ou use purchase_notify_emails). */
    'purchase_notify_email' => 'diegonavi82@gmail.com',
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
        /** Preferir PEM (OpenSSL 3 / Hostinger rejeita PFX com criptografia legada) */
        'cert_pem' => 'storage/sicoob/client-cert.pem',
        'cert_key' => 'storage/sicoob/client-key.pem',
        /** Certificado A1 (.pfx) — fallback; converter com -legacy se der erro unsupported */
        'cert_pfx' => 'storage/sicoob/Chave_GUIA_CHAPADA_VEADEIROS_SITE.pfx',
        'cert_pass' => '',
        /**
         * Escopos: recebimentos (pix.read + webhook) e pagamentos a guias (pixpagamentos_*).
         * No portal Sicoob marque Pix Recebimentos + Pix Pagamentos.
         */
        'scope' => 'pix.read pix.write webhook.read webhook.write cob.read cob.write pixpagamentos_escrita pixpagamentos_consulta pixpagamentos_webhook',
        /** OAuth produção (portal Developers) */
        'token_url' => 'https://auth.sicoob.com.br/auth/realms/cooperado/protocol/openid-connect/token',
        /** Pix Recebimentos */
        'api_base' => 'https://api.sicoob.com.br/pix/api/v2',
        /** Pix Pagamentos (repasse a guias) */
        'pay_api_base' => 'https://api.sicoob.com.br/pix-pagamentos/v2',
        /** true = homologação (sandbox.sicoob.com.br); false = produção */
        'sandbox' => false,
        /** Só sandbox: token fixo do portal Developers (não use em produção) */
        'sandbox_access_token' => '',
        /** URL base registrada no Sicoob (sem /pix — o banco adiciona) */
        'webhook_base_url' => 'https://www.guiachapadaveadeiros.com/api/sicoob_webhook',
        /** IPs permitidos no webhook (vazio = aceita qualquer — preencha em produção se souber) */
        'webhook_ips' => [],
    ],
];
