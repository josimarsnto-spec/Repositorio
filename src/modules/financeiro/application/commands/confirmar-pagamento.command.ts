export class ConfirmarPagamentoCommand {
  constructor(
    public readonly boletoId: string,
    public readonly valorPago: number,
    public readonly metodo: string,
    public readonly referenciaExterna: string,
  ) {}
}
