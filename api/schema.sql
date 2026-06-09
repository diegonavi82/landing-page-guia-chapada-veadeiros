-- Execute no phpMyAdmin (banco u431245201_GuiaChapadaV) se preferir criar a tabela manualmente.
-- A API também cria automaticamente no primeiro POST.

CREATE TABLE IF NOT EXISTS gcv_contact_messages (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    locale VARCHAR(8) NOT NULL DEFAULT 'pt',
    nome VARCHAR(120) NOT NULL,
    tipo VARCHAR(40) NOT NULL,
    email VARCHAR(190) NULL,
    telefone VARCHAR(40) NULL,
    mensagem TEXT NOT NULL,
    ip VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_created_at (created_at),
    KEY idx_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
