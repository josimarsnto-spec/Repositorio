import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

// Cache Redis compartilhado (sessões de leitura, resultados de queries frequentes,
// ex. dashboard de inadimplência) — TTL curto para não servir dados financeiros defasados.
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({ url: config.get<string>('redis.url') }),
        ttl: 30_000, // 30s default; endpoints sensíveis sobrescrevem por decorator
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [CacheModule],
})
export class CacheConfigModule {}
