import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CandidaturasService } from './candidaturas.service';
import { CreateCandidaturaDto } from './dto/create-candidatura.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../auth/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('candidaturas')
export class CandidaturasController {
  constructor(private candidaturasService: CandidaturasService) {}

  @Roles(Role.PROFISSIONAL)
  @Post()
  candidatar(@CurrentUser() user: AuthUser, @Body() dto: CreateCandidaturaDto) {
    return this.candidaturasService.candidatar(user.userId, dto);
  }

  @Roles(Role.PROFISSIONAL)
  @Get('minhas')
  minhas(@CurrentUser() user: AuthUser) {
    return this.candidaturasService.minhas(user.userId);
  }

  @Roles(Role.CLINICA)
  @Get('vaga/:vagaId')
  candidatosDaVaga(
    @CurrentUser() user: AuthUser,
    @Param('vagaId') vagaId: string,
  ) {
    return this.candidaturasService.candidatosDaVaga(user.userId, vagaId);
  }

  @Roles(Role.CLINICA)
  @Patch(':id/aceitar')
  aceitar(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.candidaturasService.aceitar(user.userId, id);
  }

  @Roles(Role.CLINICA)
  @Patch(':id/recusar')
  recusar(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.candidaturasService.recusar(user.userId, id);
  }
}
