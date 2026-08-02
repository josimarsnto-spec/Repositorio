import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CondominioEntity } from './domain/condominio.entity';
import { CadastrarCondominioHandler } from './application/commands/cadastrar-condominio.handler';
import { ListarCondominiosHandler } from './application/queries/listar-condominios.handler';
import { CondominiosController } from './interface/condominios.controller';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([CondominioEntity])],
  controllers: [CondominiosController],
  providers: [CadastrarCondominioHandler, ListarCondominiosHandler],
})
export class CondominiosModule {}
