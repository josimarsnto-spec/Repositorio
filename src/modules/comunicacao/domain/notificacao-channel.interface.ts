export interface Destinatario {
  usuarioId: string;
  nome: string;
  email: string;
  telefone?: string;
}

export interface EnvioResultado {
  destinatarios: number;
  enviados: number;
  falhas: number;
  detalhe?: string;
}

// Porta (Clean Architecture) para um canal de disparo de comunicado.
// Cada implementação concreta fica em infrastructure/channels — o restante
// da aplicação (handler, controller) não sabe se o envio é por SMTP,
// WhatsApp Cloud API ou um provedor de SMS.
export interface NotificacaoChannel {
  readonly codigo: 'EMAIL' | 'WHATSAPP' | 'SMS';
  enviar(titulo: string, corpo: string, destinatarios: Destinatario[]): Promise<EnvioResultado>;
}

export const NOTIFICACAO_CHANNELS = 'NOTIFICACAO_CHANNELS';
