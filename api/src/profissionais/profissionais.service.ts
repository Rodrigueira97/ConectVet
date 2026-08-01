import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { UpdateProfissionalDto } from './dto/update-profissional.dto';

@Injectable()
export class ProfissionaisService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
  ) {}

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
    const existente = await this.buscarPorUserId(userId);
    const { dataNascimento, ...resto } = dto;
    const atualizado = await this.prisma.profissional.update({
      where: { userId },
      data: {
        ...resto,
        ...(dataNascimento ? { dataNascimento: new Date(dataNascimento) } : {}),
      },
    });

    // Some a foto antiga do R2 quando é substituída por uma nova — só depois
    // do update salvar, pra nunca apagar um arquivo que ainda está em uso.
    if (dto.fotoUrl !== undefined && existente.fotoUrl && existente.fotoUrl !== dto.fotoUrl) {
      await this.uploads.deleteByUrl(existente.fotoUrl);
    }

    return atualizado;
  }
}
