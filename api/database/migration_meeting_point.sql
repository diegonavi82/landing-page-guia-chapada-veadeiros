-- Ponto de encontro obrigatório nas saídas (gcv_excursions)
ALTER TABLE gcv_excursions
  ADD COLUMN IF NOT EXISTS meeting_point VARCHAR(300) NULL AFTER departure_city_id;
