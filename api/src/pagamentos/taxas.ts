// Taxas cobradas hoje — únicas fontes de verdade, pra não duplicar o número em
// mais de um lugar. valorLiquido/taxa/valorBruto (comissão da ConectVet) são
// calculados em candidaturas.service.ts (aceitar). taxaGateway só existe depois
// que a clínica escolhe Pix/Cartão (pagamentos.service.ts, cobrar).

/** Comissão da ConectVet sobre o valor do plantão. */
export const TAXA_PLATAFORMA = 0.05;

/** Taxa fixa do Asaas por cobrança Pix paga (fora do período promocional dos 3 primeiros meses). */
export const TAXA_GATEWAY_PIX = 1.99;

/** Taxa do Asaas por cobrança de cartão paga: percentual + fixa, sobre o valorBruto (valor + taxa ConectVet). */
export const TAXA_GATEWAY_CARTAO_PERCENTUAL = 0.0299;
export const TAXA_GATEWAY_CARTAO_FIXA = 0.49;

export function calcularTaxaGateway(formaPagamento: 'PIX' | 'CARTAO', valorBruto: number): number {
  if (formaPagamento === 'PIX') return TAXA_GATEWAY_PIX;
  return Number((valorBruto * TAXA_GATEWAY_CARTAO_PERCENTUAL + TAXA_GATEWAY_CARTAO_FIXA).toFixed(2));
}
