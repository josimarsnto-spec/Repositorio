import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChamadoEntity } from './domain/chamado.entity';
import { OutboxEventEntity } from '../../shared/messaging/outbox-event.entity';
import { AbrirChamadoHandler } from './application/commands/abrir-chamado.handler';
import { ManutencaoController } from './interface/manutencao.controller';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([ChamadoEntity, OutboxEventEntity])],
  controllers: [ManutencaoController],
  providers: [AbrirChamadoHandler],
})
export class ManutencaoModule {}
