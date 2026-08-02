export class RegistrarVotoCommand {
  constructor(
    public readonly pautaId: string,
    public readonly unidadeId: string,
    public readonly opcao: 'APROVAR' | 'REPROVAR' | 'ABSTER',
    public readonly registradoPor: string,
  ) {}
}
