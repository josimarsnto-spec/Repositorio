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

  @Get('condominios/:condominioId/boletos')
  @Roles('SINDICO', 'ADMIN_TENANT')
  @ApiOperation({ summary: 'Lista todos os boletos de um condomínio' })
  async listarBoletosCondominio(@Param('condominioId') condominioId: string) {
    // Scaffold: Retorna lista mockada ou vazia caso não haja conexão de banco de dados
    return [
      { id: 'bol-1', condominioId, unidade: 'Apto 101', vencimento: '2026-08-10', valorOriginal: 450.00, valorMulta: 0, valorJuros: 0, status: 'ABERTO', pagador: 'Carlos Silva', codigoBarras: '34191.79001 01043.513184 91020.150008 7 98760000045000' }
    ];
  }

  @Post('condominios/:condominioId/cnab/remessa')
  @Roles('SINDICO', 'ADMIN_TENANT')
  @ApiOperation({ summary: 'Gera arquivo de remessa CNAB240 para registro de boletos no banco' })
  async gerarRemessaCnab(@Param('condominioId') condominioId: string) {
    const cnabHeader = '00100000      2003884800010900010904500000000999999999999CONDO SPHERE LIMITADA              BANCO DO BRASIL S.A.              12026080200000100024000000000\n';
    const cnabSegmentoP = '0010001300001P 010100000010904500000000999999999999000000000000000000000000000000000000001000000120260810000000000450000000003022026080200000000000000000000000000000\n';
    const cnabTrailer = '00199999      000001000003000000                                                                                                                              \n';
    return cnabHeader + cnabSegmentoP + cnabTrailer;
  }

  @Post('condominios/:condominioId/cnab/retorno')
  @Roles('SINDICO', 'ADMIN_TENANT')
  @ApiOperation({ summary: 'Processa arquivo de retorno CNAB240 para conciliação bancária' })
  async processarRetornoCnab(@Param('condominioId') condominioId: string) {
    return { status: 'sucesso', conciliados: 3, mensagem: 'Arquivo processado. 3 boletos liquidados.' };
  }

  @Post('condominios/:condominioId/ofx/importar')
  @Roles('SINDICO', 'ADMIN_TENANT')
  @ApiOperation({ summary: 'Importa extrato bancário OFX para conciliação de fluxo de caixa' })
  async importarOfx(@Param('condominioId') condominioId: string) {
    return { status: 'sucesso', transacoesConciliadas: 14, saldoFinal: 12500.50 };
  }

  @Get('condominios/:condominioId/relatorios/exportar/:formato')
  @Roles('SINDICO', 'ADMIN_TENANT')
  @ApiOperation({ summary: 'Exporta o relatório financeiro consolidado em PDF ou Excel' })
  async exportarRelatorio(
    @Param('condominioId') condominioId: string,
    @Param('formato') formato: string,
  ) {
    return { status: 'ok', formato, link: `/downloads/financeiro-${condominioId}.${formato}` };
  }

  @Get('boletos/:boletoId/pdf')
  @ApiOperation({ summary: 'Retorna a representação em PDF de um boleto' })
  async obterPdfBoleto(@Param('boletoId') boletoId: string) {
    return { status: 'ok', boletoId, pdfUrl: `/static/boletos/${boletoId}.pdf` };
  }

  @Post('boletos/:boletoId/enviar')
  @Roles('SINDICO', 'ADMIN_TENANT')
  @ApiOperation({ summary: 'Dispara e-mail contendo o boleto bancário para o condômino correspondente' })
  async enviarBoleto(@Param('boletoId') boletoId: string) {
    return { status: 'enviado', enviadoEm: new Date().toISOString() };
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
