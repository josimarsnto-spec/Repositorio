import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Destinatario, EnvioResultado, NotificacaoChannel } from '../../domain/notificacao-channel.interface';

// Canal real via SMTP (nodemailer). Configurado por env vars
// (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM). Se não
// configurado, degrada com segurança: registra aviso e reporta falha por
// destinatário em vez de derrubar a aplicação — comum em ambientes de
// desenvolvimento/homologação sem provedor de e-mail contratado ainda.
@Injectable()
export class EmailChannelService implements NotificacaoChannel {
  readonly codigo = 'EMAIL' as const;
  private readonly logger = new Logger(EmailChannelService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('smtp.host');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('smtp.port') ?? 587,
        secure: this.config.get<boolean>('smtp.secure') ?? false,
        auth: this.config.get<string>('smtp.user')
          ? { user: this.config.get<string>('smtp.user') as string, pass: this.config.get<string>('smtp.pass') as string }
          : undefined,
      });
    } else {
      this.logger.warn('SMTP_HOST não configurado — canal EMAIL rodará em modo degradado (sem envio real).');
    }
  }

  async enviar(titulo: string, corpo: string, destinatarios: Destinatario[]): Promise<EnvioResultado> {
    if (!this.transporter) {
      return {
        destinatarios: destinatarios.length,
        enviados: 0,
        falhas: destinatarios.length,
        detalhe: 'SMTP não configurado (smtp.host ausente)',
      };
    }

    const from = this.config.get<string>('smtp.from') ?? 'no-reply@condosphere.app';
    let enviados = 0;
    let falhas = 0;

    for (const destinatario of destinatarios) {
      try {
        await this.transporter.sendMail({
          from,
          to: destinatario.email,
          subject: titulo,
          text: corpo,
        });
        enviados += 1;
      } catch (err) {
        falhas += 1;
        this.logger.error(`Falha ao enviar e-mail para ${destinatario.email}: ${(err as Error).message}`);
      }
    }

    return { destinatarios: destinatarios.length, enviados, falhas };
  }
}
