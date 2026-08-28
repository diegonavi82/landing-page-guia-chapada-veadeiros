-- Aviso do dia do passeio para o guia (link do leitor de QR).
ALTER TABLE gcv_excursions
  ADD COLUMN notify_dayof_guide_at DATETIME NULL;
