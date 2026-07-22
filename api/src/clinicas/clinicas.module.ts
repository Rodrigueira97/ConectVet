import { Module } from '@nestjs/common';
import { ClinicasService } from './clinicas.service';
import { ClinicasController } from './clinicas.controller';

@Module({
  controllers: [ClinicasController],
  providers: [ClinicasService],
  exports: [ClinicasService],
})
export class ClinicasModule {}
