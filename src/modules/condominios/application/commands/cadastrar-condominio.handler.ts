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
    return this.repo.save(condominio);
  }
}
