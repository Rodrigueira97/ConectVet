import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ContaRecebimentoService } from './conta-recebimento.service';
import { UpsertContaRecebimentoDto } from './dto/upsert-conta-recebimento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../auth/decorators/current-user.decorator';
import { Role } from '../../generated/prisma/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PROFISSIONAL)
@Controller('conta-recebimento')
export class ContaRecebimentoController {
  constructor(private contaRecebimentoService: ContaRecebimentoService) {}

  @Get('me')
  buscarMinha(@CurrentUser() user: AuthUser) {
    return this.contaRecebimentoService.buscarMinha(user.userId);
  }

  @Put('me')
  salvarMinha(@CurrentUser() user: AuthUser, @Body() dto: UpsertContaRecebimentoDto) {
    return this.contaRecebimentoService.salvarMinha(user.userId, dto);
  }
}
