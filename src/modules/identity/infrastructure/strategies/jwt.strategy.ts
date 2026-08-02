import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../../../common/decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret') as string,
    });
  }

  // O payload validado vira req.user. tenantId é sempre extraído do token —
  // nunca aceito via parâmetro de requisição (ver Documento de Arquitetura, seção 9).
  async validate(payload: AuthenticatedUser): Promise<AuthenticatedUser> {
    return payload;
  }
}
