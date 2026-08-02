import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ObterQuorumPautaQuery } from './obter-quorum-pauta.query';

export interface QuorumPautaResult {
  pautaId: string;
  votosComputados: number;
  totalUnidades: number;
  percentualQuorum: number | null;
  porOpcao: { APROVAR: number; REPROVAR: number; ABSTER: number };
}

// Lê diretamente da view assembleia.vw_quorum_pauta (projeção já pronta no
// banco — ver condosphere_schema.sql) em vez de recalcular em memória: a
// contagem de quórum é usada pela UI de votação em tempo real (US-05) e
// deve refletir exatamente a mesma regra usada para decidir aprovação/reprovação.
@QueryHandler(ObterQuorumPautaQuery)
export class ObterQuorumPautaHandler implements IQueryHandler<ObterQuorumPautaQuery> {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async execute(query: ObterQuorumPautaQuery): Promise<QuorumPautaResult> {
    const [quorumRow] = await this.dataSource.query(
      `SELECT pauta_id, votos_computados, total_unidades, percentual_quorum
       FROM assembleia.vw_quorum_pauta WHERE pauta_id = $1`,
      [query.pautaId],
    );

    const porOpcaoRows: { opcao: string; total: string }[] = await this.dataSource.query(
      `SELECT opcao, count(*) AS total FROM assembleia.votos WHERE pauta_id = $1 GROUP BY opcao`,
      [query.pautaId],
    );

    const porOpcao = { APROVAR: 0, REPROVAR: 0, ABSTER: 0 };
    for (const row of porOpcaoRows) {
      if (row.opcao in porOpcao) porOpcao[row.opcao as keyof typeof porOpcao] = Number(row.total);
    }

    return {
      pautaId: query.pautaId,
      votosComputados: Number(quorumRow?.votos_computados ?? 0),
      totalUnidades: Number(quorumRow?.total_unidades ?? 0),
      percentualQuorum: quorumRow?.percentual_quorum !== null && quorumRow?.percentual_quorum !== undefined
        ? Number(quorumRow.percentual_quorum)
        : null,
      porOpcao,
    };
  }
}
