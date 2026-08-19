import { Module } from '@nestjs/common';
import { VagasService } from './vagas.service';
import { VagasController } from './vagas.controller';
import { AvaliacoesModule } from '../avaliacoes/avaliacoes.module';
import { PagamentosModule } from '../pagamentos/pagamentos.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
  imports: [AvaliacoesModule, PagamentosModule, NotificacoesModule],
  controllers: [VagasController],
  providers: [VagasService],
  exports: [VagasService],
})
export class VagasModule {}
