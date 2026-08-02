import { randomBytes, createHash } from 'crypto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { SolicitarRedefinicaoSenhaCommand } from './solicitar-redefinicao-senha.command';
import { UsuarioEntity } from '../../domain/usuario.entity';
import { PasswordResetTokenEntity } from '../../domain/password-reset-token.entity';
import { MailerService } from '../../infrastructure/mailer.service';

const VALIDADE_HORAS = 1;

// Sempre responde com sucesso genérico (o controller nem repassa o retorno
// diferenciado) — não revelamos se o e-mail existe ou não na base, para
// evitar enumeração de contas (OWASP). O token bruto só existe em memória e
// no e-mail enviado; o banco guarda apenas o hash sha256 dele.
@CommandHandler(SolicitarRedefinicaoSenhaCommand)
export class SolicitarRedefinicaoSenhaHandler implements ICommandHandler<SolicitarRedefinicaoSenhaCommand> {
  constructor(
    @InjectRepository(UsuarioEntity) private readonly usuarioRepo: Repository<UsuarioEntity>,
    @InjectRepository(PasswordResetTokenEntity) private readonly tokenRepo: Repository<PasswordResetTokenEntity>,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  async execute(command: SolicitarRedefinicaoSenhaCommand): Promise<{ status: 'ok' }> {
    const usuario = await this.usuarioRepo.findOne({ where: { email: command.email, ativo: true } });
    if (!usuario) {
      return { status: 'ok' };
    }

    const tokenBruto = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(tokenBruto).digest('hex');
    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + VALIDADE_HORAS * 60 * 60 * 1000);

    await this.tokenRepo.save(
      this.tokenRepo.create({ usuarioId: usuario.id, tokenHash, expiraEm, criadoEm: agora }),
    );

    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3001';
    const link = `${frontendUrl}/redefinir-senha?token=${tokenBruto}`;

    await this.mailer.enviar(
      usuario.email,
      'Redefinição de senha — CondoSphere',
      `Olá, ${usuario.nome}.\n\nRecebemos uma solicitação para redefinir sua senha. Acesse o link abaixo (válido por ${VALIDADE_HORAS} hora) para criar uma nova senha:\n\n${link}\n\nSe você não solicitou isso, ignore este e-mail.`,
    );

    return { status: 'ok' };
  }
}
