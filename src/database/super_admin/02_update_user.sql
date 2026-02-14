-- 02_update_user.sql
-- Promove o usuário especificado a Super Admin.

-- Atualiza o registro em public.usuarios baseado no e-mail
UPDATE public.usuarios
SET 
    is_super_admin = true,
    empresa_id = NULL -- Super Admin não precisa estar preso a uma empresa
WHERE 
    email = 'pedrosportes@gmail.com';

-- Opcional: Se o usuário não existir em public.usuarios, mas existir em auth.users, 
-- o insert abaixo garante a criação (descomente se necessário, mas o UPDATE acima deve bastar se o usuário já logou).

-- INSERT INTO public.usuarios (id, email, nome_completo, cargo, is_super_admin)
-- VALUES (
--   (SELECT id FROM auth.users WHERE email = 'pedrosportes@gmail.com' LIMIT 1),
--   'pedrosportes@gmail.com',
--   'Super Admin',
--   'admin',
--   true
-- )
-- ON CONFLICT (id) DO UPDATE
-- SET is_super_admin = true;
