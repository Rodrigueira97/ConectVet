import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';
import { UpdateProfissionalDto } from './dto/update-profissional.dto';

@Injectable()
export class ProfissionaisService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
    private avaliacoes: AvaliacoesService,
  ) {}

  async buscarPorUserId(userId: string) {
    const profissional = await this.prisma.profissional.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });
    if (!profissional)
      throw new NotFoundException('Profissional não encontrado.');
    // O e-mail mora no User, não no Profissional — achata aqui pra manter o
    // formato que o front já consome. É só leitura: trocar o e-mail passa
    // pelo fluxo de autenticação, não por esse endpoint de perfil.
    const { user, ...resto } = profissional;
    return { ...resto, email: user.email };
  }

  async buscarPorId(id: string) {
    const profissional = await this.prisma.profissional.findUnique({
      where: { id },
    });
    if (!profissional)
      throw new NotFoundException('Profissional não encontrado.');
    const medias = await this.avaliacoes.mediaPorProfissionais([id]);
    // Endpoint público (ex.: clínica vendo o perfil de quem se candidatou):
    // telefone, data de nascimento e documento (CPF) não são expostos.
    const { telefone, dataNascimento, documento, ...publico } = profissional;
    return {
      ...publico,
      ...(medias.get(id) ?? { notaMedia: null, totalAvaliacoes: 0 }),
    };
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

    // Esse update não mexe no User, então o e-mail de `existente` (que já
    // veio achatado de buscarPorUserId) continua valendo — sem isso o front
    // perderia o e-mail da tela assim que salvasse qualquer outra edição.
    return { ...atualizado, email: existente.email };
  }
}
