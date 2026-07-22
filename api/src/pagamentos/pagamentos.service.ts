import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PagamentoStatus,
  VagaStatus,
  Role,
} from '../../generated/prisma/enums';

@Injectable()
export class PagamentosService {
  constructor(private prisma: PrismaService) {}

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
      include: { vaga: { include: { clinica: true } } },
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

    return this.prisma.$transaction(async (tx) => {
      await tx.vaga.update({
        where: { id: pagamento.vagaId },
        data: { status: VagaStatus.CONCLUIDA },
      });
      return tx.pagamento.update({
        where: { id: pagamentoId },
        data: { status: PagamentoStatus.LIBERADO, liberadoEm: new Date() },
      });
    });
  }
}
