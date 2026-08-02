export class RegistrarClienteCommand {
  constructor(
    public readonly razaoSocial: string,
    public readonly cnpj: string,
    public readonly nomeResponsavel: string,
    public readonly email: string,
    public readonly senha: string,
  ) {}
}
