import { Controller, Module, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('documentos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documentos')
class DocumentosController {
  @Post()
  @ApiOperation({ summary: '[scaffold] Cria nova versão de documento (documentos.documento_versoes)' })
  criarVersao() {
    return { status: 'not_implemented' };
  }
}

@Module({
  imports: [CqrsModule],
  controllers: [DocumentosController],
})
export class DocumentosModule {}
