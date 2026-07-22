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
}
