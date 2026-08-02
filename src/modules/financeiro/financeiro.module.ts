import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoletoEventStoreEntity } from './infrastructure/persistence/event-store.entity';
import { BoletoReadModelEntity } from './infrastructure/persistence/boleto-read-model.entity';
import { BoletoEventStoreRepository } from './infrastructure/persistence/boleto-event-store.repository';
import { UnidadeEntity } from '../condominios/domain/unidade.entity';
import { OutboxEventEntity } from '../../shared/messaging/outbox-event.entity';
import { GerarBoletosMesHandler } from './application/commands/gerar-boletos-mes.handler';
import { ConfirmarPagamentoHandler } from './application/commands/confirmar-pagamento.handler';
import { ListarBoletosUnidadeHandler } from './application/queries/listar-boletos-unidade.handler';
import { ObterRelatorioFinanceiroHandler } from './application/queries/obter-relatorio-financeiro.handler';
import { FinanceiroController } from './interface/financeiro.controller';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([
      BoletoEventStoreEntity,
      BoletoReadModelEntity,
      UnidadeEntity,
      OutboxEventEntity,
    ]),
  ],
  controllers: [FinanceiroController],
  providers: [
    BoletoEventStoreRepository,
    GerarBoletosMesHandler,
    ConfirmarPagamentoHandler,
    ListarBoletosUnidadeHandler,
    ObterRelatorioFinanceiroHandler,
  ],
})
export class FinanceiroModule {}
