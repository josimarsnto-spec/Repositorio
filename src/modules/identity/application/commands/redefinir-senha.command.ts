export class RedefinirSenhaCommand {
  constructor(
    public readonly token: string,
    public readonly novaSenha: string,
  ) {}
}
