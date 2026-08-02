import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard padrão de autenticação — valida o JWT e injeta req.user com
// { sub, tenantId, condominioId?, papeis[] } conforme claims emitidas no login.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
