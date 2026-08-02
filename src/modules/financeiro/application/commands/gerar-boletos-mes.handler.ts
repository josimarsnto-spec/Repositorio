import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GerarBoletosMesCommand } from './gerar-boletos-mes.command';
import { BoletoAggregate } from '../../domain/boleto.aggregate';
import { BoletoEventStoreRepository } from '../../infrastructure/persistence/boleto-event-store.repository';
import { UnidadeEntity } from '../../../condominios/domain/unidade.entity';
import { OutboxEventEntity } from '../../../../shared/messaging/outbox-event.entity';

// Orquestra a geração mensal de boletos (Fluxo 5.1 do Documento de Arquitetura):
// calcula rateio por fração ideal, cria um agregado Boleto por unidade, persiste
// os eventos no event store e grava o evento agregado no outbox — tudo dentro do
// mesmo caso de uso de aplicação, mantendo a regra de negócio fora da infraestrutura.
@Injectable()
@CommandHandler(GerarBoletosMesCommand)
export class GerarBoletosMesHandler implements ICommandHandler<GerarBoletosMesCommand> {
  private readonly logger = new Logger(GerarBoletosMesHandler.name);

  constructor(
    @InjectRepository(UnidadeEntity)
    private readonly unidadeRepo: Repository<UnidadeEntity>,
    @InjectRepository(OutboxEventEntity)
    private readonly outboxRepo: Repository<OutboxEventEntity>,
    private readonly eventStore: BoletoEventStoreRepository,
  ) {}

  async execute(command: GerarBoletosMesCommand): Promise<{ totalGerados: number }> {
    const { condominioId, competencia } = command;

    const unidades = await this.unidadeRepo.find({ where: { condominioId } });
    if (unidades.length === 0) {
      this.logger.warn(`Nenhuma unidade encontrada para condomínio ${condominioId}`);
      return { totalGerados: 0 };
    }

    // Simplificação didática do rateio (RN-01): valor fixo por fração ideal;
    // em produção, o valor base viria de financeiro.despesas do mês (orçamento).
    const valorBasePorFracao = 1000;
    const vencimento = addDays(competencia, 10);

    let totalGerados = 0;
    for (const unidade of unidades) {
      try {
        const valor = round2(valorBasePorFracao * unidade.fracaoIdeal * unidades.length);
        const boleto = BoletoAggregate.gerar(
          condominioId,
          unidade.id,
          competencia,
          valor,
          vencimento,
        );
        await this.eventStore.save(boleto);
        totalGerados += 1;
      } catch (err) {
        // Erro em uma unidade não bloqueia as demais (US-01, critério de aceitação 3).
        this.logger.error(`Falha ao gerar boleto para unidade ${unidade.id}`, err as Error);
      }
    }

    const outbox = this.outboxRepo.create({
      tenantId: unidades[0].tenantId ?? 'desconhecido',
      tipoEvento: 'financeiro.BoletosGeradosDoMes',
      payload: { condominioId, competencia, totalGerados },
      publicado: false,
      criadoEm: new Date(),
    });
    await this.outboxRepo.save(outbox);

    return { totalGerados };
  }
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
