import { Test } from '@nestjs/testing';
import { CandidaturasService } from './candidaturas.service';
import { PrismaService } from '../prisma/prisma.service';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import {
  CandidaturaStatus,
  MotivoReembolso,
  PagamentoStatus,
} from '../../generated/prisma/enums';

describe('CandidaturasService — desistir', () => {
  let service: CandidaturasService;
  let prisma: any;

  function amanha() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }

  function candidaturaFixture(overrides: Record<string, unknown> = {}) {
    return {
      id: 'cand-1',
      profissionalId: 'prof-1',
      status: CandidaturaStatus.ACEITO,
      vagaId: 'vaga-1',
      vaga: {
        id: 'vaga-1',
        data: amanha(),
        horaInicio: '08:00',
        clinica: { userId: 'clinica-user-1', nome: 'Clínica Teste' },
      },
      ...overrides,
    };
  }

  beforeEach(async () => {
    prisma = {
      profissional: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'prof-1', nome: 'Fulano' }),
      },
      candidatura: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      pagamento: { findUnique: jest.fn(), update: jest.fn() },
      vaga: { update: jest.fn() },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };

    const module = await Test.createTestingModule({
      providers: [
        CandidaturasService,
        { provide: PrismaService, useValue: prisma },
        { provide: AvaliacoesService, useValue: {} },
        { provide: NotificacoesService, useValue: { criar: jest.fn() } },
      ],
    }).compile();

    service = module.get(CandidaturasService);
  });

  it('reembolsa (mantém o registro) quando o pagamento já estava retido', async () => {
    prisma.candidatura.findUnique.mockResolvedValue(candidaturaFixture());
    prisma.pagamento.findUnique.mockResolvedValue({ status: PagamentoStatus.RETIDO });

    await service.desistir('user-prof-1', 'cand-1');

    expect(prisma.pagamento.update).toHaveBeenCalledWith({
      where: { candidaturaId: 'cand-1' },
      data: expect.objectContaining({
        status: PagamentoStatus.REEMBOLSADO,
        motivoReembolso: MotivoReembolso.DESISTENCIA,
      }),
    });
  });

  it('só cancela (sem reembolso) quando ainda não tinha sido cobrado', async () => {
    prisma.candidatura.findUnique.mockResolvedValue(candidaturaFixture());
    prisma.pagamento.findUnique.mockResolvedValue({ status: PagamentoStatus.AGUARDANDO_COBRANCA });

    await service.desistir('user-prof-1', 'cand-1');

    expect(prisma.pagamento.update).toHaveBeenCalledWith({
      where: { candidaturaId: 'cand-1' },
      data: { status: PagamentoStatus.CANCELADO },
    });
  });

  it('reabre a vaga em qualquer um dos dois casos', async () => {
    prisma.candidatura.findUnique.mockResolvedValue(candidaturaFixture());
    prisma.pagamento.findUnique.mockResolvedValue({ status: PagamentoStatus.RETIDO });

    await service.desistir('user-prof-1', 'cand-1');

    expect(prisma.vaga.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'vaga-1' } }),
    );
  });
});
