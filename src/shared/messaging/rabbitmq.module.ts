import { Global, Module } from '@nestjs/common';
import { ClientProxyFactory, RmqOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventPublisherService } from './event-publisher.service';
import { OutboxWorkerService } from './outbox-worker.service';
import { OutboxEventEntity } from './outbox-event.entity';

export const RABBITMQ_CLIENT = 'RABBITMQ_CLIENT';

// Barramento de eventos (Event-Driven Architecture — Documento de Arquitetura, seção 2.2).
// Exchange topic única com routing key = tipo do evento (ex. financeiro.BoletoGerado),
// permitindo que qualquer módulo assine apenas os eventos que lhe interessam.
@Global()
@Module({
  imports: [ScheduleModule.forRoot(), TypeOrmModule.forFeature([OutboxEventEntity])],
  providers: [
    OutboxWorkerService,
    {
      provide: RABBITMQ_CLIENT,
      useFactory: (config: ConfigService) => {
        // O transporte RMQ nativo do NestJS opera sobre uma fila (queue), não expõe
        // topologia de exchange/topic diretamente na API do ClientProxy. A exchange
        // topic 'condosphere.domain-events' citada na arquitetura é provisionada via
        // definição de infraestrutura (ex. Terraform/script de bootstrap do RabbitMQ);
        // aqui o client publica na fila 'condosphere.events', roteada pela exchange
        // já configurada no broker.
        const options: RmqOptions = {
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('rabbitmq.url') as string],
            queue: 'condosphere.events',
            queueOptions: { durable: true },
          },
        };
        return ClientProxyFactory.create(options);
      },
      inject: [ConfigService],
    },
    EventPublisherService,
  ],
  exports: [RABBITMQ_CLIENT, EventPublisherService],
})
export class RabbitMQModule {}
