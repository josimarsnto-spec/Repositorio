import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import configuration from './config/configuration';
import { CacheConfigModule } from './common/cache/cache.module';
import { RabbitMQModule } from './shared/messaging/rabbitmq.module';
import { IdentityModule } from './modules/identity/identity.module';
import { CondominiosModule } from './modules/condominios/condominios.module';
import { FinanceiroModule } from './modules/financeiro/financeiro.module';
import { ManutencaoModule } from './modules/manutencao/manutencao.module';
import { ReservasModule } from './modules/reservas/reservas.module';
import { AssembleiasModule } from './modules/assembleias/assembleias.module';
import { PortariaModule } from './modules/portaria/portaria.module';
import { ComunicacaoModule } from './modules/comunicacao/comunicacao.module';
import { DocumentosModule } from './modules/documentos/documentos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        redact: ['req.headers.authorization'],
        customProps: () => ({ context: 'HTTP' }),
      },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false, // schema gerenciado via condosphere_schema.sql / migrations, nunca sync automático em produção
    }),
    CacheConfigModule,
    RabbitMQModule,
    IdentityModule,
    CondominiosModule,
    FinanceiroModule,
    ManutencaoModule,
    ReservasModule,
    AssembleiasModule,
    PortariaModule,
    ComunicacaoModule,
    DocumentosModule,
  ],
})
export class AppModule {}
