INSERT INTO gcv_attractions (
  slug, status,
  title_pt, title_en, title_es,
  excerpt_pt, excerpt_en, excerpt_es,
  seo_title_pt, seo_title_en, seo_title_es,
  seo_desc_pt, seo_desc_en, seo_desc_es,
  city_id, published_at
)
SELECT
  'pratinha-guia-chapada-veadeiros',
  'published',
  'Pratinha',
  'Pratinha',
  'Pratinha',
  'Cachoeira Pratinha no complexo do Rio da Prata, Cavalcante.',
  'Pratinha waterfall in the Rio da Prata complex, Cavalcante.',
  'Cascada Pratinha en el complejo del Río da Prata, Cavalcante.',
  'Pratinha | Guia Chapada Veadeiros',
  'Pratinha | Guia Chapada Veadeiros',
  'Pratinha | Guia Chapada Veadeiros',
  'Cachoeira Pratinha no complexo do Rio da Prata, em Cavalcante.',
  'Pratinha waterfall in the Rio da Prata complex, in Cavalcante.',
  'Cascada Pratinha en el complejo del Río da Prata, en Cavalcante.',
  (SELECT id FROM gcv_cities WHERE name LIKE '%Cavalcante%' AND status = 'active' LIMIT 1),
  NOW()
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM gcv_attractions
  WHERE slug = 'pratinha-guia-chapada-veadeiros'
     OR LOWER(TRIM(title_pt)) = 'pratinha'
);
