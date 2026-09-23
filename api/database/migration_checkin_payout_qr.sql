INSERT INTO gcv_settings (key_name, value, label, type)
SELECT 'checkin_open_before_minutes', '60', 'Leitura do QR: minutos antes do início do passeio em que a conferência abre', 'integer'
WHERE NOT EXISTS (SELECT 1 FROM gcv_settings WHERE key_name = 'checkin_open_before_minutes');

INSERT INTO gcv_settings (key_name, value, label, type)
SELECT 'checkin_close_before_payout_minutes', '60', 'Leitura do QR: minutos antes do PIX automático em que a conferência fecha', 'integer'
WHERE NOT EXISTS (SELECT 1 FROM gcv_settings WHERE key_name = 'checkin_close_before_payout_minutes');

UPDATE gcv_settings
SET value = '60',
    label = 'Leitura do QR: minutos antes do início do passeio em que a conferência abre'
WHERE key_name = 'checkin_open_before_minutes' AND (value IS NULL OR value = '');

UPDATE gcv_settings
SET value = '60',
    label = 'Leitura do QR: minutos antes do PIX automático em que a conferência fecha'
WHERE key_name = 'checkin_close_before_payout_minutes' AND (value IS NULL OR value = '');
