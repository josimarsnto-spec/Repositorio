import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { LoginCommand } from './login.command';
import { UsuarioEntity } from '../../domain/usuario.entity';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
}

@CommandHandler(LoginCommand)
export class LoginHandler implements ICommandHandler<LoginCommand> {
  constructor(
    @InjectRepository(UsuarioEntity)
    private readonly usuarioRepo: Repository<UsuarioEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: LoginCommand): Promise<LoginResult> {
    const { email, senha } = command;
    const usuario = await this.usuarioRepo.findOne({ where: { email, ativo: true } });
    if (!usuario) throw new UnauthorizedException('Credenciais inválidas');

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaValida) throw new UnauthorizedException('Credenciais inválidas');

    // TODO: carregar papéis/condomínios via identity.usuarios_papeis e incluir no claim.
    const payload = {
      sub: usuario.id,
      tenantId: usuario.tenantId,
      papeis: [] as string[],
    };

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}
