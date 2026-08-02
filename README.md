# CondoSphere — Backend (NestJS)

API da plataforma CondoSphere, implementada em NestJS seguindo Clean Architecture, DDD, CQRS e Event-Driven Architecture, conforme o Documento de Arquitetura Técnica.

## Stack

- NestJS + TypeScript
- CQRS (`@nestjs/cqrs`) — Commands/Queries separados por módulo
- Event Sourcing no agregado `Boleto` (módulo Financeiro)
- PostgreSQL (TypeORM) — schema definido em `../docs/condosphere_schema.sql`
- Redis (cache de leitura)
- RabbitMQ (barramento de eventos de domínio, padrão Transactional Outbox)
- JWT + OAuth2 (Google) — `@nestjs/passport`
- Swagger em `/docs`
- Testes: Jest (unitário) + Supertest (e2e)
- Docker / docker-compose

## Como rodar

```bash
cp .env.example .env
docker compose up --build
# API em http://localhost:3000/api/v1
# Swagger em http://localhost:3000/docs
```

## Testes

```bash
npm test          # unitários (ex. BoletoAggregate)
npm run test:e2e  # e2e (requer stack no ar)
```

## Estrutura por módulo (Clean Architecture)

Cada bounded context em `src/modules/<contexto>/` segue:

```
domain/           entidades e agregados — sem dependência de framework
application/      commands, queries e handlers (CQRS) — casos de uso
infrastructure/   repositórios TypeORM, event store, mensageria
interface/        controllers REST (Swagger)
```

## Nível de implementação por módulo

| Módulo | Status | Observação |
|---|---|---|
| Identity (`identity`) | Funcional | Login JWT, estratégia OAuth2 Google. Falta: registro de usuário, refresh token endpoint, carregamento de papéis. |
| Condomínios (`condominios`) | Funcional | CQRS simples (cadastro + listagem). |
| Financeiro (`financeiro`) | Funcional, referência de padrão | Agregado `Boleto` com **Event Sourcing** completo (eventos, event store, replay via `fromHistory`), CQRS, cache Redis na query, outbox para RabbitMQ. Use este módulo como modelo para completar os demais. |
| Manutenção (`manutencao`) | Funcional (parcial) | Abertura de chamado com CQRS; falta fluxo completo de mudança de status/SLA. |
| Reservas, Assembleias, Portaria, Comunicação, Documentos | Scaffold | Módulo, controller e rotas registradas no Swagger, retornando `not_implemented`. Implementar seguindo exatamente o padrão do módulo Financeiro (agregado + commands/queries + repositório + controller). |

## Padrões-chave implementados

- **Transactional Outbox**: `shared/messaging/outbox-event.entity.ts` + `outbox-worker.service.ts` publicam eventos de domínio no RabbitMQ sem risco de dual-write.
- **Event Sourcing**: `modules/financeiro/domain/boleto.aggregate.ts` — nunca escreve estado diretamente, sempre via eventos (`BoletoGerado`, `MultaJurosAplicados`, `PagamentoConfirmado`).
- **CQRS**: toda escrita passa por `CommandBus`, toda leitura por `QueryBus`; read models (`boleto-read-model.entity.ts`) são projeções separadas do event store.
- **RBAC/ABAC**: `RolesGuard` + `@Roles(...)` + `tenantId`/`condominioId` extraídos do JWT (`CurrentUser`), nunca de parâmetro de requisição.
- **Idempotência**: `BoletoAggregate.confirmarPagamento` ignora reconfirmação — protege contra reentrega de webhook de pagamento.

## Próximos passos

1. Completar módulos em estado de scaffold seguindo o padrão do módulo Financeiro.
2. Adicionar migrations (TypeORM ou Flyway) versionando o schema a partir de `condosphere_schema.sql`.
3. Implementar refresh token e registro de usuário no módulo Identity.
4. Adicionar testes de integração cobrindo o fluxo completo de geração → pagamento → outbox → publicação.
