import { Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { NotificacoesService } from './notificacoes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthUser,
} from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('notificacoes')
export class NotificacoesController {
  constructor(private notificacoesService: NotificacoesService) {}

  @Get()
  minhas(@CurrentUser() user: AuthUser) {
    return this.notificacoesService.minhas(user.userId);
  }

  @Patch('marcar-lidas')
  marcarLidas(@CurrentUser() user: AuthUser) {
    return this.notificacoesService.marcarTodasLidas(user.userId);
  }
}
