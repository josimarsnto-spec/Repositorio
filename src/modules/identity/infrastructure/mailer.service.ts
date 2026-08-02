import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// Mailer dedicado ao módulo Identity (e-mails transacionais de conta: reset
// de senha, boas-vindas). Deliberadamente não reaproveita o
// EmailChannelService do módulo Comunicação — cada bounded context mantém
// sua própria infraestrutura (Clean Architecture: nada de acoplamento entre
// módulos por conveniência). Mesma configuração via env (SMTP_*) e mesma
// degradação segura quando SMTP não está configurado.
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: this.config.get<string>('SMTP_USER')
          ? { user: this.config.get<string>('SMTP_USER'), pass: this.config.get<string>('SMTP_PASS') }
          : undefined,
      });
    } else {
      this.logger.warn('SMTP_HOST não configurado — e-mails transacionais serão apenas logados (modo degradado).');
    }
  }

  async enviar(destinatario: string, assunto: string, corpo: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[modo degradado] E-mail para ${destinatario} — ${assunto}: ${corpo}`);
      return;
    }

    const from = this.config.get<string>('SMTP_FROM') ?? 'no-reply@condosphere.app';
    try {
      await this.transporter.sendMail({ from, to: destinatario, subject: assunto, text: corpo });
    } catch (err) {
      this.logger.error(`Falha ao enviar e-mail para ${destinatario}: ${(err as Error).message}`);
    }
  }
}
