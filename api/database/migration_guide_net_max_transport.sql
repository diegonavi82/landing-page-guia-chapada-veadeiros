INSERT INTO gcv_settings (key_name, value, label, type)
SELECT 'guide_net_max_transport_reais', '550', 'Diária máxima do guia com transporte incluso (R$ por pessoa)', 'integer'
WHERE NOT EXISTS (
  SELECT 1 FROM gcv_settings WHERE key_name = 'guide_net_max_transport_reais'
);
