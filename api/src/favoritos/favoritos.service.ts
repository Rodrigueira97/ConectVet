import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';
import { CandidaturaStatus } from '../../generated/prisma/enums';

const PROFISSIONAL_RESUMO_SELECT = {
  id: true,
  nome: true,
  funcao: true,
  especialidade: true,
  areaAtuacao: true,
  regioesAtendimento: true,
  fotoUrl: true,
};

@Injectable()
export class FavoritosService {
  constructor(
    private prisma: PrismaService,
    private avaliacoes: AvaliacoesService,
  ) {}

  private async minhaClinica(clinicaUserId: string) {
    return this.prisma.clinica.findUniqueOrThrow({ where: { userId: clinicaUserId } });
  }

  async favoritar(clinicaUserId: string, profissionalId: string) {
    const clinica = await this.minhaClinica(clinicaUserId);
    const profissional = await this.prisma.profissional.findUnique({ where: { id: profissionalId } });
    if (!profissional) throw new NotFoundException('Profissional não encontrado.');

    // Idempotente: favoritar quem já é favorito não deve dar erro — evita ter que
    // sincronizar estado otimista no front com um try/catch de conflito.
    return this.prisma.favorito.upsert({
      where: { clinicaId_profissionalId: { clinicaId: clinica.id, profissionalId } },
      update: {},
      create: { clinicaId: clinica.id, profissionalId },
    });
  }

  async desfavoritar(clinicaUserId: string, profissionalId: string) {
    const clinica = await this.minhaClinica(clinicaUserId);
    await this.prisma.favorito.deleteMany({ where: { clinicaId: clinica.id, profissionalId } });
    return { ok: true };
  }

  /** Favoritos da clínica, com nota média e "plantões juntos" (candidaturas aceitas
   * dele em vagas dessa mesma clínica) — é o que faz o card fazer sentido na Home. */
  async listar(clinicaUserId: string) {
    const clinica = await this.minhaClinica(clinicaUserId);
    const favoritos = await this.prisma.favorito.findMany({
      where: { clinicaId: clinica.id },
      orderBy: { createdAt: 'desc' },
      include: { profissional: { select: PROFISSIONAL_RESUMO_SELECT } },
    });
    if (!favoritos.length) return [];

    const ids = favoritos.map((f) => f.profissionalId);
    const [medias, plantoes] = await Promise.all([
      this.avaliacoes.mediaPorProfissionais(ids),
      this.prisma.candidatura.groupBy({
        by: ['profissionalId'],
        where: { profissionalId: { in: ids }, status: CandidaturaStatus.ACEITO, vaga: { clinicaId: clinica.id } },
        _count: true,
      }),
    ]);
    const plantoesPorProfissional = new Map(plantoes.map((p) => [p.profissionalId, p._count]));

    return favoritos.map((f) => ({
      favoritoId: f.id,
      favoritadoEm: f.createdAt,
      profissional: {
        ...f.profissional,
        ...(medias.get(f.profissionalId) ?? { notaMedia: null, totalAvaliacoes: 0 }),
        plantoesJuntos: plantoesPorProfissional.get(f.profissionalId) ?? 0,
      },
    }));
  }
}
