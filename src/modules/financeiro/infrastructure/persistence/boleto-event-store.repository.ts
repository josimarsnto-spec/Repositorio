import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoletoEventStoreEntity } from './event-store.entity';
import { BoletoAggregate } from '../../domain/boleto.aggregate';
import { DomainEvent } from '../../domain/events/domain-event';

// Repositório de Event Sourcing: grava e reconstrói o agregado Boleto a partir
// de sua sequência de eventos. A publicação para o RabbitMQ é feita separadamente
// via outbox (auditoria.eventos_dominio_outbox), gravado na mesma transação.
@Injectable()
export class BoletoEventStoreRepository {
  constructor(
    @InjectRepository(BoletoEventStoreEntity)
    private readonly eventRepo: Repository<BoletoEventStoreEntity>,
  ) {}

  async save(boleto: BoletoAggregate): Promise<DomainEvent[]> {
    const events = boleto.pullUncommittedEvents();
    let version = boleto.version - events.length;

    for (const event of events) {
      version += 1;
      const entity = this.eventRepo.create({
        aggregateId: boleto.id,
        eventType: event.type,
        payload: event as unknown as Record<string, unknown>,
        version,
        occurredAt: event.occurredAt,
      });
      await this.eventRepo.save(entity);
    }
    return events;
  }

  async loadById(boletoId: string): Promise<BoletoAggregate | null> {
    const rows = await this.eventRepo.find({
      where: { aggregateId: boletoId },
      order: { version: 'ASC' },
    });
    if (rows.length === 0) return null;

    const events = rows.map((r) => r.payload as unknown as DomainEvent);
    return BoletoAggregate.fromHistory(events);
  }
}
