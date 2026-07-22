import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVagaDto } from './dto/create-vaga.dto';
import { UpdateVagaDto } from './dto/update-vaga.dto';
import { Categoria, VagaStatus } from '../../generated/prisma/enums';

@Injectable()
export class VagasService {
  constructor(private prisma: PrismaService) {}

  async criar(clinicaUserId: string, dto: CreateVagaDto) {
    const clinica = await this.prisma.clinica.findUniqueOrThrow({
      where: { userId: clinicaUserId },
    });
    return this.prisma.vaga.create({
      data: { ...dto, data: new Date(dto.data), clinicaId: clinica.id },
    });
  }

  async feed(filtros: { categoria?: Categoria; cidade?: string }) {
    return this.prisma.vaga.findMany({
      where: {
        status: VagaStatus.ABERTA,
        categoria: filtros.categoria,
        cidade: filtros.cidade
          ? { contains: filtros.cidade, mode: 'insensitive' }
          : undefined,
      },
      include: { clinica: { select: { nome: true } } },
      orderBy: { data: 'asc' },
    });
  }

  async minhas(clinicaUserId: string) {
    const clinica = await this.prisma.clinica.findUniqueOrThrow({
      where: { userId: clinicaUserId },
    });
    return this.prisma.vaga.findMany({
      where: { clinicaId: clinica.id },
      include: {
        candidaturas: {
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
        },
        pagamento: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async buscarPorId(id: string) {
    const vaga = await this.prisma.vaga.findUnique({
      where: { id },
      include: {
        clinica: { select: { id: true, nome: true } },
        candidaturas: {
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
        },
        pagamento: true,
      },
    });
    if (!vaga) throw new NotFoundException('Vaga não encontrada.');
    return vaga;
  }

  private async garantirDona(clinicaUserId: string, vagaId: string) {
    const vaga = await this.buscarPorId(vagaId);
    const clinica = await this.prisma.clinica.findUniqueOrThrow({
      where: { userId: clinicaUserId },
    });
    if (vaga.clinicaId !== clinica.id)
      throw new ForbiddenException('Esta vaga não pertence à sua clínica.');
    return vaga;
  }

  async atualizar(clinicaUserId: string, vagaId: string, dto: UpdateVagaDto) {
    const vaga = await this.garantirDona(clinicaUserId, vagaId);
    if (vaga.status !== VagaStatus.ABERTA) {
      throw new ForbiddenException('Só é possível editar vagas ainda abertas.');
    }
    return this.prisma.vaga.update({
      where: { id: vagaId },
      data: { ...dto, data: dto.data ? new Date(dto.data) : undefined },
    });
  }

  async cancelar(clinicaUserId: string, vagaId: string) {
    await this.garantirDona(clinicaUserId, vagaId);
    return this.prisma.vaga.update({
      where: { id: vagaId },
      data: { status: VagaStatus.CANCELADA },
    });
  }
}
