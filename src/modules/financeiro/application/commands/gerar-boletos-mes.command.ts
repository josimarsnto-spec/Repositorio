export class GerarBoletosMesCommand {
  constructor(
    public readonly condominioId: string,
    public readonly competencia: string, // 'YYYY-MM-01'
  ) {}
}
