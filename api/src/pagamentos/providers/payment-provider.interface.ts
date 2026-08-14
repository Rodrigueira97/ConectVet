// Interface que isola o resto do backend de qual gateway está por trás —
// trocar por um provider real (Asaas etc.) não deve exigir mexer em
// pagamentos.service.ts, só trocar o provider injetado no módulo.

export type FormaPagamentoGateway = 'PIX' | 'CARTAO';

export interface CobrarInput {
  pagamentoId: string;
  formaPagamento: FormaPagamentoGateway;
  valorBruto: number;
}

export interface CobrarResultado {
  /** Taxa cobrada pelo gateway nessa cobrança específica. */
  taxaGateway: number;
}

export interface EstornarInput {
  pagamentoId: string;
  valor: number;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface PaymentProvider {
  /**
   * "Envia" a cobrança pro gateway. No provider fake isso só calcula a taxa e
   * retorna na hora — o resultado (aprovado/recusado) é decidido depois, à mão,
   * via PagamentosService.simular(). Num provider real isso dispararia a cobrança
   * de verdade e o resultado chegaria por webhook.
   */
  cobrar(input: CobrarInput): Promise<CobrarResultado>;

  /** Estorna uma cobrança já aprovada. Fake: sempre "funciona". */
  estornar(input: EstornarInput): Promise<{ ok: true }>;
}
