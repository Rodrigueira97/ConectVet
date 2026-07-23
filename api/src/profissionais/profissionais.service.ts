import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfissionalDto } from './dto/update-profissional.dto';

@Injectable()
export class ProfissionaisService {
  constructor(private prisma: PrismaService) {}

  async buscarPorUserId(userId: string) {
    const profissional = await this.prisma.profissional.findUnique({
      where: { userId },
    });
    if (!profissional)
      throw new NotFoundException('Profissional não encontrado.');
    return profissional;
  }

  async buscarPorId(id: string) {
    const profissional = await this.prisma.profissional.findUnique({
      where: { id },
    });
    if (!profissional)
      throw new NotFoundException('Profissional não encontrado.');
    // Endpoint público: telefone e data de nascimento não são expostos por enquanto.
    const { telefone, dataNascimento, ...publico } = profissional;
    return publico;
  }

  async atualizar(userId: string, dto: UpdateProfissionalDto) {
    await this.buscarPorUserId(userId);
    const { dataNascimento, ...resto } = dto;
    return this.prisma.profissional.update({
      where: { userId },
      data: {
        ...resto,
        ...(dataNascimento ? { dataNascimento: new Date(dataNascimento) } : {}),
      },
    });
  }
}
