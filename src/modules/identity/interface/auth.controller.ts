import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';
import { LoginCommand } from '../application/commands/login.command';
import { RegistrarClienteCommand } from '../application/commands/registrar-cliente.command';
import { SolicitarRedefinicaoSenhaCommand } from '../application/commands/solicitar-redefinicao-senha.command';
import { RedefinirSenhaCommand } from '../application/commands/redefinir-senha.command';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  senha: string;
}

class RegistrarClienteDto {
  @IsString()
  @MinLength(3)
  razaoSocial: string;

  @Matches(/^\d{14}$/, { message: 'cnpj deve conter 14 dígitos numéricos' })
  cnpj: string;

  @IsString()
  @MinLength(3)
  nomeResponsavel: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  senha: string;
}

class EsqueciSenhaDto {
  @IsEmail()
  email: string;
}

class RedefinirSenhaDto {
  @IsString()
  @Length(64, 64)
  token: string;

  @IsString()
  @MinLength(8)
  novaSenha: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Autentica um usuário e retorna access/refresh tokens JWT' })
  async login(@Body() dto: LoginDto) {
    return this.commandBus.execute(new LoginCommand(dto.email, dto.senha));
  }

  @Post('registrar')
  @HttpCode(201)
  @ApiOperation({ summary: 'Cadastro público de um novo cliente (tenant + usuário ADMIN_TENANT), com auto-login' })
  async registrar(@Body() dto: RegistrarClienteDto) {
    return this.commandBus.execute(
      new RegistrarClienteCommand(dto.razaoSocial, dto.cnpj, dto.nomeResponsavel, dto.email, dto.senha),
    );
  }

  @Post('esqueci-senha')
  @HttpCode(200)
  @ApiOperation({ summary: 'Solicita redefinição de senha (envia e-mail com link de redefinição, se a conta existir)' })
  async esqueciSenha(@Body() dto: EsqueciSenhaDto) {
    return this.commandBus.execute(new SolicitarRedefinicaoSenhaCommand(dto.email));
  }

  @Post('redefinir-senha')
  @HttpCode(200)
  @ApiOperation({ summary: 'Redefine a senha a partir do token recebido por e-mail' })
  async redefinirSenha(@Body() dto: RedefinirSenhaDto) {
    return this.commandBus.execute(new RedefinirSenhaCommand(dto.token, dto.novaSenha));
  }
}
