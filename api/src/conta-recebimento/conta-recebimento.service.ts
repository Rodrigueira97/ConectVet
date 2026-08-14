import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContaRecebimentoStatus, TipoChavePix } from '../../generated/prisma/enums';
import { UpsertContaRecebimentoDto } from './dto/upsert-conta-recebimento.dto';
import { PagamentosService } from '../pagamentos/pagamentos.service';

const onlyDigits = (v: string) => v.replace(/\D/g, '');

@Injectable()
export class ContaRecebimentoService {
  constructor(
    private prisma: PrismaService,
    private pagamentosService: PagamentosService,
  ) {}

  async buscarMinha(profissionalUserId: string) {
    const profissional = await this.prisma.profissional.findUniqueOrThrow({
      where: { userId: profissionalUserId },
    });
    const conta = await this.prisma.contaRecebimento.findUnique({
      where: { profissionalId: profissional.id },
    });
    return (
      conta ?? {
        id: null,
        profissionalId: profissional.id,
        status: ContaRecebimentoStatus.NAO_CONFIGURADA,
        tipoChavePix: null,
        chavePix: null,
      }
    );
  }

  /**
   * Salva a chave Pix e já aprova na hora — não existe gateway de verdade
   * analisando nada ainda (ver decisão no plano do fluxo de pagamento fake).
   * Depois de aprovar, libera qualquer pagamento que já estava esperando essa
   * configuração (presença confirmada antes de o profissional cadastrar a chave).
   */
  async salvarMinha(profissionalUserId: string, dto: UpsertContaRecebimentoDto) {
    const profissional = await this.prisma.profissional.findUniqueOrThrow({
      where: { userId: profissionalUserId },
    });

    if (dto.tipoChavePix === TipoChavePix.CPF && onlyDigits(dto.chavePix) !== onlyDigits(profissional.documento)) {
      throw new BadRequestException('A chave Pix do tipo CPF precisa bater com o CPF do seu cadastro.');
    }

    const conta = await this.prisma.contaRecebimento.upsert({
      where: { profissionalId: profissional.id },
      create: {
        profissionalId: profissional.id,
        tipoChavePix: dto.tipoChavePix,
        chavePix: dto.chavePix,
        status: ContaRecebimentoStatus.APROVADA,
      },
      update: {
        tipoChavePix: dto.tipoChavePix,
        chavePix: dto.chavePix,
        status: ContaRecebimentoStatus.APROVADA,
      },
    });

    await this.pagamentosService.liberarPendentesDoProfissional(profissional.id);

    return conta;
  }
}
