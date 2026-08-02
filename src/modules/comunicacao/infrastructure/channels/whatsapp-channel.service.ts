import { Injectable, Logger } from '@nestjs/common';
import { Destinatario, EnvioResultado, NotificacaoChannel } from '../../domain/notificacao-channel.interface';

// Adapter stub — mesma interface do EmailChannelService, pronto para plugar
// um provedor real (ex. Meta WhatsApp Cloud API, Twilio) quando contratado.
// Hoje reporta "não configurado" para todo destinatário, sem falhar a
// publicação do comunicado (os demais canais selecionados seguem enviando).
@Injectable()
export class WhatsappChannelService implements NotificacaoChannel {
  readonly codigo = 'WHATSAPP' as const;
  private readonly logger = new Logger(WhatsappChannelService.name);

  async enviar(_titulo: string, _corpo: string, destinatarios: Destinatario[]): Promise<EnvioResultado> {
    this.logger.warn(
      `Canal WHATSAPP ainda não integrado a um provedor (ex. Meta Cloud API). ${destinatarios.length} destinatário(s) não notificado(s) por este canal.`,
    );
    return {
      destinatarios: destinatarios.length,
      enviados: 0,
      falhas: destinatarios.length,
      detalhe: 'Integração com provedor de WhatsApp pendente de contratação',
    };
  }
}
