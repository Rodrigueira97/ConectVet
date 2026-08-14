import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { PagamentosService } from './pagamentos.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { PAYMENT_PROVIDER } from './providers/payment-provider.interface';
import {
  ContaRecebimentoStatus,
  PagamentoStatus,
  Role,
} from '../../generated/prisma/enums';

describe('PagamentosService', () => {
  let service: PagamentosService;
  let prisma: any;
  let notificacoes: any;
  let provider: any;

  const clinicaUser = { userId: 'clinica-user-1', role: Role.CLINICA };

  function pagamentoFixture(overrides: Record<string, unknown> = {}) {
    return {
      id: 'pag-1',
      vagaId: 'vaga-1',
      candidaturaId: 'cand-1',
      valorBruto: 336,
      taxa: 16,
      valorLiquido: 320,
      status: PagamentoStatus.AGUARDANDO_COBRANCA,
      formaPagamento: null,
      taxaGateway: 0,
      valorTotal: null,
      vaga: {
        id: 'vaga-1',
        data: new Date(),
        horaInicio: '08:00',
        horaFim: '18:00',
        clinica: { userId: 'clinica-user-1', nome: 'Clínica Teste' },
      },
      candidatura: {
        profissionalId: 'prof-1',
        profissional: { userId: 'prof-user-1' },
      },
      ...overrides,
    };
  }

  beforeEach(async () => {
    prisma = {
      pagamento: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      contaRecebimento: { findUnique: jest.fn() },
      vaga: { update: jest.fn() },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    notificacoes = { criar: jest.fn() };
    provider = { cobrar: jest.fn(), estornar: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        PagamentosService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificacoesService, useValue: notificacoes },
        { provide: PAYMENT_PROVIDER, useValue: provider },
      ],
    }).compile();

    service = module.get(PagamentosService);
  });

  describe('cobrar', () => {
    it('calcula a taxa do gateway via provider e grava o valorTotal', async () => {
      const pagamento = pagamentoFixture();
      prisma.pagamento.findUnique.mockResolvedValue(pagamento);
      provider.cobrar.mockResolvedValue({ taxaGateway: 1.99 });
      prisma.pagamento.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
        ...pagamento,
        ...data,
      }));

      const resultado = await service.cobrar(clinicaUser, 'pag-1', { formaPagamento: 'PIX' as any });

      expect(provider.cobrar).toHaveBeenCalledWith({
        pagamentoId: 'pag-1',
        formaPagamento: 'PIX',
        valorBruto: 336,
      });
      expect(resultado.taxaGateway).toBe(1.99);
      expect(resultado.valorTotal).toBe(337.99);
      expect(resultado.status).toBe(PagamentoStatus.PROCESSANDO);
    });

    it('recusa cobrar de novo um pagamento que já está retido', async () => {
      prisma.pagamento.findUnique.mockResolvedValue(
        pagamentoFixture({ status: PagamentoStatus.RETIDO }),
      );

      await expect(
        service.cobrar(clinicaUser, 'pag-1', { formaPagamento: 'PIX' as any }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('liberar', () => {
    it('vai pra LIBERADO_PENDENTE quando o profissional não tem conta de recebimento aprovada', async () => {
      const pagamento = pagamentoFixture({ status: PagamentoStatus.RETIDO });
      prisma.pagamento.findUnique.mockResolvedValue(pagamento);
      prisma.contaRecebimento.findUnique.mockResolvedValue(null);
      prisma.pagamento.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
        ...pagamento,
        ...data,
      }));

      const resultado = await service.liberar(clinicaUser, 'pag-1');

      expect(resultado.status).toBe(PagamentoStatus.LIBERADO_PENDENTE);
      expect(notificacoes.criar).toHaveBeenCalledWith(
        'prof-user-1',
        expect.anything(),
        expect.stringContaining('Configure onde receber'),
      );
    });

    it('libera de verdade quando a conta de recebimento está aprovada', async () => {
      const pagamento = pagamentoFixture({ status: PagamentoStatus.RETIDO });
      prisma.pagamento.findUnique.mockResolvedValue(pagamento);
      prisma.contaRecebimento.findUnique.mockResolvedValue({ status: ContaRecebimentoStatus.APROVADA });
      prisma.pagamento.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
        ...pagamento,
        ...data,
      }));

      const resultado = await service.liberar(clinicaUser, 'pag-1');

      expect(resultado.status).toBe(PagamentoStatus.LIBERADO);
    });
  });

  describe('naoCompareceu', () => {
    it('bloqueia antes do plantão terminar', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      const base = pagamentoFixture({ status: PagamentoStatus.RETIDO });
      prisma.pagamento.findUnique.mockResolvedValue({
        ...base,
        vaga: { ...(base as any).vaga, data: amanha },
      });

      await expect(service.naoCompareceu(clinicaUser, 'pag-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('reembolsa e fecha a vaga depois que o plantão termina', async () => {
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      const base = pagamentoFixture({ status: PagamentoStatus.RETIDO });
      const pagamento = { ...base, vaga: { ...(base as any).vaga, data: ontem } };
      prisma.pagamento.findUnique.mockResolvedValue(pagamento);
      prisma.pagamento.update.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
        ...pagamento,
        ...data,
      }));

      const resultado = await service.naoCompareceu(clinicaUser, 'pag-1');

      expect(resultado.status).toBe(PagamentoStatus.REEMBOLSADO);
      expect(prisma.vaga.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'vaga-1' } }),
      );
    });
  });
});
