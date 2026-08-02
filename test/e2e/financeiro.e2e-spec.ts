import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

// Teste e2e ilustrativo — requer banco/Redis/RabbitMQ de teste no ar
// (docker-compose.yml) e um JWT válido gerado por um usuário de fixture.
describe('Financeiro (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/auth/login (POST) rejeita credenciais inválidas', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'inexistente@condosphere.dev', senha: 'senha-errada' })
      .expect(401);
  });

  it('/api/v1/condominios (GET) exige autenticação', () => {
    return request(app.getHttpServer()).get('/api/v1/condominios').expect(401);
  });
});
