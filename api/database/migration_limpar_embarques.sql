UPDATE gcv_attractions
SET parking_info = NULL
WHERE parking_info IS NOT NULL;

UPDATE gcv_attractions
SET saidas_json = '[]'
WHERE saidas_json IS NULL OR saidas_json <> '[]';

UPDATE gcv_attractions
SET experiencia_json = JSON_SET(experiencia_json, '$.embarques', JSON_OBJECT())
WHERE experiencia_json IS NOT NULL
  AND experiencia_json <> ''
  AND JSON_VALID(experiencia_json);
