export class CadastrarCondominioCommand {
  constructor(
    public readonly tenantId: string,
    public readonly nome: string,
    public readonly endereco: Record<string, unknown>,
  ) {}
}
