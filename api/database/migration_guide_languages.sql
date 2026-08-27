-- Idiomas dos guias (bandeiras no card). PT/Brasil sempre presente.
-- Diego Navi: português + inglês + espanhol.

UPDATE gcv_guides
SET languages_json = '["pt"]'
WHERE languages_json IS NULL
   OR TRIM(languages_json) IN ('', '[]', 'null');

UPDATE gcv_guides g
INNER JOIN gcv_users u ON u.id = g.user_id
SET g.languages_json = '["pt","en","es"]'
WHERE LOWER(u.email) = 'diegonavi82@gmail.com'
   OR LOWER(TRIM(g.nickname)) LIKE 'diego navi%';
