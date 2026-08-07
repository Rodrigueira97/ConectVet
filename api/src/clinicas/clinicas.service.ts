import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { UpdateClinicaDto } from './dto/update-clinica.dto';
import { Prisma } from '../../generated/prisma/client';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';

@Injectable()
export class ClinicasService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
    private avaliacoes: AvaliacoesService,
  ) {}

  async buscarPorUserId(userId: string) {
    const clinica = await this.prisma.clinica.findUnique({ where: { userId } });
    if (!clinica) throw new NotFoundException('Clínica não encontrada.');
    return clinica;
  }

  /** Perfil público da clínica (tela acessada pela foto/nome dela em Detalhes
   * da vaga) — só os campos que fazem sentido pra quem está de fora olhando:
   * fica de fora CNPJ, inscrição estadual, responsável técnico, telefone,
   * CEP e observações internas do cadastro. */
  async buscarPorId(id: string) {
    const clinica = await this.prisma.clinica.findUnique({ where: { id } });
    if (!clinica) throw new NotFoundException('Clínica não encontrada.');
    const { notaMedia, totalAvaliacoes } = (
      await this.avaliacoes.mediaPorClinicas([id])
    ).get(id) ?? { notaMedia: null, totalAvaliacoes: 0 };

    return {
      id: clinica.id,
      nome: clinica.nome,
      sobre: clinica.sobre,
      logoUrl: clinica.logoUrl,
      fotosEstrutura: clinica.fotosEstrutura,
      estado: clinica.estado,
      cidade: clinica.cidade,
      bairro: clinica.bairro,
      rua: clinica.rua,
      numero: clinica.numero,
      complemento: clinica.complemento,
      createdAt: clinica.createdAt,
      notaMedia,
      totalAvaliacoes,
    };
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
    if (
      dto.logoUrl !== undefined &&
      existente.logoUrl &&
      existente.logoUrl !== dto.logoUrl
    ) {
      await this.uploads.deleteByUrl(existente.logoUrl);
    }
    if (dto.fotosEstrutura !== undefined) {
      const urlsAntigas =
        (existente.fotosEstrutura as unknown as { url: string }[] | null) || [];
      const urlsNovas = new Set(dto.fotosEstrutura.map((f) => f.url));
      const removidas = urlsAntigas.filter((f) => !urlsNovas.has(f.url));
      await Promise.all(removidas.map((f) => this.uploads.deleteByUrl(f.url)));
    }

    return atualizada;
  }
}
