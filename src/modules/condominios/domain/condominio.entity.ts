import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Mapeia condo.condominios. RLS garante isolamento por tenant_id no banco;
// aqui a entidade é um simples mapeamento de persistência (Clean Architecture:
// esta classe pertence à camada de Infrastructure, mas fica em domain/ por
// simplicidade neste módulo CRUD-like — ver financeiro/domain para um agregado
// event-sourced "puro", sem acoplamento ao TypeORM).
@Entity({ name: 'condominios', schema: 'condo' })
export class CondominioEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column()
  nome: string;

  @Column({ type: 'jsonb' })
  endereco: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  regimento?: Record<string, unknown>;

  @Column({ default: true })
  ativo: boolean;
}
