import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { ListarBoletosUnidadeQuery } from './listar-boletos-unidade.query';
import { BoletoReadModelEntity } from '../../infrastructure/persistence/boleto-read-model.entity';

// Query lê do read model (projeção), nunca do event store — separação clássica
// de CQRS. Cache Redis de 30s reduz carga na tela "Financeiro" do morador,
// consultada com muita frequência e tolerante a leve defasagem.
@QueryHandler(ListarBoletosUnidadeQuery)
export class ListarBoletosUnidadeHandler implements IQueryHandler<ListarBoletosUnidadeQuery> {
  constructor(
    @InjectRepository(BoletoReadModelEntity)
    private readonly repo: Repository<BoletoReadModelEntity>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async execute(query: ListarBoletosUnidadeQuery): Promise<BoletoReadModelEntity[]> {
    const cacheKey = `boletos:unidade:${query.unidadeId}`;
    const cached = await this.cache.get<BoletoReadModelEntity[]>(cacheKey);
    if (cached) return cached;

    const boletos = await this.repo.find({
      where: { unidadeId: query.unidadeId },
      order: { competencia: 'DESC' },
    });
    await this.cache.set(cacheKey, boletos, 30_000);
    return boletos;
  }
}
