import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Mapeia assembleia.assembleias. CRUD simples (sem Event Sourcing) — o
// histórico relevante para auditoria já é coberto pelos votos, imutáveis
// por natureza (nunca são atualizados ou apagados, apenas inseridos).
@Entity({ name: 'assembleias', schema: 'assembleia' })
export class AssembleiaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'condominio_id' })
  condominioId: string;

  @Column()
  titulo: string;

  @Column({ name: 'data_hora', type: 'timestamptz' })
  dataHora: Date;

  @Column({ name: 'quorum_minimo_pct', type: 'numeric', default: 50.0 })
  quorumMinimoPct: number;

  @Column({ default: 'AGENDADA' }) // AGENDADA|EM_ANDAMENTO|ENCERRADA
  status: string;

  @Column({ name: 'criado_em', type: 'timestamptz' })
  criadoEm: Date;
}
