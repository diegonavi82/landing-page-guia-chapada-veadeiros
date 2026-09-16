-- Diária máxima do guia: R$ 160 (configurável). Dragão permanece R$ 190.
INSERT INTO gcv_settings (key_name, value, label, type)
SELECT 'guide_net_min_reais', '50', 'Diária mínima do guia (R$ por pessoa)', 'integer'
WHERE NOT EXISTS (SELECT 1 FROM gcv_settings WHERE key_name = 'guide_net_min_reais');

INSERT INTO gcv_settings (key_name, value, label, type)
SELECT 'guide_net_max_reais', '160', 'Diária máxima do guia (R$ por pessoa)', 'integer'
WHERE NOT EXISTS (SELECT 1 FROM gcv_settings WHERE key_name = 'guide_net_max_reais');

INSERT INTO gcv_settings (key_name, value, label, type)
SELECT 'guide_net_max_dragao_reais', '190', 'Diária máxima do guia na Cachoeira do Dragão (R$ por pessoa)', 'integer'
WHERE NOT EXISTS (SELECT 1 FROM gcv_settings WHERE key_name = 'guide_net_max_dragao_reais');

UPDATE gcv_settings
SET value = '160', label = 'Diária máxima do guia (R$ por pessoa)'
WHERE key_name = 'guide_net_max_reais' AND value IN ('150', '1000');
