import { Controller, Get, Module, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// Scaffold: estrutura de módulo pronta (Clean Architecture) seguindo o mesmo
// padrão de Financeiro/Manutenção. Implementação completa do agregado Reserva
// (com a constraint EXCLUDE USING gist do banco garantindo não-sobreposição —
// ver condosphere_schema.sql, schema reservas) fica para a próxima iteração:
// CriarReservaCommand/Handler + ListarReservasQuery/Handler + ReservaEntity.
@ApiTags('reservas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservas')
class ReservasController {
  @Post()
  @ApiOperation({ summary: '[scaffold] Cria solicitação de reserva de área comum (UC referente)' })
  criar() {
    return { status: 'not_implemented', hint: 'Ver CriarReservaCommand no README' };
  }

  @Get()
  @ApiOperation({ summary: '[scaffold] Lista reservas da unidade autenticada' })
  listar() {
    return [];
  }
}

@Module({
  imports: [CqrsModule],
  controllers: [ReservasController],
})
export class ReservasModule {}
