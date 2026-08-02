export class ObterRelatorioFinanceiroQuery {
  constructor(
    public readonly condominioId: string,
    public readonly meses: number = 6,
  ) {}
}
