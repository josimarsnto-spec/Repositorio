import { ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { RegistrarClienteCommand } from './registrar-cliente.command';
import { TenantEntity } from '../../domain/tenant.entity';
import { UsuarioEntity } from '../../domain/usuario.entity';
import { LoginResult } from './login.handler';

// Cadastro público de um novo cliente (UC onboarding self-service, análogo ao
// "Teste Grátis" do mercado de referência): cria o tenant (a administradora
// ou síndico autônomo) e o usuário responsável com papel ADMIN_TENANT, e já
// devolve tokens JWT (auto-login) para cair direto no painel — sem exigir
// um segundo passo de login manual logo após o cadastro.
@CommandHandler(RegistrarClienteCommand)
export class RegistrarClienteHandler implements ICommandHandler<RegistrarClienteCommand> {
  constructor(
    @InjectRepository(TenantEntity) private readonly tenantRepo: Repository<TenantEntity>,
    @InjectRepository(UsuarioEntity) private readonly usuarioRepo: Repository<UsuarioEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async execute(command: RegistrarClienteCommand): Promise<LoginResult> {
    const emailExistente = await this.usuarioRepo.findOne({ where: { email: command.email } });
    if (emailExistente) {
      throw new ConflictException('Já existe uma conta com este e-mail');
    }

    const cnpjExistente = await this.tenantRepo.findOne({ where: { cnpj: command.cnpj } });
    if (cnpjExistente) {
      throw new ConflictException('Já existe um cadastro com este CNPJ');
    }

    const agora = new Date();
    let tenant: TenantEntity;
    let usuario: UsuarioEntity;

    try {
      tenant = await this.tenantRepo.save(
        this.tenantRepo.create({
          razaoSocial: command.razaoSocial,
          cnpj: command.cnpj,
          plano: 'trial',
          ativo: true,
          criadoEm: agora,
          atualizadoEm: agora,
        }),
      );

      const senhaHash = await bcrypt.hash(command.senha, 10);
      usuario = await this.usuarioRepo.save(
        this.usuarioRepo.create({
          tenantId: tenant.id,
          nome: command.nomeResponsavel,
          email: command.email,
          senhaHash,
          mfaHabilitado: false,
          ativo: true,
        }),
      );
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException('E-mail ou CNPJ já cadastrado');
      }
      throw err;
    }

    // Cria um condomínio padrão para o tenant recém-criado e já vincula o
    // usuário ao papel ADMIN_TENANT (papel_id = 5) nesse condomínio — mesmo
    // padrão usado em CadastrarCondominioHandler. Sem isso, o frontend não
    // tinha nenhum condominioId real para usar (e endpoints como
    // /condominios/:id/relatorios/financeiro exigem um uuid válido).
    const [{ id: condominioId }] = await this.usuarioRepo.query(
      `INSERT INTO condo.condominios (tenant_id, nome, endereco, ativo)
       VALUES ($1, $2, $3::jsonb, true)
       RETURNING id`,
      [tenant.id, tenant.razaoSocial, '{}'],
    );

    await this.usuarioRepo.query(
      `INSERT INTO identity.usuarios_papeis (usuario_id, condominio_id, papel_id)
       VALUES ($1, $2, 5)
       ON CONFLICT (usuario_id, condominio_id, papel_id) DO NOTHING`,
      [usuario.id, condominioId],
    );

    const payload = { sub: usuario.id, tenantId: tenant.id, papeis: ['ADMIN_TENANT'] };

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}
