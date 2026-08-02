export class AbrirChamadoCommand {
  constructor(
    public readonly condominioId: string,
    public readonly unidadeId: string,
    public readonly abertoPor: string,
    public readonly categoriaId: number,
    public readonly descricao: string,
  ) {}
}
