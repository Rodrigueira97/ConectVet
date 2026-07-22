import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { PagamentosService } from './pagamentos.service';
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

  @Roles(Role.CLINICA, Role.ADMIN)
  @Patch(':id/liberar')
  liberar(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.pagamentosService.liberar(user, id);
  }
}
