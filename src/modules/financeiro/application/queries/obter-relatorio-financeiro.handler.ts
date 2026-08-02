import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ObterRelatorioFinanceiroQuery } from './obter-relatorio-financeiro.query';

export interface SerieMensal {
  competencia: string; // 'YYYY-MM'
  receita: number;
  despesa: number;
  saldo: number;
}

export interface RelatorioFinanceiro {
  serie: SerieMensal[];
  inadimplencia: {
    boletosVencidos: number;
    valorEmAtraso: number;
  };
}

// Agrega receita (financeiro.pagamentos) x despesa (financeiro.despesas) por
// competência e reaproveita a view financeiro.vw_inadimplencia_por_condominio
// (já existente no schema) para o indicador de inadimplência atual — evita
// duplicar em código uma regra de negócio já modelada no banco (UC-10).
@QueryHandler(ObterRelatorioFinanceiroQuery)
export class ObterRelatorioFinanceiroHandler implements IQueryHandler<ObterRelatorioFinanceiroQuery> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(query: ObterRelatorioFinanceiroQuery): Promise<RelatorioFinanceiro> {
    const meses = Math.max(1, Math.min(query.meses ?? 6, 36));

    const receitaRows: { mes: Date; receita: string }[] = await this.dataSource.query(
      `SELECT date_trunc('month', b.competencia)::date AS mes, sum(p.valor_pago) AS receita
       FROM financeiro.pagamentos p
       JOIN financeiro.boletos b ON b.id = p.boleto_id AND b.competencia = p.boleto_competencia
       WHERE b.condominio_id = $1
         AND b.competencia >= (date_trunc('month', current_date) - ($2 || ' months')::interval)
       GROUP BY 1`,
      [query.condominioId, meses - 1],
    );

    const despesaRows: { mes: Date; despesa: string }[] = await this.dataSource.query(
      `SELECT date_trunc('month', d.competencia)::date AS mes, sum(d.valor) AS despesa
       FROM financeiro.despesas d
       WHERE d.condominio_id = $1
         AND d.competencia >= (date_trunc('month', current_date) - ($2 || ' months')::interval)
       GROUP BY 1`,
      [query.condominioId, meses - 1],
    );

    const [inadimplenciaRow] = await this.dataSource.query(
      `SELECT boletos_vencidos, valor_em_atraso
       FROM financeiro.vw_inadimplencia_por_condominio
       WHERE condominio_id = $1`,
      [query.condominioId],
    );

    const receitaPorMes = new Map<string, number>(receitaRows.map((r) => [this.chave(r.mes), Number(r.receita)]));
    const despesaPorMes = new Map<string, number>(despesaRows.map((r) => [this.chave(r.mes), Number(r.despesa)]));

    const serie: SerieMensal[] = [];
    const hoje = new Date();
    for (let i = meses - 1; i >= 0; i--) {
      const referencia = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const chave = `${referencia.getFullYear()}-${String(referencia.getMonth() + 1).padStart(2, '0')}`;
      const receita = receitaPorMes.get(chave) ?? 0;
      const despesa = despesaPorMes.get(chave) ?? 0;
      serie.push({ competencia: chave, receita, despesa, saldo: receita - despesa });
    }

    return {
      serie,
      inadimplencia: {
        boletosVencidos: Number(inadimplenciaRow?.boletos_vencidos ?? 0),
        valorEmAtraso: Number(inadimplenciaRow?.valor_em_atraso ?? 0),
      },
    };
  }

  private chave(data: Date | string): string {
    const d = new Date(data);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
}
