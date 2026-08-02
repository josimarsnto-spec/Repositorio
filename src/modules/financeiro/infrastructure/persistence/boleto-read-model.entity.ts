import { Column, Entity, PrimaryColumn } from 'typeorm';

// Read model / projeção otimizada para consulta (mapeia financeiro.boletos do
// condosphere_schema.sql). Atualizada por um projector que escuta os eventos
// do agregado Boleto — nunca escrita diretamente pelos command handlers.
@Entity({ name: 'boletos', schema: 'financeiro' })
export class BoletoReadModelEntity {
  @PrimaryColumn('uuid')
  id: string;

  @PrimaryColumn({ type: 'date' })
  competencia: string;

  @Column({ name: 'condominio_id' })
  condominioId: string;

  @Column({ name: 'unidade_id' })
  unidadeId: string;

  @Column({ name: 'valor_original', type: 'numeric' })
  valorOriginal: number;

  @Column({ name: 'valor_multa', type: 'numeric', default: 0 })
  valorMulta: number;

  @Column({ name: 'valor_juros', type: 'numeric', default: 0 })
  valorJuros: number;

  @Column()
  vencimento: string;

  @Column()
  status: string;
}
