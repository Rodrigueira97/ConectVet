import { Injectable } from '@nestjs/common';
import {
  CobrarInput,
  CobrarResultado,
  EstornarInput,
  PaymentProvider,
} from './payment-provider.interface';
import { calcularTaxaGateway } from '../taxas';

// Provider fake: nenhuma chamada de rede, resolve na hora. Serve pra testar o
// fluxo inteiro (Pix/Cartão, aprovação/recusa, reembolso) sem gateway real
// plugado ainda. Ver checklist do protótipo de pagamento — esse é exatamente
// o passo intermediário recomendado lá antes de integrar o Asaas de verdade.
@Injectable()
export class FakePaymentProvider implements PaymentProvider {
  async cobrar({ formaPagamento, valorBruto }: CobrarInput): Promise<CobrarResultado> {
    return { taxaGateway: calcularTaxaGateway(formaPagamento, valorBruto) };
  }

  async estornar(_input: EstornarInput): Promise<{ ok: true }> {
    return { ok: true };
  }
}
