import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacaoTipo } from '../../generated/prisma/enums';
import { WhatsappService } from '../whatsapp/whatsapp.service';

// Um único template genérico, com o texto da notificação como variável — evita
// precisar de um template aprovado pela Meta pra cada um dos NotificacaoTipo.
// Precisa existir (e estar aprovado) na conta do WhatsApp Business com esse
// nome exato antes de funcionar de verdade; ver api/scripts/whatsapp-template.ts.
const TEMPLATE_NOTIFICACAO = 'notificacao_generica';

@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);

  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService,
  ) {}

  /** Usada pelos outros serviços (candidaturas, pagamentos, avaliações) pra registrar um evento. */
  async criar(userId: string, tipo: NotificacaoTipo, texto: string) {
    const notificacao = await this.prisma.notificacao.create({ data: { userId, tipo, texto } });
    // Não aguardamos o envio de propósito: a notificação no banco (que já
    // alimenta o sininho) não pode ficar mais lenta esperando a API da Meta.
    this.enviarWhatsapp(userId, texto).catch((err) =>
      this.logger.error(`Falha ao encaminhar notificação pro WhatsApp: ${err instanceof Error ? err.message : err}`),
    );
    return notificacao;
  }

  private async enviarWhatsapp(userId: string, texto: string) {
    if (!this.whatsapp.configurado) return;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        clinica: { select: { telefone: true } },
        profissional: { select: { telefone: true } },
      },
    });
    const telefone = user?.clinica?.telefone || user?.profissional?.telefone;
    await this.whatsapp.enviarTemplate(telefone, TEMPLATE_NOTIFICACAO, [texto]);
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
