import { createHash } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { RedefinirSenhaCommand } from './redefinir-senha.command';
import { PasswordResetTokenEntity } from '../../domain/password-reset-token.entity';
import { UsuarioEntity } from '../../domain/usuario.entity';

// Token de uso único: usado_em é gravado assim que validado, então mesmo que
// o e-mail seja reencaminhado ou o link clicado duas vezes, a segunda
// tentativa cai no mesmo erro de "token inválido ou expirado".
@CommandHandler(RedefinirSenhaCommand)
export class RedefinirSenhaHandler implements ICommandHandler<RedefinirSenhaCommand> {
  constructor(
    @InjectRepository(PasswordResetTokenEntity) private readonly tokenRepo: Repository<PasswordResetTokenEntity>,
    @InjectRepository(UsuarioEntity) private readonly usuarioRepo: Repository<UsuarioEntity>,
  ) {}

  async execute(command: RedefinirSenhaCommand): Promise<{ status: 'ok' }> {
    const tokenHash = createHash('sha256').update(command.token).digest('hex');
    const registro = await this.tokenRepo.findOne({ where: { tokenHash } });

    if (!registro || registro.usadoEm || registro.expiraEm.getTime() <= Date.now()) {
      throw new BadRequestException('Token inválido ou expirado. Solicite a redefinição novamente.');
    }

    const senhaHash = await bcrypt.hash(command.novaSenha, 10);
    await this.usuarioRepo.update({ id: registro.usuarioId }, { senhaHash });
    await this.tokenRepo.update({ id: registro.id }, { usadoEm: new Date() });

    return { status: 'ok' };
  }
}
