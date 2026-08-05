import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAvaliacaoDto } from './dto/create-avaliacao.dto';
import {
  AvaliacaoAutor,
  CandidaturaStatus,
  NotificacaoTipo,
  Role,
} from '../../generated/prisma/enums';
import { NotificacoesService } from '../notificacoes/notificacoes.service';

@Injectable()
export class AvaliacoesService {
  constructor(
    private prisma: PrismaService,
    private notificacoesService: NotificacoesService,
  ) {}

  async criar(user: { userId: string; role: string }, dto: CreateAvaliacaoDto) {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: dto.candidaturaId },
      include: { vaga: { include: { clinica: true } }, profissional: true },
    });
    if (!candidatura)
      throw new NotFoundException('Candidatura não encontrada.');
    if (candidatura.status !== CandidaturaStatus.ACEITO) {
      throw new ConflictException(
        'Só é possível avaliar candidaturas aceitas.',
      );
    }

    const autor =
      user.role === Role.CLINICA
        ? AvaliacaoAutor.CLINICA
        : AvaliacaoAutor.PROFISSIONAL;

    if (
      autor === AvaliacaoAutor.CLINICA &&
      candidatura.vaga.clinica.userId !== user.userId
    ) {
      throw new ForbiddenException(
        'Esta candidatura não pertence à sua clínica.',
      );
    }
    if (
      autor === AvaliacaoAutor.PROFISSIONAL &&
      candidatura.profissional.userId !== user.userId
    ) {
      throw new ForbiddenException('Esta candidatura não é sua.');
    }

    const jaAvaliou = await this.prisma.avaliacao.findUnique({
      where: {
        candidaturaId_autor: { candidaturaId: dto.candidaturaId, autor },
      },
    });
    if (jaAvaliou)
      throw new ConflictException('Você já avaliou esta candidatura.');

    const avaliacao = await this.prisma.avaliacao.create({
      data: {
        candidaturaId: dto.candidaturaId,
        profissionalId: candidatura.profissionalId,
        autor,
        nota: dto.nota,
        comentario:
          autor === AvaliacaoAutor.CLINICA ? null : dto.comentario,
      },
    });

    const estrelas = '★'.repeat(dto.nota) + '☆'.repeat(5 - dto.nota);
    if (autor === AvaliacaoAutor.CLINICA) {
      await this.notificacoesService.criar(
        candidatura.profissional.userId,
        NotificacaoTipo.AVALIACAO_RECEBIDA,
        `${candidatura.vaga.clinica.nome} avaliou seu plantão: ${estrelas}`,
      );
    } else {
      await this.notificacoesService.criar(
        candidatura.vaga.clinica.userId,
        NotificacaoTipo.AVALIACAO_RECEBIDA,
        `${candidatura.profissional.nome} avaliou o plantão: ${estrelas}`,
      );
    }

    return avaliacao;
  }

  async porCandidatura(candidaturaId: string) {
    return this.prisma.avaliacao.findMany({ where: { candidaturaId } });
  }

  /** Nota média (dada por clínicas) para cada profissional informado. */
  async mediaPorProfissionais(profissionalIds: string[]) {
    const ids = [...new Set(profissionalIds)];
    const mapa = new Map<string, { notaMedia: number; totalAvaliacoes: number }>();
    if (!ids.length) return mapa;

    const grupos = await this.prisma.avaliacao.groupBy({
      by: ['profissionalId'],
      where: { profissionalId: { in: ids }, autor: AvaliacaoAutor.CLINICA },
      _avg: { nota: true },
      _count: true,
    });
    for (const g of grupos) {
      mapa.set(g.profissionalId, {
        notaMedia: Number((g._avg.nota ?? 0).toFixed(1)),
        totalAvaliacoes: g._count,
      });
    }
    return mapa;
  }

  /** Últimas avaliações (feitas por profissionais) recebidas por uma clínica. */
  async ultimasPorClinica(clinicaId: string, limite = 5) {
    const avaliacoes = await this.prisma.avaliacao.findMany({
      where: {
        autor: AvaliacaoAutor.PROFISSIONAL,
        candidatura: { vaga: { clinicaId } },
      },
      orderBy: { createdAt: 'desc' },
      take: limite,
      include: {
        profissional: { select: { nome: true } },
        candidatura: { select: { vaga: { select: { data: true } } } },
      },
    });

    return avaliacoes.map((a) => ({
      id: a.id,
      nota: a.nota,
      comentario: a.comentario,
      profissionalNome: a.profissional.nome,
      data: a.candidatura.vaga.data,
      createdAt: a.createdAt,
    }));
  }

  /** Últimas avaliações (feitas por clínicas) recebidas por um profissional. */
  async ultimasPorProfissional(profissionalId: string, limite = 5) {
    const avaliacoes = await this.prisma.avaliacao.findMany({
      where: {
        autor: AvaliacaoAutor.CLINICA,
        candidatura: { profissionalId },
      },
      orderBy: { createdAt: 'desc' },
      take: limite,
      include: {
        candidatura: { select: { vaga: { select: { data: true, clinica: { select: { nome: true } } } } } },
      },
    });

    return avaliacoes.map((a) => ({
      id: a.id,
      nota: a.nota,
      comentario: a.comentario,
      clinicaNome: a.candidatura.vaga.clinica.nome,
      data: a.candidatura.vaga.data,
      createdAt: a.createdAt,
    }));
  }

  /** Nota média (dada por profissionais) para cada clínica informada. */
  async mediaPorClinicas(clinicaIds: string[]) {
    const ids = [...new Set(clinicaIds)];
    const mapa = new Map<string, { notaMedia: number; totalAvaliacoes: number }>();
    if (!ids.length) return mapa;

    const avaliacoes = await this.prisma.avaliacao.findMany({
      where: {
        autor: AvaliacaoAutor.PROFISSIONAL,
        candidatura: { vaga: { clinicaId: { in: ids } } },
      },
      select: { nota: true, candidatura: { select: { vaga: { select: { clinicaId: true } } } } },
    });

    const somas = new Map<string, { soma: number; total: number }>();
    for (const a of avaliacoes) {
      const clinicaId = a.candidatura.vaga.clinicaId;
      const atual = somas.get(clinicaId) || { soma: 0, total: 0 };
      atual.soma += a.nota;
      atual.total += 1;
      somas.set(clinicaId, atual);
    }
    for (const [clinicaId, { soma, total }] of somas) {
      mapa.set(clinicaId, { notaMedia: Number((soma / total).toFixed(1)), totalAvaliacoes: total });
    }
    return mapa;
  }
}
