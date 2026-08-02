import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssembleiaEntity } from './domain/assembleia.entity';
import { PautaEntity } from './domain/pauta.entity';
import { VotoEntity } from './domain/voto.entity';
import { OutboxEventEntity } from '../../shared/messaging/outbox-event.entity';
import { CriarAssembleiaHandler } from './application/commands/criar-assembleia.handler';
import { RegistrarVotoHandler } from './application/commands/registrar-voto.handler';
import { ListarAssembleiasHandler } from './application/queries/listar-assembleias.handler';
import { ObterQuorumPautaHandler } from './application/queries/obter-quorum-pauta.handler';
import { AssembleiasController } from './interface/assembleias.controller';

// Assembleia Virtual (US-05, inspirado no diferencial de mercado de
// "assembleia virtual com enquetes/votação"): síndico cadastra pautas,
// condôminos votam por unidade (RN-03), e o quórum é lido em tempo real
// direto da view assembleia.vw_quorum_pauta.
@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([AssembleiaEntity, PautaEntity, VotoEntity, OutboxEventEntity])],
  controllers: [AssembleiasController],
  providers: [CriarAssembleiaHandler, RegistrarVotoHandler, ListarAssembleiasHandler, ObterQuorumPautaHandler],
})
export class AssembleiasModule {}
