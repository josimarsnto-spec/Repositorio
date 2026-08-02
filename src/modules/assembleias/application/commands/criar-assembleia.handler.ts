import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CriarAssembleiaCommand } from './criar-assembleia.command';
import { AssembleiaEntity } from '../../domain/assembleia.entity';
import { PautaEntity } from '../../domain/pauta.entity';
import { OutboxEventEntity } from '../../../../shared/messaging/outbox-event.entity';

@CommandHandler(CriarAssembleiaCommand)
export class CriarAssembleiaHandler implements ICommandHandler<CriarAssembleiaCommand> {
  constructor(
    @InjectRepository(AssembleiaEntity) private readonly assembleiaRepo: Repository<AssembleiaEntity>,
    @InjectRepository(PautaEntity) private readonly pautaRepo: Repository<PautaEntity>,
    @InjectRepository(OutboxEventEntity) private readonly outboxRepo: Repository<OutboxEventEntity>,
  ) {}

  async execute(command: CriarAssembleiaCommand): Promise<AssembleiaEntity & { pautas: PautaEntity[] }> {
    if (!command.pautas || command.pautas.length === 0) {
      throw new BadRequestException('A assembleia precisa de ao menos uma pauta (US-05)');
    }

    const assembleia = await this.assembleiaRepo.save(
      this.assembleiaRepo.create({
        condominioId: command.condominioId,
        titulo: command.titulo,
        dataHora: new Date(command.dataHora),
        quorumMinimoPct: command.quorumMinimoPct ?? 50.0,
        status: 'AGENDADA',
        criadoEm: new Date(),
      }),
    );

    const pautas = await this.pautaRepo.save(
      command.pautas.map((p) =>
        this.pautaRepo.create({
          assembleiaId: assembleia.id,
          descricao: p.descricao,
          encerramento: new Date(p.encerramento),
        }),
      ),
    );

    await this.outboxRepo.save(
      this.outboxRepo.create({
        tenantId: 'resolver-a-partir-do-condominio', // TODO: join com condo.condominios.tenant_id (mesmo padrão do módulo Manutenção)
        tipoEvento: 'assembleia.AssembleiaCriada',
        payload: { assembleiaId: assembleia.id, condominioId: assembleia.condominioId, pautas: pautas.length },
        publicado: false,
        criadoEm: new Date(),
      }),
    );

    return { ...assembleia, pautas };
  }
}
