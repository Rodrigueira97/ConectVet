import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ContaRecebimentoStatus,
  NotificacaoTipo,
  PagamentoStatus,
  Role,
  VagaStatus,
} from '../../generated/prisma/enums';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { CobrarPagamentoDto } from './dto/cobrar-pagamento.dto';
import { SimularPagamentoDto } from './dto/simular-pagamento.dto';
import { ReportarProblemaDto } from './dto/reportar-problema.dto';
import { PAYMENT_PROVIDER, PaymentProvider } from './providers/payment-provider.interface';
import { plantaoJaTerminou } from '../common/plantao.utils';

type AuthUser = { userId: string; role: string };

/** Formato mínimo que `executarLiberacao` precisa — tanto o pagamento "cheio"
 * vindo de `buscarComDono` quanto o montado à mão em `autoLiberarPorCandidaturaId`
 * cabem aqui, já que o segundo não tem motivo de carregar vaga.clinica. */
type PagamentoParaLiberar = {
  id: string;
  vagaId: string;
  valorLiquido: number | string | { toString(): string };
  candidatura: { profissionalId: string; profissional: { userId: string } };
};

@Injectable()
export class PagamentosService {
  constructor(
    private prisma: PrismaService,
    private notificacoesService: NotificacoesService,
    @Inject(PAYMENT_PROVIDER) private paymentProvider: PaymentProvider,
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
            data: true,
            horaInicio: true,
            horaFim: true,
            clinica: { select: { nome: true } },
          },
        },
        candidatura: { include: { profissional: { select: { nome: true, telefone: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Clínica escolhe Pix ou Cartão — "envia" a cobrança pro gateway (fake por enquanto). */
  async cobrar(user: AuthUser, pagamentoId: string, dto: CobrarPagamentoDto) {
    const pagamento = await this.buscarComDono(user, pagamentoId);
    if (
      pagamento.status !== PagamentoStatus.AGUARDANDO_COBRANCA &&
      pagamento.status !== PagamentoStatus.FALHOU
    ) {
      throw new ConflictException('Esse pagamento não está aguardando cobrança.');
    }

    const valorBruto = Number(pagamento.valorBruto);
    const { taxaGateway } = await this.paymentProvider.cobrar({
      pagamentoId,
      formaPagamento: dto.formaPagamento,
      valorBruto,
    });
    const valorTotal = Number((valorBruto + taxaGateway).toFixed(2));

    return this.prisma.pagamento.update({
      where: { id: pagamentoId },
      data: {
        formaPagamento: dto.formaPagamento,
        taxaGateway,
        valorTotal,
        motivoFalha: null,
        status: PagamentoStatus.PROCESSANDO,
      },
    });
  }

  /**
   * Dev-only: decide na mão o resultado da cobrança que está em PROCESSANDO —
   * substitui o webhook que um gateway de verdade mandaria. Ver checklist do
   * protótipo de pagamento (esse é o passo intermediário antes do Asaas).
   */
  async simular(user: AuthUser, pagamentoId: string, dto: SimularPagamentoDto) {
    const pagamento = await this.buscarComDono(user, pagamentoId);
    if (pagamento.status !== PagamentoStatus.PROCESSANDO) {
      throw new ConflictException('Esse pagamento não está em processamento.');
    }

    if (dto.resultado === 'aprovado') {
      return this.prisma.pagamento.update({
        where: { id: pagamentoId },
        data: { status: PagamentoStatus.RETIDO, motivoFalha: null },
      });
    }

    return this.prisma.pagamento.update({
      where: { id: pagamentoId },
      data: {
        status: PagamentoStatus.FALHOU,
        motivoFalha: dto.motivo || 'Pagamento recusado pela operadora.',
      },
    });
  }

  /**
   * Clínica reporta um problema com o plantão (ausência, atraso, comportamento
   * etc.) — não decide nada sozinho: só abre uma disputa e pausa o pagamento
   * retido até o suporte da ConectVet analisar (resolução manual, fora do
   * app por enquanto, ver comentário de EM_DISPUTA no schema). Substitui o
   * antigo botão "Não compareceu", que devolvia o valor na hora sem revisão.
   */
  async reportarProblema(user: AuthUser, pagamentoId: string, dto: ReportarProblemaDto) {
    const pagamento = await this.buscarComDono(user, pagamentoId);
    if (
      !(
        [PagamentoStatus.RETIDO, PagamentoStatus.LIBERADO_PENDENTE] as PagamentoStatus[]
      ).includes(pagamento.status)
    ) {
      throw new ConflictException(
        'Esse pagamento já foi liberado ou resolvido — não dá mais pra reportar por aqui.',
      );
    }

    const atualizado = await this.prisma.$transaction(async (tx) => {
      await tx.vaga.update({
        where: { id: pagamento.vagaId },
        data: { status: VagaStatus.CONCLUIDA },
      });
      return tx.pagamento.update({
        where: { id: pagamentoId },
        data: {
          status: PagamentoStatus.EM_DISPUTA,
          disputaMotivo: dto.motivo,
          disputaDescricao: dto.descricao || null,
          disputaAbertaEm: new Date(),
        },
      });
    });

    await this.notificacoesService.criar(
      pagamento.candidatura.profissional.userId,
      NotificacaoTipo.PROBLEMA_REPORTADO,
      `A clínica relatou um problema com o plantão de ${pagamento.vaga.clinica.nome}. Nossa equipe vai analisar e volta com uma resposta.`,
    );

    return atualizado;
  }

  /**
   * Libera automaticamente um pagamento retido cujo check-in já foi feito e
   * o plantão já terminou — chamado ao carregar "minhas vagas"/"minhas
   * candidaturas" (não existe cron nesse projeto), nunca por um clique da
   * clínica. Devolve `null` quando ainda não é elegível.
   */
  async autoLiberarPorCandidaturaId(candidaturaId: string) {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: { vaga: true, profissional: { select: { userId: true } } },
    });
    if (!candidatura || !candidatura.checkInEm) return null;
    if (!plantaoJaTerminou(candidatura.vaga)) return null;

    const pagamento = await this.prisma.pagamento.findUnique({ where: { candidaturaId } });
    if (!pagamento || pagamento.status !== PagamentoStatus.RETIDO) return null;

    return this.executarLiberacao({
      ...pagamento,
      candidatura: {
        profissionalId: candidatura.profissionalId,
        profissional: { userId: candidatura.profissional.userId },
      },
    });
  }

  async liberar(user: AuthUser, pagamentoId: string) {
    const pagamento = await this.buscarComDono(user, pagamentoId);
    if (pagamento.status === PagamentoStatus.LIBERADO) return pagamento;
    return this.executarLiberacao(pagamento);
  }

  /**
   * Varre os pagamentos LIBERADO_PENDENTE de um profissional e libera os que
   * já podem — chamado pelo módulo de conta-recebimento assim que ele aprova
   * a chave Pix (sem passar por uma requisição de clínica, por isso não usa
   * `buscarComDono`/`liberar`, que exigem um `AuthUser` de clínica).
   */
  async liberarPendentesDoProfissional(profissionalId: string) {
    const pendentes = await this.prisma.pagamento.findMany({
      where: {
        status: PagamentoStatus.LIBERADO_PENDENTE,
        candidatura: { profissionalId },
      },
      include: {
        vaga: { include: { clinica: true } },
        candidatura: { include: { profissional: { select: { userId: true } } } },
      },
    });
    for (const pagamento of pendentes) {
      await this.executarLiberacao(pagamento);
    }
    return pendentes.length;
  }

  /** Núcleo da liberação — assume que quem chamou já validou que pode. */
  private async executarLiberacao(pagamento: PagamentoParaLiberar) {
    const contaRecebimento = await this.prisma.contaRecebimento.findUnique({
      where: { profissionalId: pagamento.candidatura.profissionalId },
    });
    const podeLiberar = contaRecebimento?.status === ContaRecebimentoStatus.APROVADA;

    const liberado = await this.prisma.$transaction(async (tx) => {
      await tx.vaga.update({
        where: { id: pagamento.vagaId },
        data: { status: VagaStatus.CONCLUIDA },
      });
      return tx.pagamento.update({
        where: { id: pagamento.id },
        data: podeLiberar
          ? { status: PagamentoStatus.LIBERADO, liberadoEm: new Date() }
          : { status: PagamentoStatus.LIBERADO_PENDENTE },
      });
    });

    if (podeLiberar) {
      await this.notificacoesService.criar(
        pagamento.candidatura.profissional.userId,
        NotificacaoTipo.PAGAMENTO_LIBERADO,
        `Pagamento de R$ ${pagamento.valorLiquido} foi liberado.`,
      );
    } else {
      await this.notificacoesService.criar(
        pagamento.candidatura.profissional.userId,
        NotificacaoTipo.PAGAMENTO_LIBERADO_PENDENTE,
        `Presença confirmada! Configure onde receber no seu perfil pra liberar os R$ ${pagamento.valorLiquido}.`,
      );
    }

    return liberado;
  }

  private async buscarComDono(user: AuthUser, pagamentoId: string) {
    const pagamento = await this.prisma.pagamento.findUnique({
      where: { id: pagamentoId },
      include: {
        vaga: { include: { clinica: true } },
        candidatura: { include: { profissional: { select: { userId: true } } } },
      },
    });
    if (!pagamento) throw new NotFoundException('Pagamento não encontrado.');

    if (user.role === Role.CLINICA && pagamento.vaga.clinica.userId !== user.userId) {
      throw new ForbiddenException('Este pagamento não pertence à sua clínica.');
    }

    return pagamento;
  }
}
