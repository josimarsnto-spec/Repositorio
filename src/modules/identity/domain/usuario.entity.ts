import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Mapeia identity.usuarios (condosphere_schema.sql). Entidade de domínio simples
// (não é agregado event-sourced — ao contrário de Boleto, não há necessidade de
// reconstruir histórico de estado para uma conta de usuário).
@Entity({ name: 'usuarios', schema: 'identity' })
export class UsuarioEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  nome: string;

  @Column()
  email: string;

  @Column({ name: 'senha_hash' })
  senhaHash: string;

  @Column({ name: 'mfa_habilitado', default: false })
  mfaHabilitado: boolean;

  @Column({ default: true })
  ativo: boolean;
}
