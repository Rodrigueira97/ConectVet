import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacaoTipo } from '../../generated/prisma/enums';

@Injectable()
export class NotificacoesService {
  constructor(private prisma: PrismaService) {}

  /** Usada pelos outros serviços (candidaturas, pagamentos, avaliações) pra registrar um evento. */
  criar(userId: string, tipo: NotificacaoTipo, texto: string) {
    return this.prisma.notificacao.create({ data: { userId, tipo, texto } });
  }

  minhas(userId: string) {
    return this.prisma.notificacao.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async marcarTodasLidas(userId: string) {
    await this.prisma.notificacao.updateMany({
      where: { userId, lida: false },
      data: { lida: true },
    });
    return { ok: true };
  }
}
