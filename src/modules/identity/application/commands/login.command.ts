export class LoginCommand {
  constructor(
    public readonly email: string,
    public readonly senha: string,
  ) {}
}
