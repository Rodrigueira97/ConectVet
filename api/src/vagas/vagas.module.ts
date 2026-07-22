import { Module } from '@nestjs/common';
import { VagasService } from './vagas.service';
import { VagasController } from './vagas.controller';

@Module({
  controllers: [VagasController],
  providers: [VagasService],
  exports: [VagasService],
})
export class VagasModule {}
