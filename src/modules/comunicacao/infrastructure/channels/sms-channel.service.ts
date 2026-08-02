import { Injectable, Logger } from '@nestjs/common';
import { Destinatario, EnvioResultado, NotificacaoChannel } from '../../domain/notificacao-channel.interface';

// Adapter stub análogo ao WhatsappChannelService — pronto para plugar um
// gateway de SMS real (ex. Twilio, Zenvia) quando contratado.
@Injectable()
export class SmsChannelService implements NotificacaoChannel {
  readonly codigo = 'SMS' as const;
  private readonly logger = new Logger(SmsChannelService.name);

  async enviar(_titulo: string, _corpo: string, destinatarios: Destinatario[]): Promise<EnvioResultado> {
    this.logger.warn(
      `Canal SMS ainda não integrado a um gateway. ${destinatarios.length} destinatário(s) não notificado(s) por este canal.`,
    );
    return {
      destinatarios: destinatarios.length,
      enviados: 0,
      falhas: destinatarios.length,
      detalhe: 'Integração com gateway de SMS pendente de contratação',
    };
  }
}
