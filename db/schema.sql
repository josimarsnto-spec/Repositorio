-- =====================================================================
-- CondoSphere — Modelo de Banco de Dados PostgreSQL
-- Multiempresa (tenants/administradoras) + Multi-condomínio + Auditoria
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "btree_gist";     -- EXCLUDE constraints com ranges

-- ---------------------------------------------------------------------
-- SCHEMAS por Bounded Context (facilita extração futura para microsserviço)
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS identity;
CREATE SCHEMA IF NOT EXISTS condo;
CREATE SCHEMA IF NOT EXISTS financeiro;
CREATE SCHEMA IF NOT EXISTS manutencao;
CREATE SCHEMA IF NOT EXISTS reservas;
CREATE SCHEMA IF NOT EXISTS assembleia;
CREATE SCHEMA IF NOT EXISTS portaria;
CREATE SCHEMA IF NOT EXISTS comunicacao;
CREATE SCHEMA IF NOT EXISTS documentos;
CREATE SCHEMA IF NOT EXISTS auditoria;

-- =====================================================================
-- 1. IDENTITY & MULTIEMPRESA (tenants)
-- =====================================================================

-- tenants: administradoras de condomínio (isolamento multiempresa raiz)
CREATE TABLE identity.tenants (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    razao_social    varchar(200) NOT NULL,
    cnpj            varchar(14) NOT NULL UNIQUE,
    plano           varchar(30) NOT NULL DEFAULT 'standard',
    ativo           boolean NOT NULL DEFAULT true,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    atualizado_em   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE identity.tenants IS
  'Raiz do isolamento multiempresa. Toda tabela de negócio referencia tenant_id (direta ou indiretamente) para permitir RLS.';

CREATE TABLE identity.usuarios (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES identity.tenants(id),
    nome            varchar(150) NOT NULL,
    email           varchar(180) NOT NULL,
    cpf             varchar(11),
    telefone        varchar(20),      -- E.164 (ex. +5545999998888) — usado pelos canais WHATSAPP/SMS
    senha_hash      varchar(255) NOT NULL,
    mfa_habilitado  boolean NOT NULL DEFAULT false,
    ativo           boolean NOT NULL DEFAULT true,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    atualizado_em   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, email)
);
COMMENT ON TABLE identity.usuarios IS
  'Conta de acesso. Um usuário pode ter papéis em múltiplos condomínios via usuarios_papeis (ex. síndico profissional).';

CREATE TABLE identity.papeis (
    id      smallint PRIMARY KEY,
    codigo  varchar(30) NOT NULL UNIQUE   -- SINDICO, MORADOR_PROPRIETARIO, MORADOR_INQUILINO, PORTEIRO, ADMIN_TENANT, CONSELHO_FISCAL
);

CREATE TABLE identity.usuarios_papeis (
    usuario_id      uuid NOT NULL REFERENCES identity.usuarios(id) ON DELETE CASCADE,
    condominio_id   uuid NOT NULL,  -- FK lógica para condo.condominios (cross-schema; validada em trigger/app)
    papel_id        smallint NOT NULL REFERENCES identity.papeis(id),
    unidade_id      uuid,           -- obrigatório para papéis de morador
    criado_em       timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, condominio_id, papel_id)
);
COMMENT ON TABLE identity.usuarios_papeis IS
  'Vínculo N:N usuário-condomínio-papel. Base do RBAC/ABAC: toda autorização verifica (usuario, condominio_id, papel).';

CREATE TABLE identity.tokens_redefinicao_senha (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id      uuid NOT NULL REFERENCES identity.usuarios(id) ON DELETE CASCADE,
    token_hash      varchar(64) NOT NULL UNIQUE,   -- sha256(token) hex — nunca armazena o token em texto puro
    expira_em       timestamptz NOT NULL,
    usado_em        timestamptz,                   -- marcado no primeiro uso (token de uso único)
    criado_em       timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE identity.tokens_redefinicao_senha IS
  'Fluxo "esqueci minha senha": token opaco enviado por e-mail, hash sha256 guardado no banco (mesma lógica de senha_hash — nunca guardar segredo em texto puro). expira_em + usado_em impedem replay.';

-- =====================================================================
-- 2. CONDOMÍNIOS & UNIDADES (multi-condomínio)
-- =====================================================================

CREATE TABLE condo.condominios (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES identity.tenants(id),
    nome            varchar(150) NOT NULL,
    cnpj            varchar(14) UNIQUE,
    endereco        jsonb NOT NULL,
    regimento       jsonb,               -- parâmetros: quórum mínimo, multa/juros, antecedência de reserva
    ativo           boolean NOT NULL DEFAULT true,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    atualizado_em   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE condo.condominios IS
  'Unidade de gestão multi-condomínio. tenant_id garante que uma administradora só acesse seus próprios condomínios via RLS.';

ALTER TABLE identity.usuarios_papeis
  ADD CONSTRAINT fk_usuarios_papeis_condominio
  FOREIGN KEY (condominio_id) REFERENCES condo.condominios(id) ON DELETE CASCADE;

CREATE TABLE condo.blocos (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id   uuid NOT NULL REFERENCES condo.condominios(id) ON DELETE CASCADE,
    nome            varchar(60) NOT NULL,
    UNIQUE (condominio_id, nome)
);

CREATE TABLE condo.unidades (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id   uuid NOT NULL REFERENCES condo.condominios(id) ON DELETE CASCADE,
    bloco_id        uuid REFERENCES condo.blocos(id),
    identificacao   varchar(30) NOT NULL,          -- ex. "Apto 101"
    fracao_ideal    numeric(9,6) NOT NULL CHECK (fracao_ideal > 0),
    tipo            varchar(20) NOT NULL DEFAULT 'residencial', -- residencial|comercial
    criado_em       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (condominio_id, identificacao)
);
COMMENT ON TABLE condo.unidades IS
  'fracao_ideal é a base do rateio financeiro (RN-01). CHECK garante consistência mínima; soma=1.0 validada em view de conferência.';

CREATE TABLE condo.vinculos_unidade (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade_id      uuid NOT NULL REFERENCES condo.unidades(id) ON DELETE CASCADE,
    usuario_id      uuid NOT NULL REFERENCES identity.usuarios(id),
    tipo_vinculo    varchar(20) NOT NULL,          -- PROPRIETARIO | INQUILINO
    vigencia_inicio date NOT NULL DEFAULT current_date,
    vigencia_fim    date,
    CONSTRAINT chk_vigencia CHECK (vigencia_fim IS NULL OR vigencia_fim >= vigencia_inicio)
);
COMMENT ON TABLE condo.vinculos_unidade IS
  'Histórico de proprietários/inquilinos por unidade, com vigência — suporta troca de morador sem perder histórico (RN-05).';

-- =====================================================================
-- 3. FINANCEIRO & COBRANÇA
-- =====================================================================

CREATE TABLE financeiro.rateio_configuracoes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id   uuid NOT NULL REFERENCES condo.condominios(id),
    tipo            varchar(20) NOT NULL DEFAULT 'FRACAO_IDEAL', -- FRACAO_IDEAL | IGUALITARIO
    vigente_desde   date NOT NULL DEFAULT current_date,
    versao          integer NOT NULL DEFAULT 1
);
COMMENT ON TABLE financeiro.rateio_configuracoes IS
  'Versionamento de regra de rateio (RN-01): nova vigência cria nova linha, preservando cálculo histórico auditável.';

CREATE TABLE financeiro.boletos (
    id              uuid NOT NULL DEFAULT gen_random_uuid(),
    condominio_id   uuid NOT NULL REFERENCES condo.condominios(id),
    unidade_id      uuid NOT NULL REFERENCES condo.unidades(id),
    competencia     date NOT NULL,                -- primeiro dia do mês de referência
    valor_original  numeric(12,2) NOT NULL CHECK (valor_original >= 0),
    valor_multa     numeric(12,2) NOT NULL DEFAULT 0,
    valor_juros     numeric(12,2) NOT NULL DEFAULT 0,
    vencimento      date NOT NULL,
    status          varchar(20) NOT NULL DEFAULT 'ABERTO', -- ABERTO|PAGO|CANCELADO|EM_ATRASO
    codigo_barras   varchar(48),
    pix_txid        varchar(64),
    pago_em         timestamptz,
    versao          integer NOT NULL DEFAULT 1,     -- optimistic locking
    criado_em       timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, competencia)   -- chave composta: PostgreSQL exige a coluna de partição em toda PK/UNIQUE
) PARTITION BY RANGE (competencia);

COMMENT ON TABLE financeiro.boletos IS
  'Particionada por competência (mês) para performance em histórico longo (anos de boletos). status EM_ATRASO calculado por job. PK composta (id, competencia) é exigência do PostgreSQL para tabelas particionadas; id (uuid) permanece o identificador lógico usado pela aplicação.';

CREATE TABLE financeiro.boletos_y2026 PARTITION OF financeiro.boletos
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE financeiro.boletos_y2027 PARTITION OF financeiro.boletos
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

CREATE TABLE financeiro.boleto_itens (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    boleto_id       uuid NOT NULL,
    boleto_competencia date NOT NULL,
    descricao       varchar(120) NOT NULL,          -- ex. "Taxa condominial", "Fundo de reserva"
    valor           numeric(12,2) NOT NULL,
    FOREIGN KEY (boleto_id, boleto_competencia) REFERENCES financeiro.boletos(id, competencia)
);
COMMENT ON TABLE financeiro.boleto_itens IS 'Composição detalhada do boleto (transparência de cobrança).';

CREATE TABLE financeiro.pagamentos (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    boleto_id       uuid NOT NULL,
    boleto_competencia date NOT NULL,
    valor_pago      numeric(12,2) NOT NULL,
    metodo          varchar(20) NOT NULL,          -- PIX|BOLETO|CARTAO
    referencia_externa varchar(100),                -- id do gateway/webhook
    recebido_em     timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (boleto_id, boleto_competencia) REFERENCES financeiro.boletos(id, competencia)
);

CREATE TABLE financeiro.despesas (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id   uuid NOT NULL REFERENCES condo.condominios(id),
    categoria       varchar(60) NOT NULL,
    descricao       varchar(200) NOT NULL,
    valor           numeric(12,2) NOT NULL CHECK (valor >= 0),
    competencia     date NOT NULL,
    comprovante_url text,
    criado_em       timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE financeiro.despesas IS 'Base da prestação de contas (UC-09); comprovante_url aponta para Object Storage.';

CREATE TABLE financeiro.contas_bancarias (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id   uuid NOT NULL REFERENCES condo.condominios(id),
    banco           varchar(10) NOT NULL,
    agencia         varchar(10) NOT NULL,
    conta           varchar(20) NOT NULL,
    tipo_layout_cnab varchar(6)          -- '240'|'400'
);

-- =====================================================================
-- 4. MANUTENÇÃO & CHAMADOS
-- =====================================================================

CREATE TABLE manutencao.categorias_sla (
    id              smallint PRIMARY KEY,
    nome            varchar(40) NOT NULL,          -- Emergência, Geral, Áreas comuns
    sla_horas       integer NOT NULL
);

CREATE TABLE manutencao.chamados (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id   uuid NOT NULL REFERENCES condo.condominios(id),
    unidade_id      uuid REFERENCES condo.unidades(id),
    aberto_por      uuid NOT NULL REFERENCES identity.usuarios(id),
    categoria_id    smallint NOT NULL REFERENCES manutencao.categorias_sla(id),
    descricao       text NOT NULL CHECK (char_length(descricao) >= 10),
    status          varchar(20) NOT NULL DEFAULT 'ABERTO', -- ABERTO|EM_ANDAMENTO|CONCLUIDO|CANCELADO
    prioridade      varchar(10) NOT NULL DEFAULT 'NORMAL',
    sla_vencimento  timestamptz,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    concluido_em    timestamptz
);

CREATE INDEX idx_chamados_status_prioridade ON manutencao.chamados (condominio_id, status, prioridade);

CREATE TABLE manutencao.chamado_anexos (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chamado_id      uuid NOT NULL REFERENCES manutencao.chamados(id) ON DELETE CASCADE,
    url             text NOT NULL,
    tipo            varchar(10) NOT NULL            -- FOTO|VIDEO
);

CREATE TABLE manutencao.chamado_eventos (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    chamado_id      uuid NOT NULL REFERENCES manutencao.chamados(id) ON DELETE CASCADE,
    status_novo     varchar(20) NOT NULL,
    comentario      text,
    autor_id        uuid REFERENCES identity.usuarios(id),
    criado_em       timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE manutencao.chamado_eventos IS 'Timeline auditável de mudanças de status exibida na UI (US-03).';

-- =====================================================================
-- 5. RESERVAS DE ÁREAS COMUNS
-- =====================================================================

CREATE TABLE reservas.areas_comuns (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id   uuid NOT NULL REFERENCES condo.condominios(id),
    nome            varchar(80) NOT NULL,
    antecedencia_minima_horas integer NOT NULL DEFAULT 24,
    exige_adimplencia boolean NOT NULL DEFAULT false,
    capacidade      integer
);

CREATE TABLE reservas.reservas (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    area_comum_id   uuid NOT NULL REFERENCES reservas.areas_comuns(id),
    unidade_id      uuid NOT NULL REFERENCES condo.unidades(id),
    solicitado_por  uuid NOT NULL REFERENCES identity.usuarios(id),
    periodo         tstzrange NOT NULL,
    status          varchar(15) NOT NULL DEFAULT 'CONFIRMADA', -- CONFIRMADA|CANCELADA
    criado_em       timestamptz NOT NULL DEFAULT now(),
    EXCLUDE USING gist (area_comum_id WITH =, periodo WITH &&) WHERE (status = 'CONFIRMADA')
);
COMMENT ON TABLE reservas.reservas IS
  'EXCLUDE USING gist impede sobreposição de horários para a mesma área comum diretamente no banco (RN-04), eliminando race conditions de concorrência.';

-- =====================================================================
-- 6. ASSEMBLEIAS & VOTAÇÃO
-- =====================================================================

CREATE TABLE assembleia.assembleias (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id   uuid NOT NULL REFERENCES condo.condominios(id),
    titulo          varchar(150) NOT NULL,
    data_hora       timestamptz NOT NULL,
    quorum_minimo_pct numeric(5,2) NOT NULL DEFAULT 50.00,
    status          varchar(20) NOT NULL DEFAULT 'AGENDADA', -- AGENDADA|EM_ANDAMENTO|ENCERRADA
    criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE assembleia.pautas (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assembleia_id   uuid NOT NULL REFERENCES assembleia.assembleias(id) ON DELETE CASCADE,
    descricao       text NOT NULL,
    encerramento    timestamptz NOT NULL,
    resultado       varchar(20)                     -- APROVADA|REPROVADA|SEM_DELIBERACAO
);

CREATE TABLE assembleia.votos (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pauta_id        uuid NOT NULL REFERENCES assembleia.pautas(id) ON DELETE CASCADE,
    unidade_id      uuid NOT NULL REFERENCES condo.unidades(id),
    opcao           varchar(15) NOT NULL,           -- APROVAR|REPROVAR|ABSTER
    registrado_por  uuid NOT NULL REFERENCES identity.usuarios(id),
    criado_em       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (pauta_id, unidade_id)                    -- RN-03: 1 voto por unidade por pauta
);
COMMENT ON TABLE assembleia.votos IS
  'UNIQUE(pauta_id, unidade_id) garante idempotência de voto por unidade (RN-03), não por pessoa.';

-- =====================================================================
-- 7. PORTARIA
-- =====================================================================

CREATE TABLE portaria.visitantes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id   uuid NOT NULL REFERENCES condo.condominios(id),
    unidade_id      uuid NOT NULL REFERENCES condo.unidades(id),
    nome            varchar(150) NOT NULL,
    documento       varchar(20),
    autorizado_por  uuid REFERENCES identity.usuarios(id),
    entrada_em      timestamptz,
    saida_em        timestamptz
);

CREATE TABLE portaria.encomendas (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id   uuid NOT NULL REFERENCES condo.condominios(id),
    unidade_id      uuid NOT NULL REFERENCES condo.unidades(id),
    recebido_em     timestamptz NOT NULL DEFAULT now(),
    retirado_em     timestamptz,
    registrado_por  uuid REFERENCES identity.usuarios(id)
);

-- =====================================================================
-- 8. COMUNICAÇÃO
-- =====================================================================

CREATE TABLE comunicacao.comunicados (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id   uuid NOT NULL REFERENCES condo.condominios(id),
    titulo          varchar(150) NOT NULL,
    corpo           text NOT NULL,
    segmento        varchar(20) NOT NULL DEFAULT 'TODOS', -- TODOS|BLOCO|INADIMPLENTES
    bloco_id        uuid REFERENCES condo.blocos(id),      -- obrigatório apenas quando segmento = BLOCO
    canais          text[] NOT NULL DEFAULT ARRAY['EMAIL'], -- EMAIL|WHATSAPP|SMS (adapter por canal na aplicação)
    resultado_envio jsonb,                                  -- { "EMAIL": {"enviados": 12, "falhas": 0}, ... }
    publicado_por   uuid NOT NULL REFERENCES identity.usuarios(id),
    publicado_em    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN comunicacao.comunicados.canais IS
  'Multi-canal (RN de comunicação): cada valor dispara um NotificacaoChannel na aplicação. WHATSAPP/SMS ficam com adapter stub até a integração com provedor real ser contratada.';

-- =====================================================================
-- 9. DOCUMENTOS (versionamento)
-- =====================================================================

CREATE TABLE documentos.documentos (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    condominio_id   uuid NOT NULL REFERENCES condo.condominios(id),
    categoria       varchar(40) NOT NULL,            -- ATA|CONTRATO|REGIMENTO|PRESTACAO_CONTAS
    titulo          varchar(150) NOT NULL,
    criado_em       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE documentos.documento_versoes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    documento_id    uuid NOT NULL REFERENCES documentos.documentos(id) ON DELETE CASCADE,
    numero_versao   integer NOT NULL,
    url_arquivo     text NOT NULL,
    assinatura_status varchar(20),                    -- PENDENTE|ASSINADO|N_A
    criado_em       timestamptz NOT NULL DEFAULT now(),
    UNIQUE (documento_id, numero_versao)
);
COMMENT ON TABLE documentos.documento_versoes IS
  'Versionamento explícito por documento — nunca sobrescreve arquivo, preservando histórico legal (RN-07).';

-- =====================================================================
-- 10. AUDITORIA (trilha imutável — RN-09, LGPD)
-- =====================================================================

CREATE TABLE auditoria.log_eventos (
    id              bigserial PRIMARY KEY,
    tenant_id       uuid NOT NULL,
    condominio_id   uuid,
    usuario_id      uuid,
    entidade        varchar(60) NOT NULL,
    entidade_id     uuid,
    acao            varchar(20) NOT NULL,             -- CREATE|UPDATE|DELETE|LOGIN|EXPORT
    dados_antes     jsonb,
    dados_depois    jsonb,
    ip_origem       inet,
    criado_em       timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE auditoria.log_eventos IS
  'Append-only (sem UPDATE/DELETE permitido via GRANT). Alimentada por triggers e pela camada de aplicação.';
-- Revoga UPDATE/DELETE do papel de aplicação para reforçar imutabilidade:
-- REVOKE UPDATE, DELETE ON auditoria.log_eventos FROM app_role;

CREATE TABLE auditoria.eventos_dominio_outbox (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL,
    tipo_evento     varchar(80) NOT NULL,             -- ex. BoletoGerado, ChamadoAberto
    payload         jsonb NOT NULL,
    publicado       boolean NOT NULL DEFAULT false,
    criado_em       timestamptz NOT NULL DEFAULT now(),
    publicado_em    timestamptz
);
COMMENT ON TABLE auditoria.eventos_dominio_outbox IS
  'Transactional Outbox: garante publicação confiável de eventos de domínio no RabbitMQ (evita dual-write).';

-- =====================================================================
-- ÍNDICES ADICIONAIS
-- =====================================================================
CREATE INDEX idx_boletos_unidade_status ON financeiro.boletos (unidade_id, status);
CREATE INDEX idx_boletos_vencimento ON financeiro.boletos (vencimento) WHERE status = 'ABERTO';
CREATE INDEX idx_unidades_condominio ON condo.unidades (condominio_id);
CREATE INDEX idx_reservas_unidade ON reservas.reservas (unidade_id);
CREATE INDEX idx_votos_pauta ON assembleia.votos (pauta_id);
CREATE INDEX idx_log_eventos_entidade ON auditoria.log_eventos (entidade, entidade_id);
CREATE INDEX idx_outbox_pendentes ON auditoria.eventos_dominio_outbox (criado_em) WHERE publicado = false;

-- =====================================================================
-- ROW LEVEL SECURITY (isolamento multi-tenant / multi-condomínio)
-- =====================================================================
ALTER TABLE condo.condominios ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_condominios ON condo.condominios
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE financeiro.boletos ENABLE ROW LEVEL SECURITY;
CREATE POLICY condominio_isolation_boletos ON financeiro.boletos
  USING (condominio_id IN (
    SELECT id FROM condo.condominios WHERE tenant_id = current_setting('app.tenant_id')::uuid
  ));
-- Política equivalente deve ser replicada em unidades, chamados, reservas, assembleias, etc.
-- current_setting('app.tenant_id') é definido pela aplicação a cada conexão (SET app.tenant_id = '...').

-- =====================================================================
-- VIEWS
-- =====================================================================

CREATE VIEW financeiro.vw_inadimplencia_por_condominio AS
SELECT b.condominio_id,
       count(*) FILTER (WHERE b.status IN ('ABERTO','EM_ATRASO') AND b.vencimento < current_date) AS boletos_vencidos,
       sum(b.valor_original) FILTER (WHERE b.status IN ('ABERTO','EM_ATRASO') AND b.vencimento < current_date) AS valor_em_atraso
FROM financeiro.boletos b
GROUP BY b.condominio_id;
COMMENT ON VIEW financeiro.vw_inadimplencia_por_condominio IS 'Base do dashboard gerencial (UC-10, US do síndico).';

CREATE VIEW condo.vw_conferencia_fracao_ideal AS
SELECT condominio_id, sum(fracao_ideal) AS soma_fracao_ideal
FROM condo.unidades
GROUP BY condominio_id
HAVING sum(fracao_ideal) <> 1.0;
COMMENT ON VIEW condo.vw_conferencia_fracao_ideal IS
  'Alerta operacional: condomínios cuja soma de frações ideais não fecha em 1.0 (erro de cadastro).';

CREATE VIEW assembleia.vw_quorum_pauta AS
SELECT p.id AS pauta_id,
       count(v.id) AS votos_computados,
       (SELECT count(*) FROM condo.unidades u
          JOIN assembleia.assembleias a ON a.id = p.assembleia_id
          WHERE u.condominio_id = a.condominio_id) AS total_unidades,
       round(100.0 * count(v.id) / NULLIF((SELECT count(*) FROM condo.unidades u
          JOIN assembleia.assembleias a ON a.id = p.assembleia_id
          WHERE u.condominio_id = a.condominio_id), 0), 2) AS percentual_quorum
FROM assembleia.pautas p
LEFT JOIN assembleia.votos v ON v.pauta_id = p.id
GROUP BY p.id;
COMMENT ON VIEW assembleia.vw_quorum_pauta IS 'Usada pela UI de votação para exibir quórum em tempo real (US-05).';

-- =====================================================================
-- FUNCTIONS / PROCEDURES
-- =====================================================================

-- Trigger genérico de atualização de atualizado_em
CREATE OR REPLACE FUNCTION auditoria.fn_set_atualizado_em()
RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_condominios_atualizado_em
  BEFORE UPDATE ON condo.condominios
  FOR EACH ROW EXECUTE FUNCTION auditoria.fn_set_atualizado_em();

-- Trigger de auditoria genérica para tabelas financeiras sensíveis.
-- tenant_id é derivado de condo.condominios (fonte única de verdade) em vez de
-- depender de current_setting('app.tenant_id'): a auditoria não deve falhar
-- nem gravar um tenant_id nulo só porque a aplicação esqueceu de setar a
-- variável de sessão (ex. script administrativo, migration, job em background).
-- Fallback para current_setting apenas se, por algum motivo, o condomínio
-- referenciado não existir mais (nunca deveria acontecer, dado o FK).
CREATE OR REPLACE FUNCTION auditoria.fn_log_alteracao_boleto()
RETURNS trigger AS $$
BEGIN
  INSERT INTO auditoria.log_eventos (tenant_id, condominio_id, entidade, entidade_id, acao, dados_antes, dados_depois)
  VALUES (
    COALESCE(
      (SELECT tenant_id FROM condo.condominios WHERE id = COALESCE(NEW.condominio_id, OLD.condominio_id)),
      NULLIF(current_setting('app.tenant_id', true), '')::uuid
    ),
    COALESCE(NEW.condominio_id, OLD.condominio_id),
    'financeiro.boletos',
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditoria_boletos
  AFTER INSERT OR UPDATE OR DELETE ON financeiro.boletos
  FOR EACH ROW EXECUTE FUNCTION auditoria.fn_log_alteracao_boleto();

-- Procedure: gerar boletos do mês para um condomínio (chamada pelo job mensal)
CREATE OR REPLACE PROCEDURE financeiro.sp_gerar_boletos_mes(p_condominio_id uuid, p_competencia date)
LANGUAGE plpgsql AS $$
DECLARE
  v_unidade RECORD;
  v_valor_base numeric(12,2);
BEGIN
  SELECT valor_total_orcado / NULLIF((SELECT count(*) FROM condo.unidades WHERE condominio_id = p_condominio_id), 0)
    INTO v_valor_base
  FROM (SELECT sum(valor) AS valor_total_orcado FROM financeiro.despesas
        WHERE condominio_id = p_condominio_id AND competencia = p_competencia) d;

  FOR v_unidade IN
    SELECT id, fracao_ideal FROM condo.unidades WHERE condominio_id = p_condominio_id
  LOOP
    INSERT INTO financeiro.boletos (condominio_id, unidade_id, competencia, valor_original, vencimento, status)
    VALUES (
      p_condominio_id,
      v_unidade.id,
      p_competencia,
      round(v_valor_base * v_unidade.fracao_ideal * (SELECT count(*) FROM condo.unidades WHERE condominio_id = p_condominio_id), 2),
      p_competencia + INTERVAL '10 days',
      'ABERTO'
    );
  END LOOP;

  INSERT INTO auditoria.eventos_dominio_outbox (tenant_id, tipo_evento, payload)
  SELECT (SELECT tenant_id FROM condo.condominios WHERE id = p_condominio_id),
         'BoletosGeradosDoMes',
         jsonb_build_object('condominio_id', p_condominio_id, 'competencia', p_competencia);
END;
$$;
COMMENT ON PROCEDURE financeiro.sp_gerar_boletos_mes IS
  'Encapsula RN-01 (rateio por fração ideal) no banco como salvaguarda; a orquestração principal reside na Application Layer (Fluxo 5.1).';

-- Procedure: baixar boleto ao confirmar pagamento (idempotente)
CREATE OR REPLACE PROCEDURE financeiro.sp_confirmar_pagamento(
  p_boleto_id uuid, p_competencia date, p_valor numeric, p_metodo varchar, p_referencia varchar
)
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM financeiro.pagamentos WHERE referencia_externa = p_referencia) THEN
    RETURN; -- idempotência: webhook duplicado
  END IF;

  INSERT INTO financeiro.pagamentos (boleto_id, boleto_competencia, valor_pago, metodo, referencia_externa)
  VALUES (p_boleto_id, p_competencia, p_valor, p_metodo, p_referencia);

  UPDATE financeiro.boletos
     SET status = 'PAGO', pago_em = now(), versao = versao + 1
   WHERE id = p_boleto_id AND competencia = p_competencia;
END;
$$;

-- =====================================================================
-- FIM DO SCRIPT
-- =====================================================================
