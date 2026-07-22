import { Module } from '@nestjs/common';
import { PagamentosService } from './pagamentos.service';
import { PagamentosController } from './pagamentos.controller';

@Module({
  controllers: [PagamentosController],
  providers: [PagamentosService],
})
export class PagamentosModule {}
