import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CadastrarCondominioCommand } from './cadastrar-condominio.command';
import { CondominioEntity } from '../../domain/condominio.entity';

@CommandHandler(CadastrarCondominioCommand)
export class CadastrarCondominioHandler
  implements ICommandHandler<CadastrarCondominioCommand>
{
  constructor(
    @InjectRepository(CondominioEntity)
    private readonly repo: Repository<CondominioEntity>,
  ) {}

  async execute(command: CadastrarCondominioCommand): Promise<CondominioEntity> {
    const condominio = this.repo.create({
      tenantId: command.tenantId,
      nome: command.nome,
      endereco: command.endereco,
      ativo: true,
    });
    const salvo = await this.repo.save(condominio);

    // Vincula o usuário ao papel ADMIN_TENANT (papel_id = 5) para este novo condomínio
    await this.repo.query(
      `INSERT INTO identity.usuarios_papeis (usuario_id, condominio_id, papel_id)
       VALUES ($1, $2, 5)
       ON CONFLICT (usuario_id, condominio_id, papel_id) DO NOTHING`,
      [command.usuarioId, salvo.id],
    );

    return salvo;
  }
}
