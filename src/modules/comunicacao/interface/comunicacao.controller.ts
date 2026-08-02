import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ArrayMinSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { PublicarComunicadoCommand } from '../application/commands/publicar-comunicado.command';
import { ListarComunicadosQuery } from '../application/queries/listar-comunicados.query';

class PublicarComunicadoDto {
  @IsString() @IsNotEmpty() titulo: string;
  @IsString() @IsNotEmpty() corpo: string;

  @IsIn(['TODOS', 'BLOCO', 'INADIMPLENTES'])
  segmento: string;

  @IsOptional() @IsString() blocoId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(['EMAIL', 'WHATSAPP', 'SMS'], { each: true })
  canais: string[];
}

@ApiTags('comunicacao')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('condominios/:condominioId/comunicados')
export class ComunicacaoController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @Roles('SINDICO', 'ADMIN_TENANT')
  @ApiOperation({ summary: 'Publica e dispara um comunicado multi-canal (UC-07)' })
  async publicar(
    @Param('condominioId') condominioId: string,
    @Body() dto: PublicarComunicadoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commandBus.execute(
      new PublicarComunicadoCommand(condominioId, dto.titulo, dto.corpo, dto.segmento, dto.canais, user.sub, dto.blocoId),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lista comunicados publicados, mais recentes primeiro' })
  async listar(@Param('condominioId') condominioId: string) {
    return this.queryBus.execute(new ListarComunicadosQuery(condominioId));
  }
}
