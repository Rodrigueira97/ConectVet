import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VagasService } from './vagas.service';
import { CreateVagaDto } from './dto/create-vaga.dto';
import { UpdateVagaDto } from './dto/update-vaga.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../auth/decorators/current-user.decorator';
import { Role, Categoria } from '../../generated/prisma/enums';

@Controller('vagas')
export class VagasController {
  constructor(private vagasService: VagasService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLINICA)
  @Post()
  criar(@CurrentUser() user: AuthUser, @Body() dto: CreateVagaDto) {
    return this.vagasService.criar(user.userId, dto);
  }

  @Get()
  feed(
    @Query('categoria') categoria?: Categoria,
    @Query('cidade') cidade?: string,
  ) {
    return this.vagasService.feed({ categoria, cidade });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLINICA)
  @Get('minhas')
  minhas(@CurrentUser() user: AuthUser) {
    return this.vagasService.minhas(user.userId);
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.vagasService.buscarPorId(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLINICA)
  @Patch(':id')
  atualizar(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateVagaDto,
  ) {
    return this.vagasService.atualizar(user.userId, id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CLINICA)
  @Post(':id/cancelar')
  cancelar(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vagasService.cancelar(user.userId, id);
  }
}
