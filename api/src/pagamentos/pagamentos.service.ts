import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificacaoTipo,
  PagamentoStatus,
  VagaStatus,
  Role,
} from '../../generated/prisma/enums';
import { NotificacoesService } from '../notificacoes/notificacoes.service';

@Injectable()
export class PagamentosService {
  constructor(
    private prisma: PrismaService,
    private notificacoesService: NotificacoesService,
  ) {}

  async listarTodos() {
    return this.prisma.pagamento.findMany({
      include: {
        vaga: {
          select: {
            categoria: true,
            cidade: true,
            estado: true,
            rua: true,
            numero: true,
          },
        },
        candidatura: { include: { profissional: { select: { nome: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async liberar(user: { userId: string; role: string }, pagamentoId: string) {
    const pagamento = await this.prisma.pagamento.findUnique({
      where: { id: pagamentoId },
      include: {
        vaga: { include: { clinica: true } },
        candidatura: { include: { profissional: { select: { userId: true } } } },
      },
    });
    if (!pagamento) throw new NotFoundException('Pagamento não encontrado.');

    if (
      user.role === Role.CLINICA &&
      pagamento.vaga.clinica.userId !== user.userId
    ) {
      throw new ForbiddenException(
        'Este pagamento não pertence à sua clínica.',
      );
    }

    if (pagamento.status === PagamentoStatus.LIBERADO) return pagamento;

    const liberado = await this.prisma.$transaction(async (tx) => {
      await tx.vaga.update({
        where: { id: pagamento.vagaId },
        data: { status: VagaStatus.CONCLUIDA },
      });
      return tx.pagamento.update({
        where: { id: pagamentoId },
        data: { status: PagamentoStatus.LIBERADO, liberadoEm: new Date() },
      });
    });

    await this.notificacoesService.criar(
      pagamento.candidatura.profissional.userId,
      NotificacaoTipo.PAGAMENTO_LIBERADO,
      `Pagamento de R$ ${pagamento.valorLiquido} foi liberado.`,
    );

    return liberado;
  }
}
