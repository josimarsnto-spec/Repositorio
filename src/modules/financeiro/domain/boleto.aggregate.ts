import { randomUUID } from 'crypto';
import {
  BoletoGeradoEvent,
  DomainEvent,
  MultaJurosAplicadosEvent,
  PagamentoConfirmadoEvent,
} from './events/domain-event';

export type BoletoStatus = 'ABERTO' | 'PAGO' | 'CANCELADO' | 'EM_ATRASO';

// Agregado raiz do contexto Financeiro, modelado com Event Sourcing: o estado
// é sempre derivado da aplicação sequencial de eventos (apply), nunca escrito
// diretamente. Isso dá uma trilha de auditoria financeira nativa e permite
// reconstruir o estado do boleto em qualquer ponto do tempo (requisito de
// conformidade — Documento de Arquitetura, seção 1.2 e LGPD seção 11).
export class BoletoAggregate {
  private _id: string;
  private _condominioId: string;
  private _unidadeId: string;
  private _competencia: string;
  private _valorOriginal = 0;
  private _valorMulta = 0;
  private _valorJuros = 0;
  private _vencimento: string;
  private _status: BoletoStatus = 'ABERTO';
  private _version = 0;

  private readonly uncommittedEvents: DomainEvent[] = [];

  private constructor() {}

  static gerar(
    condominioId: string,
    unidadeId: string,
    competencia: string,
    valorOriginal: number,
    vencimento: string,
  ): BoletoAggregate {
    if (valorOriginal < 0) {
      throw new Error('Valor do boleto não pode ser negativo');
    }
    const boleto = new BoletoAggregate();
    const event = new BoletoGeradoEvent(
      randomUUID(),
      condominioId,
      unidadeId,
      competencia,
      valorOriginal,
      vencimento,
    );
    boleto.raise(event);
    return boleto;
  }

  static fromHistory(events: DomainEvent[]): BoletoAggregate {
    const boleto = new BoletoAggregate();
    for (const event of events) {
      boleto.apply(event, false);
    }
    return boleto;
  }

  aplicarMultaJuros(percentualMulta: number, percentualJurosDia: number, diasAtraso: number): void {
    if (this._status !== 'ABERTO' && this._status !== 'EM_ATRASO') {
      throw new Error('Só é possível aplicar multa/juros em boletos abertos ou em atraso');
    }
    // RN-02: limite legal de multa (2%) e juros calculados por dia de atraso.
    const valorMulta = round2(this._valorOriginal * Math.min(percentualMulta, 0.02));
    const valorJuros = round2(this._valorOriginal * percentualJurosDia * diasAtraso);
    this.raise(new MultaJurosAplicadosEvent(this._id, valorMulta, valorJuros));
  }

  confirmarPagamento(valorPago: number, metodo: string, referenciaExterna: string): void {
    if (this._status === 'PAGO') return; // idempotência: reentrega de webhook não gera erro
    if (this._status === 'CANCELADO') {
      throw new Error('Não é possível pagar um boleto cancelado');
    }
    this.raise(new PagamentoConfirmadoEvent(this._id, valorPago, metodo, referenciaExterna));
  }

  private raise(event: DomainEvent): void {
    this.apply(event, true);
  }

  private apply(event: DomainEvent, isNew: boolean): void {
    switch (event.type) {
      case 'BoletoGerado': {
        const e = event as BoletoGeradoEvent;
        this._id = e.boletoId;
        this._condominioId = e.condominioId;
        this._unidadeId = e.unidadeId;
        this._competencia = e.competencia;
        this._valorOriginal = e.valorOriginal;
        this._vencimento = e.vencimento;
        this._status = 'ABERTO';
        break;
      }
      case 'MultaJurosAplicados': {
        const e = event as MultaJurosAplicadosEvent;
        this._valorMulta = e.valorMulta;
        this._valorJuros = e.valorJuros;
        this._status = 'EM_ATRASO';
        break;
      }
      case 'PagamentoConfirmado': {
        this._status = 'PAGO';
        break;
      }
    }
    this._version += 1;
    if (isNew) this.uncommittedEvents.push(event);
  }

  pullUncommittedEvents(): DomainEvent[] {
    const events = [...this.uncommittedEvents];
    this.uncommittedEvents.length = 0;
    return events;
  }

  get id() { return this._id; }
  get status() { return this._status; }
  get valorTotal() { return round2(this._valorOriginal + this._valorMulta + this._valorJuros); }
  get version() { return this._version; }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
