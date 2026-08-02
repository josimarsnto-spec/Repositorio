import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Mapeia assembleia.votos. UNIQUE(pauta_id, unidade_id) no banco garante
// RN-03 (um voto por unidade por pauta) mesmo sob concorrência — a
// aplicação também valida antes, para dar um erro 409 amigável em vez de
// deixar estourar a violação de constraint até o cliente (ver handler).
@Entity({ name: 'votos', schema: 'assembleia' })
export class VotoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'pauta_id' })
  pautaId: string;

  @Column({ name: 'unidade_id' })
  unidadeId: string;

  @Column() // APROVAR|REPROVAR|ABSTER
  opcao: string;

  @Column({ name: 'registrado_por' })
  registradoPor: string;

  @Column({ name: 'criado_em', type: 'timestamptz' })
  criadoEm: Date;
}
