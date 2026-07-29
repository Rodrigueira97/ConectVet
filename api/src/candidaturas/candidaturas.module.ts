import { Module } from '@nestjs/common';
import { CandidaturasService } from './candidaturas.service';
import { CandidaturasController } from './candidaturas.controller';
import { AvaliacoesModule } from '../avaliacoes/avaliacoes.module';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
  imports: [AvaliacoesModule, NotificacoesModule],
  controllers: [CandidaturasController],
  providers: [CandidaturasService],
  exports: [CandidaturasService],
})
export class CandidaturasModule {}
