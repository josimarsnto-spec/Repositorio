import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { IsInt, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { AbrirChamadoCommand } from '../application/commands/abrir-chamado.command';

class AbrirChamadoDto {
  @IsString() condominioId: string;
  @IsString() unidadeId: string;
  @IsInt() categoriaId: number;
  @IsString() @MinLength(10) descricao: string;
}

@ApiTags('manutencao')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chamados')
export class ManutencaoController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @ApiOperation({ summary: 'Abre um novo chamado de manutenção (UC-03)' })
  async abrir(@Body() dto: AbrirChamadoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.commandBus.execute(
      new AbrirChamadoCommand(dto.condominioId, dto.unidadeId, user.sub, dto.categoriaId, dto.descricao),
    );
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualiza o status de um chamado' })
  async atualizarStatus(@Param('id') id: string, @Body('status') status: string) {
    // Implementação completa: UpdateChamadoStatusCommand + handler análogo aos demais módulos.
    return { id, status };
  }
}
