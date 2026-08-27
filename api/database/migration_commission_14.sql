-- Taxa padrão da plataforma: 16% → 14%.
-- Só altera a regra global e o setting legado. Não mexe em regras por guia/cidade/categoria/excursão.
-- Vendas já feitas (commission_pct_applied) permanecem no snapshot original.

UPDATE gcv_commission_rules
SET commission_pct = 14.000
WHERE scope_type = 'global'
  AND scope_id IS NULL
  AND deleted_at IS NULL
  AND is_active = 1
  AND commission_pct = 16.000;

UPDATE gcv_settings
SET value = '14'
WHERE key_name = 'platform_commission_pct'
  AND value = '16';
