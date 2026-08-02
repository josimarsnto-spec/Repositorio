import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Mapeia identity.tenants — raiz do isolamento multiempresa (ver condosphere_schema.sql).
// Criada durante o cadastro público de um novo cliente (RegistrarClienteHandler).
@Entity({ name: 'tenants', schema: 'identity' })
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'razao_social' })
  razaoSocial: string;

  @Column()
  cnpj: string;

  @Column({ default: 'trial' })
  plano: string;

  @Column({ default: true })
  ativo: boolean;

  @Column({ name: 'criado_em', type: 'timestamptz' })
  criadoEm: Date;

  @Column({ name: 'atualizado_em', type: 'timestamptz' })
  atualizadoEm: Date;
}
