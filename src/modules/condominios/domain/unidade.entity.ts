import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Mapeia condo.unidades. fracaoIdeal é a base do rateio financeiro (RN-01),
// consumida pelo módulo Financeiro (GerarBoletosMesHandler) por composição
// entre bounded contexts via leitura direta do read model — não há chamada
// de domínio cruzando módulos (Clean Architecture: dependência via dado, não via lógica).
@Entity({ name: 'unidades', schema: 'condo' })
export class UnidadeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'condominio_id' })
  condominioId: string;

  @Column({ name: 'identificacao' })
  identificacao: string;

  @Column({ name: 'fracao_ideal', type: 'numeric' })
  fracaoIdeal: number;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId?: string;
}
