-- Marca para não reenviar o WhatsApp de aprovação
ALTER TABLE gcv_excursions
  ADD COLUMN IF NOT EXISTS notify_approved_at DATETIME NULL AFTER notify_confirmed_at;
