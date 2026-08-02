import { Controller, Module, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('portaria')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('portaria/visitantes')
class PortariaController {
  @Post()
  @ApiOperation({ summary: '[scaffold] Registra visitante na portaria (UC-08)' })
  registrar() {
    return { status: 'not_implemented' };
  }
}

@Module({
  imports: [CqrsModule],
  controllers: [PortariaController],
})
export class PortariaModule {}
