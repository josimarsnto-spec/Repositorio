import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { RefreshTokenCommand } from './refresh-token.command';
import { UsuarioEntity } from '../../domain/usuario.entity';
import { LoginResult } from './login.handler';

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler implements ICommandHandler<RefreshTokenCommand> {
  constructor(
    @InjectRepository(UsuarioEntity)
    private readonly usuarioRepo: Repository<UsuarioEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<LoginResult> {
    const { refreshToken } = command;

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken);
    } catch (err) {
      throw new UnauthorizedException('Token de atualização inválido ou expirado');
    }

    const usuario = await this.usuarioRepo.findOne({
      where: { id: payload.sub, ativo: true },
    });
    if (!usuario) {
      throw new UnauthorizedException('Usuário inativo ou não encontrado');
    }

    // Carregar papéis reais
    const userRoles = await this.usuarioRepo.query(
      `SELECT up.condominio_id as "condominioId", p.codigo 
       FROM identity.usuarios_papeis up 
       JOIN identity.papeis p ON up.papel_id = p.id 
       WHERE up.usuario_id = $1`,
      [usuario.id],
    );

    let rolesList = userRoles.map((r: any) => r.codigo) as string[];

    // Fallback para novo tenant sem condomínios (onboarding)
    if (rolesList.length === 0) {
      const [{ count }] = await this.usuarioRepo.query(
        `SELECT COUNT(*) as count FROM condo.condominios WHERE tenant_id = $1`,
        [usuario.tenantId],
      );
      if (Number(count) === 0) {
        rolesList = ['ADMIN_TENANT'];
      }
    }

    const newPayload = {
      sub: usuario.id,
      tenantId: usuario.tenantId,
      papeis: rolesList,
    };

    return {
      accessToken: this.jwtService.sign(newPayload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(newPayload, { expiresIn: '7d' }),
    };
  }
}
