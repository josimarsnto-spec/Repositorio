import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { RABBITMQ_CLIENT } from './rabbitmq.module';
import { CloudEventEnvelope } from './cloud-event.envelope';

// Publica eventos já persistidos na tabela outbox (auditoria.eventos_dominio_outbox).
// Usado pelo worker de outbox — nunca chamado diretamente dentro da transação de negócio,
// para preservar o padrão Transactional Outbox (evita dual-write).
@Injectable()
export class EventPublisherService {
  private readonly logger = new Logger(EventPublisherService.name);

  constructor(@Inject(RABBITMQ_CLIENT) private readonly client: ClientProxy) {}

  async publish(envelope: CloudEventEnvelope): Promise<void> {
    const routingKey = envelope.type.replace('condosphere.', '');
    await firstValueFrom(this.client.emit(routingKey, envelope));
    this.logger.debug(`Evento publicado: ${envelope.type} (${envelope.id})`);
  }
}
