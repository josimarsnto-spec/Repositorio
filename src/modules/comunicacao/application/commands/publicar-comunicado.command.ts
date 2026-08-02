export class PublicarComunicadoCommand {
  constructor(
    public readonly condominioId: string,
    public readonly titulo: string,
    public readonly corpo: string,
    public readonly segmento: string,
    public readonly canais: string[],
    public readonly publicadoPor: string,
    public readonly blocoId?: string,
  ) {}
}
