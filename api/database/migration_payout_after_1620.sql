-- PIX automático do guia: 16h20 (Brasília) no dia do passeio.

UPDATE gcv_settings
SET value = '16',
    label = 'Hora (Brasília) do PIX automático ao guia no dia do passeio'
WHERE key_name = 'payout_after_hour';

INSERT INTO gcv_settings (key_name, value, label, type)
SELECT 'payout_after_minute', '20', 'Minuto (Brasília) do PIX automático ao guia no dia do passeio', 'integer'
WHERE NOT EXISTS (
  SELECT 1 FROM gcv_settings WHERE key_name = 'payout_after_minute'
);

UPDATE gcv_settings
SET value = '20',
    label = 'Minuto (Brasília) do PIX automático ao guia no dia do passeio'
WHERE key_name = 'payout_after_minute';

UPDATE gcv_settings
SET label = 'Legado — o repasse automático usa 16h20 do dia do passeio'
WHERE key_name = 'payout_delay_hours';

UPDATE gcv_sales
SET scheduled_payout_at = CONCAT(DATE(COALESCE(excursion_starts_at, scheduled_payout_at, sold_at)), ' 16:20:00')
WHERE deleted_at IS NULL
  AND sale_status = 'PAID'
  AND payout_status = 'PAYOUT_PENDING'
  AND COALESCE(excursion_starts_at, scheduled_payout_at, sold_at) IS NOT NULL;
