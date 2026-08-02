import { Injectable } from '@nestjs/common';
import { Destinatario, EnvioResultado, NotificacaoChannel } from '../domain/notificacao-channel.interface';
import { EmailChannelService } from './channels/email-channel.service';
import { WhatsappChannelService } from './channels/whatsapp-channel.service';
import { SmsChannelService } from './channels/sms-channel.service';

// Orquestra o disparo multi-canal: cada canal listado em `canais` é
// executado independentemente (falha em um não impede os demais), e o
// resultado por canal é devolvido para persistência em resultado_envio.
@Injectable()
export class NotificationDispatcherService {
  private readonly channels: Record<string, NotificacaoChannel>;

  constructor(
    email: EmailChannelService,
    whatsapp: WhatsappChannelService,
    sms: SmsChannelService,
  ) {
    this.channels = { EMAIL: email, WHATSAPP: whatsapp, SMS: sms };
  }

  async disparar(
    canais: string[],
    titulo: string,
    corpo: string,
    destinatarios: Destinatario[],
  ): Promise<Record<string, EnvioResultado>> {
    const resultado: Record<string, EnvioResultado> = {};

    await Promise.all(
      canais.map(async (codigo) => {
        const channel = this.channels[codigo];
        if (!channel) {
          resultado[codigo] = { destinatarios: destinatarios.length, enviados: 0, falhas: destinatarios.length, detalhe: 'Canal desconhecido' };
          return;
        }
        resultado[codigo] = await channel.enviar(titulo, corpo, destinatarios);
      }),
    );

    return resultado;
  }
}
