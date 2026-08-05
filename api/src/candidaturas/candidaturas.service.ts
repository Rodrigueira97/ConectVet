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
  NotificacaoTipo,
  PagamentoStatus,
  VagaStatus,
} from '../../generated/prisma/enums';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';

const TAXA_PLATAFORMA = 0.05;

// Só dá pra desistir antes do plantão começar — depois disso já é um caso de
// não comparecimento (fluxo diferente, que não reabre a vaga). Mesmo critério
// de fuso horário (America/Sao_Paulo) usado no front pra "hoje"/"agora".
function plantaoAindaNaoComecou(vaga: { data: Date; horaInicio: string }): boolean {
  const hojeBrasil = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const dataVaga = vaga.data.toISOString().slice(0, 10);
  if (dataVaga > hojeBrasil) return true;
  if (dataVaga < hojeBrasil) return false;
  const agoraBrasil = new Date().toLocaleTimeString('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  });
  return agoraBrasil < vaga.horaInicio;
}

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
    return this.prisma.candidatura.findMany({
      where: { profissionalId: profissional.id },
      include: {
        vaga: { include: { clinica: { select: { nome: true, logoUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
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

  /** Aceita a candidatura e já retém o pagamento — cada vaga permite apenas um aprovado por enquanto. */
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
          status: PagamentoStatus.RETIDO,
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

      // Nenhum valor chegou a ser pago de fato (RETIDO é só controle interno
      // hoje, sem gateway) — o registro some junto com a desistência, pra
      // abrir espaço pro pagamento da próxima aceitação nessa mesma vaga.
      await tx.pagamento.deleteMany({ where: { candidaturaId } });

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
