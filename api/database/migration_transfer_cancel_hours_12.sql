UPDATE gcv_settings
SET value = '12',
    label = 'Transferência: horas antes da saída para cancelar sozinho se o quórum não fechou'
WHERE key_name = 'transfer_cancel_hours';
