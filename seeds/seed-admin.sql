-- =====================================================================
-- Seed: usuário administrador (papel ADMIN_TENANT)
-- Gerado em 2026-08-02. Idempotente (pode rodar mais de uma vez sem duplicar).
--
-- Credenciais geradas para o primeiro acesso:
--   E-mail: josimar.snto@gmail.com
--   Senha : hwf7Zd7vmqK56@n6
--
-- IMPORTANTE: troque a senha pelo próprio app assim que fizer o primeiro
-- login (ainda não há tela de "alterar senha" no MVP — item para o backlog).
-- O hash abaixo foi gerado com bcryptjs (10 rounds) e já corresponde à
-- senha acima; NÃO é a senha em texto puro armazenada no banco.
-- =====================================================================

-- 1) Papéis de referência (RBAC) — só insere os que ainda não existem.
INSERT INTO identity.papeis (id, codigo) VALUES
  (1, 'SINDICO'),
  (2, 'MORADOR_PROPRIETARIO'),
  (3, 'MORADOR_INQUILINO'),
  (4, 'PORTEIRO'),
  (5, 'ADMIN_TENANT'),
  (6, 'CONSELHO_FISCAL')
ON CONFLICT (id) DO NOTHING;

-- 2) Tenant (administradora) — ajuste razao_social/cnpj para os dados reais.
INSERT INTO identity.tenants (id, razao_social, cnpj, plano, ativo)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'CondoSphere Administradora',
  '00000000000191',
  'standard',
  true
)
ON CONFLICT (cnpj) DO NOTHING;

-- 3) Usuário administrador, vinculado ao tenant acima.
INSERT INTO identity.usuarios (tenant_id, nome, email, senha_hash, ativo)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Josimar Santos',
  'josimar.snto@gmail.com',
  '$2b$10$JVAF4zelQMR.JW/U.UhY7.zuleGQy7zgQEu/PmoGZBNx0fzAWVQe2',
  true
)
ON CONFLICT (tenant_id, email)
DO UPDATE SET senha_hash = EXCLUDED.senha_hash, ativo = true;

-- 4) Papel ADMIN_TENANT do usuário em cada condomínio já cadastrado no tenant.
--    (usuarios_papeis exige condominio_id; rode este passo de novo sempre que
--    cadastrar um novo condomínio para essa administradora.)
INSERT INTO identity.usuarios_papeis (usuario_id, condominio_id, papel_id)
SELECT u.id, c.id, 5
FROM identity.usuarios u
JOIN condo.condominios c ON c.tenant_id = u.tenant_id
WHERE u.email = 'josimar.snto@gmail.com'
ON CONFLICT (usuario_id, condominio_id, papel_id) DO NOTHING;
