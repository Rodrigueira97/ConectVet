import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ClinicasService } from './clinicas.service';
import { UpdateClinicaDto } from './dto/update-clinica.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../auth/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/enums';

@Controller('clinicas')
export class ClinicasController {
  constructor(private clinicasService: ClinicasService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLINICA)
  @Get('me')
  meuPerfil(@CurrentUser() user: AuthUser) {
    return this.clinicasService.buscarPorUserId(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLINICA)
  @Patch('me')
  atualizarMeuPerfil(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateClinicaDto,
  ) {
    return this.clinicasService.atualizar(user.userId, dto);
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.clinicasService.buscarPorId(id);
  }
}
