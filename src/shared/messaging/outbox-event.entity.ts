import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Mapeia auditoria.eventos_dominio_outbox (ver condosphere_schema.sql).
@Entity({ name: 'eventos_dominio_outbox', schema: 'auditoria' })
export class OutboxEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ name: 'tipo_evento' })
  tipoEvento: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ default: false })
  publicado: boolean;

  @Column({ name: 'criado_em' })
  criadoEm: Date;

  @Column({ name: 'publicado_em', nullable: true })
  publicadoEm?: Date;

  @Column({ default: 0 })
  tentativas: number;

  @Column({ nullable: true })
  erro?: string;
}
