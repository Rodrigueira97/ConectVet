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
  Role,
} from '../../generated/prisma/enums';

@Injectable()
export class AvaliacoesService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.avaliacao.create({
      data: {
        candidaturaId: dto.candidaturaId,
        profissionalId: candidatura.profissionalId,
        autor,
        nota: dto.nota,
        comentario: dto.comentario,
      },
    });
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
