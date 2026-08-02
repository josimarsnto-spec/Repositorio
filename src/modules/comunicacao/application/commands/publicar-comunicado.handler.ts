import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicarComunicadoCommand } from './publicar-comunicado.command';
import { ComunicadoEntity } from '../../domain/comunicado.entity';
import { DestinatariosRepository } from '../../infrastructure/destinatarios.repository';
import { NotificationDispatcherService } from '../../infrastructure/notification-dispatcher.service';
import { OutboxEventEntity } from '../../../../shared/messaging/outbox-event.entity';

const SEGMENTOS_VALIDOS = ['TODOS', 'BLOCO', 'INADIMPLENTES'];
const CANAIS_VALIDOS = ['EMAIL', 'WHATSAPP', 'SMS'];

// Publica o comunicado (UC-07) e dispara imediatamente para os canais
// selecionados. O registro é salvo mesmo que todos os canais falhem —
// resultado_envio documenta o que aconteceu, permitindo reenvio manual
// futuro sem perder o comunicado original.
@CommandHandler(PublicarComunicadoCommand)
export class PublicarComunicadoHandler implements ICommandHandler<PublicarComunicadoCommand> {
  constructor(
    @InjectRepository(ComunicadoEntity) private readonly comunicadoRepo: Repository<ComunicadoEntity>,
    @InjectRepository(OutboxEventEntity) private readonly outboxRepo: Repository<OutboxEventEntity>,
    private readonly destinatariosRepo: DestinatariosRepository,
    private readonly dispatcher: NotificationDispatcherService,
  ) {}

  async execute(command: PublicarComunicadoCommand): Promise<ComunicadoEntity> {
    if (!SEGMENTOS_VALIDOS.includes(command.segmento)) {
      throw new BadRequestException(`segmento deve ser uma de: ${SEGMENTOS_VALIDOS.join(', ')}`);
    }
    if (command.segmento === 'BLOCO' && !command.blocoId) {
      throw new BadRequestException('blocoId é obrigatório quando segmento = BLOCO');
    }
    const canais = command.canais?.length ? command.canais : ['EMAIL'];
    const canaisInvalidos = canais.filter((c) => !CANAIS_VALIDOS.includes(c));
    if (canaisInvalidos.length > 0) {
      throw new BadRequestException(`canais inválidos: ${canaisInvalidos.join(', ')}`);
    }

    const destinatarios = await this.destinatariosRepo.resolver(command.condominioId, command.segmento, command.blocoId);
    const resultadoEnvio = await this.dispatcher.disparar(canais, command.titulo, command.corpo, destinatarios);

    const comunicado = await this.comunicadoRepo.save(
      this.comunicadoRepo.create({
        condominioId: command.condominioId,
        titulo: command.titulo,
        corpo: command.corpo,
        segmento: command.segmento,
        blocoId: command.blocoId,
        canais,
        resultadoEnvio,
        publicadoPor: command.publicadoPor,
        publicadoEm: new Date(),
      }),
    );

    await this.outboxRepo.save(
      this.outboxRepo.create({
        tenantId: 'resolver-a-partir-do-condominio',
        tipoEvento: 'comunicacao.ComunicadoPublicado',
        payload: { comunicadoId: comunicado.id, condominioId: comunicado.condominioId, destinatarios: destinatarios.length },
        publicado: false,
        criadoEm: new Date(),
      }),
    );

    return comunicado;
  }
}
