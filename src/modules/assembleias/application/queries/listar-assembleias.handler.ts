import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ListarAssembleiasQuery } from './listar-assembleias.query';
import { AssembleiaEntity } from '../../domain/assembleia.entity';
import { PautaEntity } from '../../domain/pauta.entity';

export interface AssembleiaComPautas extends AssembleiaEntity {
  pautas: PautaEntity[];
}

@QueryHandler(ListarAssembleiasQuery)
export class ListarAssembleiasHandler implements IQueryHandler<ListarAssembleiasQuery> {
  constructor(
    @InjectRepository(AssembleiaEntity) private readonly assembleiaRepo: Repository<AssembleiaEntity>,
    @InjectRepository(PautaEntity) private readonly pautaRepo: Repository<PautaEntity>,
  ) {}

  async execute(query: ListarAssembleiasQuery): Promise<AssembleiaComPautas[]> {
    const assembleias = await this.assembleiaRepo.find({
      where: { condominioId: query.condominioId },
      order: { dataHora: 'DESC' },
    });
    if (assembleias.length === 0) return [];

    const pautas = await this.pautaRepo.find({
      where: { assembleiaId: In(assembleias.map((a) => a.id)) },
    });

    return assembleias.map((a) => ({
      ...a,
      pautas: pautas.filter((p) => p.assembleiaId === a.id),
    }));
  }
}
