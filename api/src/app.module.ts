import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClinicasModule } from './clinicas/clinicas.module';
import { ProfissionaisModule } from './profissionais/profissionais.module';
import { VagasModule } from './vagas/vagas.module';
import { CandidaturasModule } from './candidaturas/candidaturas.module';
import { PagamentosModule } from './pagamentos/pagamentos.module';
import { AvaliacoesModule } from './avaliacoes/avaliacoes.module';
import { UploadsModule } from './uploads/uploads.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { ContaRecebimentoModule } from './conta-recebimento/conta-recebimento.module';
import { FavoritosModule } from './favoritos/favoritos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ClinicasModule,
    ProfissionaisModule,
    VagasModule,
    CandidaturasModule,
    PagamentosModule,
    AvaliacoesModule,
    UploadsModule,
    NotificacoesModule,
    ContaRecebimentoModule,
    FavoritosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
