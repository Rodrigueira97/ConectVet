import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { UpdateClinicaDto } from './dto/update-clinica.dto';
import { Prisma } from '../../generated/prisma/client';

@Injectable()
export class ClinicasService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
  ) {}

  async buscarPorUserId(userId: string) {
    const clinica = await this.prisma.clinica.findUnique({ where: { userId } });
    if (!clinica) throw new NotFoundException('Clínica não encontrada.');
    return clinica;
  }

  async buscarPorId(id: string) {
    const clinica = await this.prisma.clinica.findUnique({ where: { id } });
    if (!clinica) throw new NotFoundException('Clínica não encontrada.');
    // Endpoint público: telefone não é exposto por enquanto.
    const { telefone, ...publico } = clinica;
    return publico;
  }

  async atualizar(userId: string, dto: UpdateClinicaDto) {
    const existente = await this.buscarPorUserId(userId);
    const atualizada = await this.prisma.clinica.update({
      where: { userId },
      data: {
        ...dto,
        fotosEstrutura: dto.fotosEstrutura as unknown as Prisma.InputJsonValue,
      },
    });

    // Some arquivo antigo do R2 quando é substituído ou removido — só depois
    // do update salvar, pra nunca apagar um arquivo que ainda está em uso.
    if (dto.logoUrl !== undefined && existente.logoUrl && existente.logoUrl !== dto.logoUrl) {
      await this.uploads.deleteByUrl(existente.logoUrl);
    }
    if (dto.fotosEstrutura !== undefined) {
      const urlsAntigas = (existente.fotosEstrutura as unknown as { url: string }[] | null) || [];
      const urlsNovas = new Set(dto.fotosEstrutura.map((f) => f.url));
      const removidas = urlsAntigas.filter((f) => !urlsNovas.has(f.url));
      await Promise.all(removidas.map((f) => this.uploads.deleteByUrl(f.url)));
    }

    return atualizada;
  }
}
