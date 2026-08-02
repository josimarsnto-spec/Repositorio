import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CadastrarCondominioCommand } from '../application/commands/cadastrar-condominio.command';
import { ListarCondominiosQuery } from '../application/queries/listar-condominios.query';

class CadastrarCondominioDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsObject()
  endereco: Record<string, unknown>;
}

@ApiTags('condominios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('condominios')
export class CondominiosController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @Roles('ADMIN_TENANT')
  @ApiOperation({ summary: 'Cadastra um novo condomínio (onboarding — UC-11)' })
  async cadastrar(@Body() dto: CadastrarCondominioDto, @CurrentUser() user: AuthenticatedUser) {
    return this.commandBus.execute(
      new CadastrarCondominioCommand(user.tenantId, dto.nome, dto.endereco, user.sub),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lista condomínios do tenant autenticado' })
  async listar(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new ListarCondominiosQuery(user.tenantId));
  }
}
