INSERT INTO gcv_settings (key_name, value, label, type)
SELECT key_name, value, label, type FROM (
  SELECT 'transfer_offer_hours' AS key_name, '24' AS value,
         'Transferência: horas antes da saída para OFERECER a troca (sempre antes do cancelamento)' AS label,
         'integer' AS type
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM gcv_settings WHERE key_name = 'transfer_offer_hours' LIMIT 1);

INSERT INTO gcv_settings (key_name, value, label, type)
SELECT key_name, value, label, type FROM (
  SELECT 'transfer_cancel_hours' AS key_name, '8' AS value,
         'Transferência: horas antes da saída para cancelar sozinho se o quórum não fechou' AS label,
         'integer' AS type
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM gcv_settings WHERE key_name = 'transfer_cancel_hours' LIMIT 1);
