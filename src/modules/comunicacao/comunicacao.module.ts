import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComunicadoEntity } from './domain/comunicado.entity';
import { OutboxEventEntity } from '../../shared/messaging/outbox-event.entity';
import { EmailChannelService } from './infrastructure/channels/email-channel.service';
import { WhatsappChannelService } from './infrastructure/channels/whatsapp-channel.service';
import { SmsChannelService } from './infrastructure/channels/sms-channel.service';
import { NotificationDispatcherService } from './infrastructure/notification-dispatcher.service';
import { DestinatariosRepository } from './infrastructure/destinatarios.repository';
import { PublicarComunicadoHandler } from './application/commands/publicar-comunicado.handler';
import { ListarComunicadosHandler } from './application/queries/listar-comunicados.handler';
import { ComunicacaoController } from './interface/comunicacao.controller';

// Comunicados multi-canal (diferencial inspirado no mercado: disparo por
// E-mail/WhatsApp/SMS a partir de um único comunicado). EMAIL é funcional
// via SMTP; WHATSAPP/SMS são adapters plugáveis (ver infrastructure/channels)
// aguardando integração com provedor.
@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([ComunicadoEntity, OutboxEventEntity])],
  controllers: [ComunicacaoController],
  providers: [
    EmailChannelService,
    WhatsappChannelService,
    SmsChannelService,
    NotificationDispatcherService,
    DestinatariosRepository,
    PublicarComunicadoHandler,
    ListarComunicadosHandler,
  ],
})
export class ComunicacaoModule {}
