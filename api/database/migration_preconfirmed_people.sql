-- Pessoas já confirmadas pelo guia no cadastro (contam no quórum / vagas, aparte do PIX)
ALTER TABLE gcv_excursions
  ADD COLUMN IF NOT EXISTS preconfirmed_people TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER booked_people;
