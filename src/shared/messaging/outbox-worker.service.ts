import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { OutboxEventEntity } from './outbox-event.entity';
import { EventPublisherService } from './event-publisher.service';
import { buildCloudEvent } from './cloud-event.envelope';

// Worker que varre auditoria.eventos_dominio_outbox (publicado = false) e publica no RabbitMQ.
// Roda a cada 2s; usa índice parcial idx_outbox_pendentes para manter a varredura barata
// mesmo com histórico grande (ver Documento de Modelagem PostgreSQL, seção 4).
@Injectable()
export class OutboxWorkerService {
  private readonly logger = new Logger(OutboxWorkerService.name);

  constructor(
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    private readonly publisher: EventPublisherService,
  ) {}

  @Interval(2000)
  async flushPendingEvents(): Promise<void> {
    const pendentes = await this.outboxRepo.find({
      where: { publicado: false, tentativas: LessThan(5) },
      take: 100,
      order: { criadoEm: 'ASC' },
    });

    for (const evento of pendentes) {
      try {
        const envelope = buildCloudEvent(
          `condosphere.${evento.tipoEvento}`,
          'condosphere/outbox',
          evento.tenantId,
          evento.payload,
        );
        await this.publisher.publish(envelope);
        evento.publicado = true;
        evento.publicadoEm = new Date();
        await this.outboxRepo.save(evento);
      } catch (err) {
        this.logger.error(`Falha ao publicar evento ${evento.id}`, err as Error);
        evento.tentativas += 1;
        evento.erro = (err as Error).message;
        await this.outboxRepo.save(evento);
      }
    }
  }
}
