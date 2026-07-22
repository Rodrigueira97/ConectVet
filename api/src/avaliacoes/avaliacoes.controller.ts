import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AvaliacoesService } from './avaliacoes.service';
import { CreateAvaliacaoDto } from './dto/create-avaliacao.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../auth/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/enums';

@Controller('avaliacoes')
export class AvaliacoesController {
  constructor(private avaliacoesService: AvaliacoesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLINICA, Role.PROFISSIONAL)
  @Post()
  criar(@CurrentUser() user: AuthUser, @Body() dto: CreateAvaliacaoDto) {
    return this.avaliacoesService.criar(user, dto);
  }

  @Get('candidatura/:candidaturaId')
  porCandidatura(@Param('candidaturaId') candidaturaId: string) {
    return this.avaliacoesService.porCandidatura(candidaturaId);
  }
}
