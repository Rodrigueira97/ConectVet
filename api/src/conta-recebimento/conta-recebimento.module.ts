import { Module } from '@nestjs/common';
import { ContaRecebimentoService } from './conta-recebimento.service';
import { ContaRecebimentoController } from './conta-recebimento.controller';
import { PagamentosModule } from '../pagamentos/pagamentos.module';

@Module({
  imports: [PagamentosModule],
  controllers: [ContaRecebimentoController],
  providers: [ContaRecebimentoService],
})
export class ContaRecebimentoModule {}
