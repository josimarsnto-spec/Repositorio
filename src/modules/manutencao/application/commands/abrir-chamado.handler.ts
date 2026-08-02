import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbrirChamadoCommand } from './abrir-chamado.command';
import { ChamadoEntity } from '../../domain/chamado.entity';
import { OutboxEventEntity } from '../../../../shared/messaging/outbox-event.entity';

@CommandHandler(AbrirChamadoCommand)
export class AbrirChamadoHandler implements ICommandHandler<AbrirChamadoCommand> {
  constructor(
    @InjectRepository(ChamadoEntity) private readonly chamadoRepo: Repository<ChamadoEntity>,
    @InjectRepository(OutboxEventEntity) private readonly outboxRepo: Repository<OutboxEventEntity>,
  ) {}

  async execute(command: AbrirChamadoCommand): Promise<ChamadoEntity> {
    if (command.descricao.trim().length < 10) {
      throw new BadRequestException('Descrição deve ter ao menos 10 caracteres (US-03)');
    }

    const chamado = this.chamadoRepo.create({ ...command, status: 'ABERTO' });
    const salvo = await this.chamadoRepo.save(chamado);

    await this.outboxRepo.save(
      this.outboxRepo.create({
        tenantId: 'resolver-a-partir-do-condominio', // TODO: join com condo.condominios.tenant_id
        tipoEvento: 'manutencao.ChamadoAberto',
        payload: { chamadoId: salvo.id, condominioId: salvo.condominioId },
        publicado: false,
        criadoEm: new Date(),
      }),
    );

    return salvo;
  }
}
