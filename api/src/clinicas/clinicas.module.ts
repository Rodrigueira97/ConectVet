import { Module } from '@nestjs/common';
import { ClinicasService } from './clinicas.service';
import { ClinicasController } from './clinicas.controller';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [UploadsModule],
  controllers: [ClinicasController],
  providers: [ClinicasService],
  exports: [ClinicasService],
})
export class ClinicasModule {}
