// Contrato base de todo evento de domínio do agregado Boleto (Event Sourcing).
export interface DomainEvent {
  readonly type: string;
  readonly occurredAt: Date;
}

export class BoletoGeradoEvent implements DomainEvent {
  readonly type = 'BoletoGerado';
  readonly occurredAt = new Date();
  constructor(
    public readonly boletoId: string,
    public readonly condominioId: string,
    public readonly unidadeId: string,
    public readonly competencia: string,
    public readonly valorOriginal: number,
    public readonly vencimento: string,
  ) {}
}

export class MultaJurosAplicadosEvent implements DomainEvent {
  readonly type = 'MultaJurosAplicados';
  readonly occurredAt = new Date();
  constructor(
    public readonly boletoId: string,
    public readonly valorMulta: number,
    public readonly valorJuros: number,
  ) {}
}

export class PagamentoConfirmadoEvent implements DomainEvent {
  readonly type = 'PagamentoConfirmado';
  readonly occurredAt = new Date();
  constructor(
    public readonly boletoId: string,
    public readonly valorPago: number,
    public readonly metodo: string,
    public readonly referenciaExterna: string,
  ) {}
}
