export interface PautaInput {
  descricao: string;
  encerramento: string; // ISO date-time
}

export class CriarAssembleiaCommand {
  constructor(
    public readonly condominioId: string,
    public readonly titulo: string,
    public readonly dataHora: string,
    public readonly quorumMinimoPct: number,
    public readonly pautas: PautaInput[],
  ) {}
}
