-- Taxa padrão da plataforma: 14% → 10%.
-- Só altera a regra global e o setting legado. Não mexe em regras por guia/cidade/categoria/excursão.
-- Vendas já feitas (commission_pct_applied nas sales) permanecem no snapshot original.

UPDATE gcv_commission_rules
SET commission_pct = 10.000
WHERE scope_type = 'global'
  AND scope_id IS NULL
  AND deleted_at IS NULL
  AND is_active = 1
  AND commission_pct IN (14.000, 16.000);

UPDATE gcv_settings
SET value = '10'
WHERE key_name = 'platform_commission_pct'
  AND value IN ('14', '16');
