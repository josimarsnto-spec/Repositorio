import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListarComunicadosQuery } from './listar-comunicados.query';
import { ComunicadoEntity } from '../../domain/comunicado.entity';

@QueryHandler(ListarComunicadosQuery)
export class ListarComunicadosHandler implements IQueryHandler<ListarComunicadosQuery> {
  constructor(@InjectRepository(ComunicadoEntity) private readonly repo: Repository<ComunicadoEntity>) {}

  async execute(query: ListarComunicadosQuery): Promise<ComunicadoEntity[]> {
    return this.repo.find({
      where: { condominioId: query.condominioId },
      order: { publicadoEm: 'DESC' },
    });
  }
}
