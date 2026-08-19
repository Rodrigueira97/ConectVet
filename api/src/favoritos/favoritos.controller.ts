import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FavoritosService } from './favoritos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CLINICA)
@Controller('favoritos')
export class FavoritosController {
  constructor(private favoritosService: FavoritosService) {}

  @Get()
  listar(@CurrentUser() user: AuthUser) {
    return this.favoritosService.listar(user.userId);
  }

  @Post(':profissionalId')
  favoritar(@CurrentUser() user: AuthUser, @Param('profissionalId') profissionalId: string) {
    return this.favoritosService.favoritar(user.userId, profissionalId);
  }

  @Delete(':profissionalId')
  desfavoritar(@CurrentUser() user: AuthUser, @Param('profissionalId') profissionalId: string) {
    return this.favoritosService.desfavoritar(user.userId, profissionalId);
  }
}
