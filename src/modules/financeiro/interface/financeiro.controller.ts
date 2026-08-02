import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { IsNumber, IsPositive, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { GerarBoletosMesCommand } from '../application/commands/gerar-boletos-mes.command';
import { ConfirmarPagamentoCommand } from '../application/commands/confirmar-pagamento.command';
import { ListarBoletosUnidadeQuery } from '../application/queries/listar-boletos-unidade.query';
import { ObterRelatorioFinanceiroQuery } from '../application/queries/obter-relatorio-financeiro.query';

class GerarBoletosDto {
  @IsString()
  competencia: string;
}

class ConfirmarPagamentoDto {
  @IsNumber()
  @IsPositive()
  valorPago: number;

  @IsString()
  metodo: string;

  @IsString()
  referenciaExterna: string;
}

@ApiTags('financeiro')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class FinanceiroController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('condominios/:condominioId/boletos/gerar')
  @Roles('SINDICO', 'ADMIN_TENANT')
  @ApiOperation({ summary: 'Dispara a geração de boletos do mês (Fluxo 5.1)' })
  async gerarBoletos(
    @Param('condominioId') condominioId: string,
    @Body() dto: GerarBoletosDto,
  ) {
    return this.commandBus.execute(
      new GerarBoletosMesCommand(condominioId, dto.competencia),
    );
  }

  @Post('boletos/:boletoId/pagamentos')
  @ApiOperation({ summary: 'Confirma pagamento de um boleto (idempotente, chamado por webhook)' })
  async confirmarPagamento(
    @Param('boletoId') boletoId: string,
    @Body() dto: ConfirmarPagamentoDto,
  ) {
    await this.commandBus.execute(
      new ConfirmarPagamentoCommand(boletoId, dto.valorPago, dto.metodo, dto.referenciaExterna),
    );
    return { status: 'ok' };
  }

  @Get('unidades/:unidadeId/boletos')
  @ApiOperation({ summary: 'Lista boletos de uma unidade' })
  async listarBoletos(@Param('unidadeId') unidadeId: string) {
    return this.queryBus.execute(new ListarBoletosUnidadeQuery(unidadeId));
  }

  @Get('condominios/:condominioId/relatorios/financeiro')
  @Roles('SINDICO', 'ADMIN_TENANT')
  @ApiOperation({ summary: 'Receita x despesa mensal + inadimplência atual (dashboard gerencial, UC-10)' })
  async relatorioFinanceiro(
    @Param('condominioId') condominioId: string,
    @Query('meses') meses?: string,
  ) {
    return this.queryBus.execute(
      new ObterRelatorioFinanceiroQuery(condominioId, meses ? Number(meses) : 6),
    );
  }
}
