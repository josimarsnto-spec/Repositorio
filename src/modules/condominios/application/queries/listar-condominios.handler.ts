import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListarCondominiosQuery } from './listar-condominios.query';
import { CondominioEntity } from '../../domain/condominio.entity';

@QueryHandler(ListarCondominiosQuery)
export class ListarCondominiosHandler implements IQueryHandler<ListarCondominiosQuery> {
  constructor(
    @InjectRepository(CondominioEntity)
    private readonly repo: Repository<CondominioEntity>,
  ) {}

  async execute(query: ListarCondominiosQuery): Promise<CondominioEntity[]> {
    // tenantId sempre vem do token (CurrentUser), nunca de query param — reforça
    // o isolamento multi-tenant já garantido por RLS no banco (defesa em profundidade).
    return this.repo.find({ where: { tenantId: query.tenantId, ativo: true } });
  }
}
