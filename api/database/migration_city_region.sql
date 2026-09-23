ALTER TABLE gcv_cities
  ADD COLUMN region VARCHAR(160) NULL AFTER country_code;

UPDATE gcv_cities
  SET region = 'Chapada dos Veadeiros'
  WHERE region IS NULL OR TRIM(region) = '';
