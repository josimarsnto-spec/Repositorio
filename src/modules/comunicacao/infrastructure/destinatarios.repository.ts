import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Destinatario } from '../domain/notificacao-channel.interface';

// Resolve os usuários alvo de um comunicado a partir do segmento escolhido.
// Consulta direta via DataSource (em vez de repositórios de entidade) porque
// o join atravessa identity.usuarios + condo.vinculos_unidade + condo.unidades
// (+ financeiro.boletos para INADIMPLENTES) — uma projeção de leitura que não
// corresponde a nenhum agregado único do domínio.
@Injectable()
export class DestinatariosRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async resolver(condominioId: string, segmento: string, blocoId?: string): Promise<Destinatario[]> {
    const params: unknown[] = [condominioId];
    let filtroSegmento = '';

    if (segmento === 'BLOCO') {
      if (!blocoId) return [];
      params.push(blocoId);
      filtroSegmento = `AND un.bloco_id = $${params.length}`;
    } else if (segmento === 'INADIMPLENTES') {
      filtroSegmento = `AND EXISTS (
        SELECT 1 FROM financeiro.boletos b
        WHERE b.unidade_id = un.id
          AND b.status IN ('ABERTO', 'EM_ATRASO')
          AND b.vencimento < current_date
      )`;
    }

    const rows: { usuario_id: string; nome: string; email: string; telefone: string | null }[] =
      await this.dataSource.query(
        `SELECT DISTINCT u.id AS usuario_id, u.nome, u.email, u.telefone
         FROM identity.usuarios u
         JOIN condo.vinculos_unidade v ON v.usuario_id = u.id
         JOIN condo.unidades un ON un.id = v.unidade_id
         WHERE un.condominio_id = $1
           AND u.ativo = true
           AND (v.vigencia_fim IS NULL OR v.vigencia_fim >= current_date)
           ${filtroSegmento}`,
        params,
      );

    return rows.map((r) => ({
      usuarioId: r.usuario_id,
      nome: r.nome,
      email: r.email,
      telefone: r.telefone ?? undefined,
    }));
  }
}
