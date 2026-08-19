import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVagaDto } from './dto/create-vaga.dto';
import { UpdateVagaDto } from './dto/update-vaga.dto';
import { CandidaturaStatus, Categoria, NotificacaoTipo, VagaStatus } from '../../generated/prisma/enums';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';
import { PagamentosService } from '../pagamentos/pagamentos.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import {
  comPagamentoMaisRecente,
  PAGAMENTO_MAIS_RECENTE_INCLUDE,
} from '../pagamentos/pagamento.utils';

// Prefixo do código da vaga (ex.: "VC-4821") pelas iniciais da categoria — mesmo
// código em todo lugar que a vaga aparece: painel da clínica, feed do profissional
// e página pública, logado ou não. Ver README da conversa: VC/VE/AU/ES.
const PREFIXO_CODIGO: Record<Categoria, string> = {
  VETERINARIO_CLINICO: 'VC',
  VETERINARIO_ESPECIALISTA: 'VE',
  AUXILIAR: 'AU',
  ESTAGIARIO: 'ES',
};

const CATEGORIA_LABEL: Record<Categoria, string> = {
  VETERINARIO_CLINICO: 'Veterinário Clínico',
  VETERINARIO_ESPECIALISTA: 'Veterinário Especialista',
  ESTAGIARIO: 'Estagiário',
  AUXILIAR: 'Auxiliar',
};
function formatCategoriaLabel(categoria: Categoria) {
  return CATEGORIA_LABEL[categoria];
}

@Injectable()
export class VagasService {
  constructor(
    private prisma: PrismaService,
    private avaliacoesService: AvaliacoesService,
    private pagamentosService: PagamentosService,
    private notificacoesService: NotificacoesService,
  ) {}

  /** Sorteia 4 dígitos e tenta de novo em caso de colisão (raríssima) — mais simples e
   * seguro sob concorrência do que manter uma tabela de contador por prefixo. */
  private async gerarCodigo(categoria: Categoria): Promise<string> {
    const prefixo = PREFIXO_CODIGO[categoria];
    for (let tentativa = 0; tentativa < 8; tentativa++) {
      const numero = Math.floor(1000 + Math.random() * 9000);
      const codigo = `${prefixo}-${numero}`;
      const existe = await this.prisma.vaga.findUnique({ where: { codigo } });
      if (!existe) return codigo;
    }
    throw new Error('Não foi possível gerar um código único para a vaga.');
  }

  async criar(clinicaUserId: string, dto: CreateVagaDto) {
    const clinica = await this.prisma.clinica.findUniqueOrThrow({
      where: { userId: clinicaUserId },
    });
    const { convidarFavoritos, ...dadosVaga } = dto;
    const codigo = await this.gerarCodigo(dto.categoria);
    const vaga = await this.prisma.vaga.create({
      data: { ...dadosVaga, data: new Date(dto.data), clinicaId: clinica.id, codigo },
    });

    // Convite no momento de publicar — mesma regra de categoria do convite avulso
    // (ver #convidar), só que aqui falhas individuais não derrubam a publicação:
    // a vaga já existe, um convite que não pôde sair não deveria desfazer isso.
    if (convidarFavoritos?.length) {
      await Promise.all(
        convidarFavoritos.map((profissionalId) =>
          this.convidar(clinicaUserId, vaga.id, profissionalId).catch(() => null),
        ),
      );
    }

    return vaga;
  }

  /** Convida um profissional (favorito ou não) pra se candidatar a uma vaga aberta —
   * manda uma notificação com link direto pra vaga. Mesma trava de categoria que já
   * existe pra candidatura de verdade (ver app/profissional/page.tsx, `compat`):
   * convidar alguém pra uma categoria que ele não pode aceitar não faz sentido. */
  async convidar(clinicaUserId: string, vagaId: string, profissionalId: string) {
    const vaga = await this.garantirDona(clinicaUserId, vagaId);
    if (vaga.status !== VagaStatus.ABERTA) {
      throw new ForbiddenException('Só é possível convidar pra vagas abertas.');
    }
    const profissional = await this.prisma.profissional.findUnique({ where: { id: profissionalId } });
    if (!profissional) throw new NotFoundException('Profissional não encontrado.');
    if (profissional.funcao !== vaga.categoria) {
      throw new ForbiddenException('Esse profissional não é da categoria desta vaga.');
    }

    const clinica = await this.prisma.clinica.findUniqueOrThrow({ where: { id: vaga.clinicaId } });
    await this.notificacoesService.criar(
      profissional.userId,
      NotificacaoTipo.CONVITE_PARA_VAGA,
      `${clinica.nome} quer você de novo — convite pro plantão de ${formatCategoriaLabel(vaga.categoria)}${vaga.codigo ? ` (${vaga.codigo})` : ''}.`,
      vaga.id,
    );
    return { ok: true };
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
