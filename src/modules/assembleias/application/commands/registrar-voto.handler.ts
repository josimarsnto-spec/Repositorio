import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistrarVotoCommand } from './registrar-voto.command';
import { PautaEntity } from '../../domain/pauta.entity';
import { VotoEntity } from '../../domain/voto.entity';

const OPCOES_VALIDAS = ['APROVAR', 'REPROVAR', 'ABSTER'];

// RN-03: um voto por unidade por pauta. A verificação abaixo cobre o caso
// comum (feedback amigável e rápido); o UNIQUE(pauta_id, unidade_id) no
// banco (ver condosphere_schema.sql) é a garantia definitiva contra
// condições de corrida — por isso capturamos a violação de unicidade
// (código 23505) e a traduzimos para o mesmo 409 Conflict.
@CommandHandler(RegistrarVotoCommand)
export class RegistrarVotoHandler implements ICommandHandler<RegistrarVotoCommand> {
  constructor(
    @InjectRepository(PautaEntity) private readonly pautaRepo: Repository<PautaEntity>,
    @InjectRepository(VotoEntity) private readonly votoRepo: Repository<VotoEntity>,
  ) {}

  async execute(command: RegistrarVotoCommand): Promise<VotoEntity> {
    if (!OPCOES_VALIDAS.includes(command.opcao)) {
      throw new BadRequestException(`opcao deve ser uma de: ${OPCOES_VALIDAS.join(', ')}`);
    }

    const pauta = await this.pautaRepo.findOne({ where: { id: command.pautaId } });
    if (!pauta) throw new NotFoundException('Pauta não encontrada');
    if (pauta.encerramento.getTime() <= Date.now()) {
      throw new BadRequestException('Esta pauta já está encerrada para votação');
    }

    const jaVotou = await this.votoRepo.findOne({
      where: { pautaId: command.pautaId, unidadeId: command.unidadeId },
    });
    if (jaVotou) {
      throw new ConflictException('Esta unidade já votou nesta pauta (RN-03)');
    }

    try {
      return await this.votoRepo.save(
        this.votoRepo.create({
          pautaId: command.pautaId,
          unidadeId: command.unidadeId,
          opcao: command.opcao,
          registradoPor: command.registradoPor,
          criadoEm: new Date(),
        }),
      );
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException('Esta unidade já votou nesta pauta (RN-03)');
      }
      throw err;
    }
  }
}
