import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CriarAssembleiaCommand } from '../application/commands/criar-assembleia.command';
import { RegistrarVotoCommand } from '../application/commands/registrar-voto.command';
import { ListarAssembleiasQuery } from '../application/queries/listar-assembleias.query';
import { ObterQuorumPautaQuery } from '../application/queries/obter-quorum-pauta.query';

class PautaDto {
  @IsString() @IsNotEmpty() descricao: string;
  @IsISO8601() encerramento: string;
}

class CriarAssembleiaDto {
  @IsString() @IsNotEmpty() titulo: string;
  @IsISO8601() dataHora: string;

  @IsOptional() @IsNumber() @Min(0) quorumMinimoPct?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PautaDto)
  pautas: PautaDto[];
}

class RegistrarVotoDto {
  @IsString() @IsNotEmpty() unidadeId: string;
  @IsIn(['APROVAR', 'REPROVAR', 'ABSTER']) opcao: 'APROVAR' | 'REPROVAR' | 'ABSTER';
}

@ApiTags('assembleias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AssembleiasController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('condominios/:condominioId/assembleias')
  @Roles('SINDICO', 'ADMIN_TENANT')
  @ApiOperation({ summary: 'Cria uma assembleia com uma ou mais pautas (US-05)' })
  async criar(@Param('condominioId') condominioId: string, @Body() dto: CriarAssembleiaDto) {
    return this.commandBus.execute(
      new CriarAssembleiaCommand(condominioId, dto.titulo, dto.dataHora, dto.quorumMinimoPct ?? 50, dto.pautas),
    );
  }

  @Get('condominios/:condominioId/assembleias')
  @ApiOperation({ summary: 'Lista assembleias (com pautas) do condomínio' })
  async listar(@Param('condominioId') condominioId: string) {
    return this.queryBus.execute(new ListarAssembleiasQuery(condominioId));
  }

  @Post('assembleias/pautas/:pautaId/votos')
  @ApiOperation({ summary: 'Registra o voto de uma unidade em uma pauta (idempotente — RN-03)' })
  async votar(
    @Param('pautaId') pautaId: string,
    @Body() dto: RegistrarVotoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.commandBus.execute(
      new RegistrarVotoCommand(pautaId, dto.unidadeId, dto.opcao, user.sub),
    );
  }

  @Get('assembleias/pautas/:pautaId/quorum')
  @ApiOperation({ summary: 'Quórum em tempo real de uma pauta (consumido via polling pela UI de votação)' })
  async quorum(@Param('pautaId') pautaId: string) {
    return this.queryBus.execute(new ObterQuorumPautaQuery(pautaId));
  }
}
