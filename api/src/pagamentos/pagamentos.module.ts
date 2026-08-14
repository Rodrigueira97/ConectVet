import { Module } from '@nestjs/common';
import { PagamentosService } from './pagamentos.service';
import { PagamentosController } from './pagamentos.controller';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { PAYMENT_PROVIDER } from './providers/payment-provider.interface';
import { FakePaymentProvider } from './providers/fake-payment.provider';

@Module({
  imports: [NotificacoesModule],
  controllers: [PagamentosController],
  providers: [
    PagamentosService,
    // Único ponto que sabe que o gateway é fake — trocar por um provider real
    // (Asaas etc.) é só trocar essa linha, o resto do módulo não muda.
    { provide: PAYMENT_PROVIDER, useClass: FakePaymentProvider },
  ],
  exports: [PagamentosService],
})
export class PagamentosModule {}
