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

  /** Mais bem avaliados da plataforma (por nota média dada por clínicas) — alimenta a
   * seção "Mais bem avaliados" da Home da clínica, de onde ela favorita/convida. Só
   * entram profissionais com pelo menos uma avaliação; sem isso a "nota média" de quem
   * nunca trabalhou empataria em 0 com todo mundo e a ordenação não diria nada. */
  async ranking(limit = 10, offset = 0) {
    const grupos = await this.prisma.avaliacao.groupBy({
      by: ['profissionalId'],
      where: { autor: 'CLINICA' },
      _avg: { nota: true },
      _count: true,
      orderBy: { _avg: { nota: 'desc' } },
      skip: offset,
      take: limit,
    });
    if (!grupos.length) return [];

    const profissionais = await this.prisma.profissional.findMany({
      where: { id: { in: grupos.map((g) => g.profissionalId) } },
      select: {
        id: true, nome: true, funcao: true, especialidade: true,
        areaAtuacao: true, regioesAtendimento: true, fotoUrl: true,
      },
    });
    const porId = new Map(profissionais.map((p) => [p.id, p]));

    // groupBy já devolve na ordem certa — só precisa juntar com os dados do profissional,
    // preservando essa ordem (o Map acima não garante isso sozinho).
    return grupos
      .map((g) => {
        const profissional = porId.get(g.profissionalId);
        if (!profissional) return null;
        return {
          ...profissional,
          notaMedia: Number((g._avg.nota ?? 0).toFixed(1)),
          totalAvaliacoes: g._count,
        };
      })
      .filter((p): p is NonNullable<typeof p> => !!p);
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
    // Idem pro comprovante reenviado — o antigo só é apagado do R2 se de fato
    // estava lá (deleteByUrl ignora silenciosamente o link morto pré-R2).
    if (dto.comprovanteUrl !== undefined && existente.comprovanteUrl && existente.comprovanteUrl !== dto.comprovanteUrl) {
      await this.uploads.deleteByUrl(existente.comprovanteUrl);
    }

    // Esse update não mexe no User, então o e-mail de `existente` (que já
    // veio achatado de buscarPorUserId) continua valendo — sem isso o front
    // perderia o e-mail da tela assim que salvasse qualquer outra edição.
    return { ...atualizado, email: existente.email };
  }
}
