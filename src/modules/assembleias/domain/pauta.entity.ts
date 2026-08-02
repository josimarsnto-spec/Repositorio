import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Mapeia assembleia.pautas. resultado é calculado quando a pauta encerra
// (fluxo assíncrono via @nestjs/schedule — ver EncerrarPautasVencidasJob).
@Entity({ name: 'pautas', schema: 'assembleia' })
export class PautaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assembleia_id' })
  assembleiaId: string;

  @Column()
  descricao: string;

  @Column({ type: 'timestamptz' })
  encerramento: Date;

  @Column({ nullable: true }) // APROVADA|REPROVADA|SEM_DELIBERACAO
  resultado?: string;
}
