import { Module } from '@nestjs/common';
import { FavoritosService } from './favoritos.service';
import { FavoritosController } from './favoritos.controller';
import { AvaliacoesModule } from '../avaliacoes/avaliacoes.module';

@Module({
  imports: [AvaliacoesModule],
  controllers: [FavoritosController],
  providers: [FavoritosService],
  exports: [FavoritosService],
})
export class FavoritosModule {}
