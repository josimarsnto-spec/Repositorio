import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Mapeia identity.tokens_redefinicao_senha. Guarda apenas o hash sha256 do
// token enviado por e-mail (ver MailerService) — o valor em texto puro nunca
// toca o banco, mesma lógica de defesa aplicada a senha_hash.
@Entity({ name: 'tokens_redefinicao_senha', schema: 'identity' })
export class PasswordResetTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'usuario_id' })
  usuarioId: string;

  @Column({ name: 'token_hash' })
  tokenHash: string;

  @Column({ name: 'expira_em', type: 'timestamptz' })
  expiraEm: Date;

  @Column({ name: 'usado_em', type: 'timestamptz', nullable: true })
  usadoEm?: Date;

  @Column({ name: 'criado_em', type: 'timestamptz' })
  criadoEm: Date;
}
