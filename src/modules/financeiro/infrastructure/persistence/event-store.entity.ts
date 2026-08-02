import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Event store dedicado do agregado Boleto (schema financeiro, tabela adicional
// não presente no DDL principal — complementa financeiro.boletos, que funciona
// como read model/projeção otimizada para consulta, conforme padrão CQRS).
@Entity({ name: 'boleto_event_store', schema: 'financeiro' })
export class BoletoEventStoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'aggregate_id' })
  aggregateId: string;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column()
  version: number;

  @Column({ name: 'occurred_at' })
  occurredAt: Date;
}
