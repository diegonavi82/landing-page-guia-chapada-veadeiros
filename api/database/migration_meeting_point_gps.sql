-- Ponto de encontro com GPS (Google Places)
ALTER TABLE gcv_excursions
  ADD COLUMN IF NOT EXISTS meeting_point VARCHAR(300) NULL AFTER departure_city_id,
  ADD COLUMN IF NOT EXISTS meeting_point_place_id VARCHAR(220) NULL AFTER meeting_point,
  ADD COLUMN IF NOT EXISTS meeting_point_lat DECIMAL(10,7) NULL AFTER meeting_point_place_id,
  ADD COLUMN IF NOT EXISTS meeting_point_lng DECIMAL(10,7) NULL AFTER meeting_point_lat;
