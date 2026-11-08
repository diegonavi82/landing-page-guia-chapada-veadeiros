-- Tipo da saída (excursão compartilhada ou privativo) e trava manual de Concluída.
-- O painel também cria estas colunas em gcv_marketplace_ensure_excursion_finance_columns.

ALTER TABLE gcv_excursions
  ADD COLUMN tour_type ENUM('excursao','privativo') NOT NULL DEFAULT 'excursao' AFTER status,
  ADD COLUMN status_lock ENUM('concluida') NULL AFTER tour_type;
