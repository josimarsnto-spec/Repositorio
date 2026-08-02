import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsuarioEntity } from './domain/usuario.entity';
import { TenantEntity } from './domain/tenant.entity';
import { PasswordResetTokenEntity } from './domain/password-reset-token.entity';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { GoogleOAuthStrategy } from './infrastructure/strategies/google-oauth.strategy';
import { MailerService } from './infrastructure/mailer.service';
import { LoginHandler } from './application/commands/login.handler';
import { RegistrarClienteHandler } from './application/commands/registrar-cliente.handler';
import { SolicitarRedefinicaoSenhaHandler } from './application/commands/solicitar-redefinicao-senha.handler';
import { RedefinirSenhaHandler } from './application/commands/redefinir-senha.handler';
import { RefreshTokenHandler } from './application/commands/refresh-token.handler';
import { AuthController } from './interface/auth.controller';

@Module({
  imports: [
    CqrsModule,
    PassportModule,
    TypeOrmModule.forFeature([UsuarioEntity, TenantEntity, PasswordResetTokenEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    GoogleOAuthStrategy,
    MailerService,
    LoginHandler,
    RegistrarClienteHandler,
    SolicitarRedefinicaoSenhaHandler,
    RedefinirSenhaHandler,
    RefreshTokenHandler,
  ],
  exports: [JwtModule],
})
export class IdentityModule {}
