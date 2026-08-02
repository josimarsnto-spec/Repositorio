import { randomUUID } from 'crypto';

// Envelope padronizado de evento de domínio (CloudEvents-like), conforme
// Documento de Arquitetura Técnica, seção 7.3 — usado por todo publisher/consumer.
export interface CloudEventEnvelope<T = unknown> {
  id: string;
  type: string; // ex. 'condosphere.financeiro.BoletoGerado'
  source: string; // ex. 'condosphere/financeiro'
  time: string;
  tenantId: string;
  data: T;
}

export function buildCloudEvent<T>(
  type: string,
  source: string,
  tenantId: string,
  data: T,
): CloudEventEnvelope<T> {
  return {
    id: randomUUID(),
    type,
    source,
    time: new Date().toISOString(),
    tenantId,
    data,
  };
}
