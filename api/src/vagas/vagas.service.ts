import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVagaDto } from './dto/create-vaga.dto';
import { UpdateVagaDto } from './dto/update-vaga.dto';
import { CandidaturaStatus, Categoria, VagaStatus } from '../../generated/prisma/enums';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';
import { PagamentosService } from '../pagamentos/pagamentos.service';
import {
  comPagamentoMaisRecente,
  PAGAMENTO_MAIS_RECENTE_INCLUDE,
} from '../pagamentos/pagamento.utils';

@Injectable()
export class VagasService {
  constructor(
    private prisma: PrismaService,
    private avaliacoesService: AvaliacoesService,
    private pagamentosService: PagamentosService,
  ) {}

  async criar(clinicaUserId: string, dto: CreateVagaDto) {
    const clinica = await this.prisma.clinica.findUniqueOrThrow({
      where: { userId: clinicaUserId },
    });
    return this.prisma.vaga.create({
      data: { ...dto, data: new Date(dto.data), clinicaId: clinica.id },
    });
  }

  async feed(filtros: {
    categoria?: Categoria;
    cidade?: string;
    data?: string;
    clinicaId?: string;
  }) {
    const vagas = await this.prisma.vaga.findMany({
      where: {
        categoria: filtros.categoria,
        cidade: filtros.cidade
          ? { contains: filtros.cidade, mode: 'insensitive' }
          : undefined,
        data: filtros.data ? new Date(filtros.data) : undefined,
        clinicaId: filtros.clinicaId,
      },
      include: {
        clinica: {
          select: { id: true, nome: true, logoUrl: true, fotosEstrutura: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const medias = await this.avaliacoesService.mediaPorClinicas(
      vagas.map((v) => v.clinica.id),
    );
    return vagas.map((v) => ({
      ...v,
      clinica: {
        ...v.clinica,
        ...(medias.get(v.clinica.id) ?? {
          notaMedia: null,
          totalAvaliacoes: 0,
        }),
      },
    }));
  }

  async minhas(clinicaUserId: string) {
    const clinica = await this.prisma.clinica.findUniqueOrThrow({
      where: { userId: clinicaUserId },
    });
    const vagas = await this.prisma.vaga.findMany({
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
                telefone: true,
              },
            },
          },
        },
        pagamentos: PAGAMENTO_MAIS_RECENTE_INCLUDE,
      },
      orderBy: { createdAt: 'desc' },
    });
    const comPagamento = vagas.map(comPagamentoMaisRecente);

    // Mesma lógica de app/candidaturas.service.ts#minhas: sem cron nesse
    // projeto, então libera sozinho aproveitando quem já está olhando a
    // própria lista de vagas, em vez de exigir um clique da clínica.
    for (const v of comPagamento) {
      const aceita = v.candidaturas.find((c) => c.status === CandidaturaStatus.ACEITO);
      if (aceita?.checkInEm && v.pagamento?.status === 'RETIDO') {
        const liberado = await this.pagamentosService.autoLiberarPorCandidaturaId(aceita.id);
        if (liberado) v.pagamento = liberado;
      }
    }

    return comPagamento;
  }

  async buscarPorId(id: string) {
    const vaga = await this.prisma.vaga.findUnique({
      where: { id },
      include: {
        clinica: {
          select: { id: true, nome: true, logoUrl: true, fotosEstrutura: true },
        },
        candidaturas: {
          include: {
            profissional: {
              select: {
                id: true,
                nome: true,
                funcao: true,
                areaAtuacao: true,
                regioesAtendimento: true,
                telefone: true,
              },
            },
          },
        },
        pagamentos: PAGAMENTO_MAIS_RECENTE_INCLUDE,
      },
    });
    if (!vaga) throw new NotFoundException('Vaga não encontrada.');

    const media = (
      await this.avaliacoesService.mediaPorClinicas([vaga.clinica.id])
    ).get(vaga.clinica.id) ?? { notaMedia: null, totalAvaliacoes: 0 };

    return {
      ...comPagamentoMaisRecente(vaga),
      clinica: { ...vaga.clinica, ...media },
    };
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
