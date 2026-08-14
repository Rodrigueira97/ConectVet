import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { PagamentosService } from './pagamentos.service';
import { CobrarPagamentoDto } from './dto/cobrar-pagamento.dto';
import { SimularPagamentoDto } from './dto/simular-pagamento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../auth/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pagamentos')
export class PagamentosController {
  constructor(private pagamentosService: PagamentosService) {}

  @Roles(Role.ADMIN)
  @Get()
  listarTodos() {
    return this.pagamentosService.listarTodos();
  }

  @Roles(Role.CLINICA)
  @Patch(':id/cobrar')
  cobrar(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CobrarPagamentoDto,
  ) {
    return this.pagamentosService.cobrar(user, id, dto);
  }

  @Roles(Role.CLINICA)
  @Patch(':id/simular')
  simular(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SimularPagamentoDto,
  ) {
    return this.pagamentosService.simular(user, id, dto);
  }

  @Roles(Role.CLINICA)
  @Patch(':id/nao-compareceu')
  naoCompareceu(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pagamentosService.naoCompareceu(user, id);
  }

  @Roles(Role.CLINICA, Role.ADMIN)
  @Patch(':id/liberar')
  liberar(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pagamentosService.liberar(user, id);
  }
}
