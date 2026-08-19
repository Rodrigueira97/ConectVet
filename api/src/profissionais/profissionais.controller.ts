import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ProfissionaisService } from './profissionais.service';
import { UpdateProfissionalDto } from './dto/update-profissional.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../auth/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/enums';

@Controller('profissionais')
export class ProfissionaisController {
  constructor(private profissionaisService: ProfissionaisService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFISSIONAL)
  @Get('me')
  meuPerfil(@CurrentUser() user: AuthUser) {
    return this.profissionaisService.buscarPorUserId(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PROFISSIONAL)
  @Patch('me')
  atualizarMeuPerfil(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfissionalDto,
  ) {
    return this.profissionaisService.atualizar(user.userId, dto);
  }

  // Precisa vir antes de ":id" — senão o Nest tentaria casar "ranking" como um id de profissional.
  @Get('ranking')
  ranking(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.profissionaisService.ranking(
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
    );
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.profissionaisService.buscarPorId(id);
  }
}
