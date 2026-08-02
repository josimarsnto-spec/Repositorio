import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export interface ResultadoEnvioCanal {
  destinatarios: number;
  enviados: number;
  falhas: number;
  detalhe?: string;
}

// Mapeia comunicacao.comunicados. `canais` dirige quais NotificacaoChannel
// (ver infrastructure/channels) são acionados na publicação; `resultadoEnvio`
// guarda o resumo por canal para exibição na UI (transparência de entrega).
@Entity({ name: 'comunicados', schema: 'comunicacao' })
export class ComunicadoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'condominio_id' })
  condominioId: string;

  @Column()
  titulo: string;

  @Column()
  corpo: string;

  @Column({ default: 'TODOS' }) // TODOS|BLOCO|INADIMPLENTES
  segmento: string;

  @Column({ name: 'bloco_id', nullable: true })
  blocoId?: string;

  @Column({ type: 'text', array: true, default: () => "ARRAY['EMAIL']" })
  canais: string[];

  @Column({ name: 'resultado_envio', type: 'jsonb', nullable: true })
  resultadoEnvio?: Record<string, ResultadoEnvioCanal>;

  @Column({ name: 'publicado_por' })
  publicadoPor: string;

  @Column({ name: 'publicado_em', type: 'timestamptz' })
  publicadoEm: Date;
}
