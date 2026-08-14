import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCandidaturaDto } from './dto/create-candidatura.dto';
import {
  CandidaturaStatus,
  MotivoReembolso,
  NotificacaoTipo,
  PagamentoStatus,
  VagaStatus,
} from '../../generated/prisma/enums';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { TAXA_PLATAFORMA } from '../pagamentos/taxas';
import {
  comPagamentoMaisRecente,
  PAGAMENTO_MAIS_RECENTE_INCLUDE,
} from '../pagamentos/pagamento.utils';
import { plantaoAindaNaoComecou } from '../common/plantao.utils';

@Injectable()
export class CandidaturasService {
  constructor(
    private prisma: PrismaService,
    private avaliacoesService: AvaliacoesService,
    private notificacoesService: NotificacoesService,
  ) {}

  async candidatar(profissionalUserId: string, dto: CreateCandidaturaDto) {
    const profissional = await this.prisma.profissional.findUniqueOrThrow({
      where: { userId: profissionalUserId },
    });

    const vaga = await this.prisma.vaga.findUnique({
      where: { id: dto.vagaId },
    });
    if (!vaga) throw new NotFoundException('Vaga não encontrada.');
    if (vaga.status !== VagaStatus.ABERTA)
      throw new ConflictException(
        'Esta vaga não está mais recebendo candidaturas.',
      );

    const jaCandidatou = await this.prisma.candidatura.findUnique({
      where: {
        vagaId_profissionalId: {
          vagaId: dto.vagaId,
          profissionalId: profissional.id,
        },
      },
    });
    if (jaCandidatou)
      throw new ConflictException('Você já se candidatou a esta vaga.');

    return this.prisma.candidatura.create({
      data: { vagaId: dto.vagaId, profissionalId: profissional.id },
    });
  }

  async minhas(profissionalUserId: string) {
    const profissional = await this.prisma.profissional.findUniqueOrThrow({
      where: { userId: profissionalUserId },
    });
    const candidaturas = await this.prisma.candidatura.findMany({
      where: { profissionalId: profissional.id },
      include: {
        vaga: {
          include: {
            clinica: { select: { nome: true, logoUrl: true } },
            pagamentos: PAGAMENTO_MAIS_RECENTE_INCLUDE,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return candidaturas.map((c) => ({ ...c, vaga: comPagamentoMaisRecente(c.vaga) }));
  }

  /** Desistência da candidatura pelo próprio profissional — só permitida enquanto ainda não houve resposta. */
  async cancelar(profissionalUserId: string, candidaturaId: string) {
    const profissional = await this.prisma.profissional.findUniqueOrThrow({
      where: { userId: profissionalUserId },
    });
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
    });
    if (!candidatura)
      throw new NotFoundException('Candidatura não encontrada.');
    if (candidatura.profissionalId !== profissional.id)
      throw new ForbiddenException('Esta candidatura não pertence a você.');
    if (candidatura.status !== CandidaturaStatus.PENDENTE)
      throw new ConflictException(
        'Só é possível cancelar candidaturas ainda pendentes.',
      );

    await this.prisma.candidatura.delete({ where: { id: candidaturaId } });
    return { ok: true };
  }

  async candidatosDaVaga(clinicaUserId: string, vagaId: string) {
    const clinica = await this.prisma.clinica.findUniqueOrThrow({
      where: { userId: clinicaUserId },
    });
    const vaga = await this.prisma.vaga.findUnique({ where: { id: vagaId } });
    if (!vaga) throw new NotFoundException('Vaga não encontrada.');
    if (vaga.clinicaId !== clinica.id)
      throw new ForbiddenException('Esta vaga não pertence à sua clínica.');

    const candidaturas = await this.prisma.candidatura.findMany({
      where: { vagaId },
      include: {
        profissional: {
          select: {
            id: true,
            nome: true,
            funcao: true,
            especialidade: true,
            areaAtuacao: true,
            regioesAtendimento: true,
            fotoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const medias = await this.avaliacoesService.mediaPorProfissionais(
      candidaturas.map((c) => c.profissional.id),
    );
    return candidaturas.map((c) => ({
      ...c,
      profissional: {
        ...c.profissional,
        ...(medias.get(c.profissional.id) ?? { notaMedia: null, totalAvaliacoes: 0 }),
      },
    }));
  }

  async recusar(clinicaUserId: string, candidaturaId: string) {
    const candidatura = await this.buscarComDono(clinicaUserId, candidaturaId);
    if (candidatura.status !== CandidaturaStatus.PENDENTE) {
      throw new ConflictException('Esta candidatura já foi respondida.');
    }
    const atualizada = await this.prisma.candidatura.update({
      where: { id: candidaturaId },
      data: { status: CandidaturaStatus.RECUSADO },
    });
    await this.notificacoesService.criar(
      candidatura.profissional.userId,
      NotificacaoTipo.CANDIDATURA_RECUSADA,
      `Sua candidatura para ${candidatura.vaga.clinica.nome} não foi aceita desta vez.`,
    );
    return atualizada;
  }

  /**
   * Aceita a candidatura e cria o registro de pagamento — ainda sem cobrança
   * de verdade nenhuma (isso só acontece quando a clínica escolhe Pix/Cartão
   * na aba de pagamento, ver PagamentosService.cobrar). Cada vaga permite
   * apenas um aprovado por enquanto.
   */
  async aceitar(clinicaUserId: string, candidaturaId: string) {
    const candidatura = await this.buscarComDono(clinicaUserId, candidaturaId);

    if (candidatura.vaga.status !== VagaStatus.ABERTA) {
      throw new ConflictException('Esta vaga já tem um profissional aprovado.');
    }
    if (candidatura.status !== CandidaturaStatus.PENDENTE) {
      throw new ConflictException('Esta candidatura já foi respondida.');
    }

    const valorLiquido = Number(candidatura.vaga.valor);
    const taxa = Number((valorLiquido * TAXA_PLATAFORMA).toFixed(2));
    const valorBruto = Number((valorLiquido + taxa).toFixed(2));

    const outrosPendentes = await this.prisma.candidatura.findMany({
      where: {
        vagaId: candidatura.vagaId,
        status: CandidaturaStatus.PENDENTE,
        id: { not: candidaturaId },
      },
      include: { profissional: { select: { userId: true } } },
    });

    const pagamento = await this.prisma.$transaction(async (tx) => {
      await tx.candidatura.update({
        where: { id: candidaturaId },
        data: { status: CandidaturaStatus.ACEITO },
      });

      if (outrosPendentes.length) {
        await tx.candidatura.updateMany({
          where: { id: { in: outrosPendentes.map((c) => c.id) } },
          data: { status: CandidaturaStatus.RECUSADO },
        });
      }

      await tx.vaga.update({
        where: { id: candidatura.vagaId },
        data: { status: VagaStatus.PREENCHIDA },
      });

      return tx.pagamento.create({
        data: {
          vagaId: candidatura.vagaId,
          candidaturaId: candidatura.id,
          valorBruto,
          taxa,
          valorLiquido,
          status: PagamentoStatus.AGUARDANDO_COBRANCA,
        },
      });
    });

    const clinicaNome = candidatura.vaga.clinica.nome;
    await this.notificacoesService.criar(
      candidatura.profissional.userId,
      NotificacaoTipo.CANDIDATURA_ACEITA,
      `Sua candidatura para ${clinicaNome} foi aceita.`,
    );
    for (const outra of outrosPendentes) {
      await this.notificacoesService.criar(
        outra.profissional.userId,
        NotificacaoTipo.VAGA_PREENCHIDA_OUTRO,
        `A vaga em ${clinicaNome} foi preenchida por outro profissional.`,
      );
    }

    return pagamento;
  }

  /**
   * Desistência de uma candidatura já aceita, pelo próprio profissional — só
   * antes do plantão começar. Reabre a vaga (ainda dá tempo de achar outro
   * profissional) e devolve pra PENDENTE quem tinha sido recusado só porque
   * essa candidatura foi aceita, já que a constraint única de candidatura por
   * vaga+profissional impede que eles se candidatem de novo do zero.
   */
  async desistir(profissionalUserId: string, candidaturaId: string) {
    const profissional = await this.prisma.profissional.findUniqueOrThrow({
      where: { userId: profissionalUserId },
    });
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: { vaga: { include: { clinica: true } } },
    });
    if (!candidatura)
      throw new NotFoundException('Candidatura não encontrada.');
    if (candidatura.profissionalId !== profissional.id) {
      throw new ForbiddenException('Esta candidatura não pertence a você.');
    }
    if (candidatura.status !== CandidaturaStatus.ACEITO) {
      throw new ConflictException(
        'Só é possível desistir de uma candidatura aceita.',
      );
    }
    if (!plantaoAindaNaoComecou(candidatura.vaga)) {
      throw new ConflictException(
        'O plantão já começou — não é mais possível desistir por aqui.',
      );
    }

    const recusadosParaReabrir = await this.prisma.candidatura.findMany({
      where: { vagaId: candidatura.vagaId, status: CandidaturaStatus.RECUSADO },
      include: { profissional: { select: { userId: true } } },
    });

    const pagamento = await this.prisma.pagamento.findUnique({
      where: { candidaturaId },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.candidatura.update({
        where: { id: candidaturaId },
        data: { status: CandidaturaStatus.DESISTIU },
      });

      if (recusadosParaReabrir.length) {
        await tx.candidatura.updateMany({
          where: { id: { in: recusadosParaReabrir.map((c) => c.id) } },
          data: { status: CandidaturaStatus.PENDENTE },
        });
      }

      // Se a cobrança já tinha sido aprovada, é reembolso de verdade (a
      // clínica recebe o valor cheio de volta — política decidida no desenho
      // do gateway). Se ainda nem tinha sido cobrada, não tem o que devolver:
      // só cancela. Mantém o registro (não apaga mais) pra ter histórico —
      // a próxima aceitação nessa mesma vaga cria um Pagamento novo.
      if (pagamento) {
        if (pagamento.status === PagamentoStatus.RETIDO) {
          await tx.pagamento.update({
            where: { candidaturaId },
            data: {
              status: PagamentoStatus.REEMBOLSADO,
              motivoReembolso: MotivoReembolso.DESISTENCIA,
              reembolsadoEm: new Date(),
            },
          });
        } else if (
          (
            [
              PagamentoStatus.AGUARDANDO_COBRANCA,
              PagamentoStatus.PROCESSANDO,
              PagamentoStatus.FALHOU,
            ] as PagamentoStatus[]
          ).includes(pagamento.status)
        ) {
          await tx.pagamento.update({
            where: { candidaturaId },
            data: { status: PagamentoStatus.CANCELADO },
          });
        }
        // Qualquer outro status (liberado, já reembolsado etc.) não deveria
        // ser alcançável aqui — plantaoAindaNaoComecou já barrou antes.
      }

      await tx.vaga.update({
        where: { id: candidatura.vagaId },
        data: { status: VagaStatus.ABERTA },
      });
    });

    const clinicaNome = candidatura.vaga.clinica.nome;
    await this.notificacoesService.criar(
      candidatura.vaga.clinica.userId,
      NotificacaoTipo.PROFISSIONAL_DESISTIU,
      `${profissional.nome} desistiu do plantão marcado — a vaga já está aberta de novo.`,
    );
    for (const c of recusadosParaReabrir) {
      await this.notificacoesService.criar(
        c.profissional.userId,
        NotificacaoTipo.VAGA_REABERTA,
        `A vaga em ${clinicaNome} reabriu — você pode ser considerado de novo.`,
      );
    }

    return { ok: true };
  }

  private async buscarComDono(clinicaUserId: string, candidaturaId: string) {
    const clinica = await this.prisma.clinica.findUniqueOrThrow({
      where: { userId: clinicaUserId },
    });
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: {
        vaga: { include: { clinica: true } },
        profissional: { select: { userId: true } },
      },
    });
    if (!candidatura)
      throw new NotFoundException('Candidatura não encontrada.');
    if (candidatura.vaga.clinicaId !== clinica.id)
      throw new ForbiddenException(
        'Esta candidatura não pertence à sua clínica.',
      );
    return candidatura;
  }
}
