-- Garante diegocsp82@gmail.com como admin (rode no phpMyAdmin da Hostinger)

-- Se o usuário já existe: promove a admin
UPDATE gcv_users
SET role = 'admin',
    status = 'active',
    email_verified = 1,
    name = COALESCE(NULLIF(name, ''), 'Diego Navi')
WHERE email = 'diegocsp82@gmail.com';

-- Se ainda não existe: cria
INSERT INTO gcv_users (name, email, role, status, email_verified)
SELECT 'Diego Navi', 'diegocsp82@gmail.com', 'admin', 'active', 1
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM gcv_users WHERE email = 'diegocsp82@gmail.com'
);

-- Opcional: remove role admin de e-mails antigos de seed (descomente se quiser)
-- UPDATE gcv_users SET role = 'client' WHERE email IN ('diegonavi82@gmail.com') AND role = 'admin';
