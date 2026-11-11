ALTER TABLE gcv_guides ADD COLUMN vehicle_model VARCHAR(120) NULL AFTER languages_json;

ALTER TABLE gcv_guides ADD COLUMN vehicle_year SMALLINT UNSIGNED NULL AFTER vehicle_model;
