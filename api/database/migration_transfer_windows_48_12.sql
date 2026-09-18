UPDATE gcv_settings
SET value = '48',
    label = 'Troca: horas antes da saída para oferecer a lista (só em formação → passeio confirmado do mesmo dia)'
WHERE key_name = 'transfer_offer_hours';

UPDATE gcv_settings
SET value = '12',
    label = 'Cancelamento automático: horas antes da saída se o quórum não fechou (sempre depois da troca)'
WHERE key_name = 'transfer_cancel_hours';
