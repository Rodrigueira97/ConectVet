import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateClinicaDto } from './dto/update-clinica.dto';

@Injectable()
export class ClinicasService {
  constructor(private prisma: PrismaService) {}

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
    await this.buscarPorUserId(userId);
    return this.prisma.clinica.update({ where: { userId }, data: dto });
  }
}
