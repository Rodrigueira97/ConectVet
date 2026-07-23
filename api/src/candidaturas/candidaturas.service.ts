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
  PagamentoStatus,
  VagaStatus,
} from '../../generated/prisma/enums';

const TAXA_PLATAFORMA = 0.05;

@Injectable()
export class CandidaturasService {
  constructor(private prisma: PrismaService) {}

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
      include: { vaga: { include: { clinica: { select: { nome: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async candidatosDaVaga(clinicaUserId: string, vagaId: string) {
    const clinica = await this.prisma.clinica.findUniqueOrThrow({
      where: { userId: clinicaUserId },
    });
    const vaga = await this.prisma.vaga.findUnique({ where: { id: vagaId } });
    if (!vaga) throw new NotFoundException('Vaga não encontrada.');
    if (vaga.clinicaId !== clinica.id)
      throw new ForbiddenException('Esta vaga não pertence à sua clínica.');

    return this.prisma.candidatura.findMany({
      where: { vagaId },
      include: {
        profissional: {
          select: {
            id: true,
            nome: true,
            funcao: true,
            areaAtuacao: true,
            regioesAtendimento: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async recusar(clinicaUserId: string, candidaturaId: string) {
    const candidatura = await this.buscarComDono(clinicaUserId, candidaturaId);
    if (candidatura.status !== CandidaturaStatus.PENDENTE) {
      throw new ConflictException('Esta candidatura já foi respondida.');
    }
    return this.prisma.candidatura.update({
      where: { id: candidaturaId },
      data: { status: CandidaturaStatus.RECUSADO },
    });
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

    return this.prisma.$transaction(async (tx) => {
      await tx.candidatura.update({
        where: { id: candidaturaId },
        data: { status: CandidaturaStatus.ACEITO },
      });

      await tx.candidatura.updateMany({
        where: {
          vagaId: candidatura.vagaId,
          status: CandidaturaStatus.PENDENTE,
          id: { not: candidaturaId },
        },
        data: { status: CandidaturaStatus.RECUSADO },
      });

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
  }

  private async buscarComDono(clinicaUserId: string, candidaturaId: string) {
    const clinica = await this.prisma.clinica.findUniqueOrThrow({
      where: { userId: clinicaUserId },
    });
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: { vaga: true },
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
