import { Module } from '@nestjs/common';
import { ClinicasService } from './clinicas.service';
import { ClinicasController } from './clinicas.controller';
import { UploadsModule } from '../uploads/uploads.module';
import { AvaliacoesModule } from '../avaliacoes/avaliacoes.module';

@Module({
  imports: [UploadsModule, AvaliacoesModule],
  controllers: [ClinicasController],
  providers: [ClinicasService],
  exports: [ClinicasService],
})
export class ClinicasModule {}
