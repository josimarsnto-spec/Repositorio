import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Mapeia manutencao.chamados. Módulo estruturado no mesmo padrão de camadas dos
// demais (domain/application/infrastructure/interface), porém com CRUD simples
// em vez de Event Sourcing — o histórico de status já é coberto por
// manutencao.chamado_eventos (timeline), sem necessidade de reconstrução de estado.
@Entity({ name: 'chamados', schema: 'manutencao' })
export class ChamadoEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'condominio_id' })
  condominioId: string;

  @Column({ name: 'unidade_id', nullable: true })
  unidadeId?: string;

  @Column({ name: 'aberto_por' })
  abertoPor: string;

  @Column({ name: 'categoria_id' })
  categoriaId: number;

  @Column()
  descricao: string;

  @Column({ default: 'ABERTO' })
  status: string;

  @Column({ default: 'NORMAL' })
  prioridade: string;
}
