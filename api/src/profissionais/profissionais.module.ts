import { Module } from '@nestjs/common';
import { ProfissionaisService } from './profissionais.service';
import { ProfissionaisController } from './profissionais.controller';
import { UploadsModule } from '../uploads/uploads.module';
import { AvaliacoesModule } from '../avaliacoes/avaliacoes.module';

@Module({
  imports: [UploadsModule, AvaliacoesModule],
  controllers: [ProfissionaisController],
  providers: [ProfissionaisService],
  exports: [ProfissionaisService],
})
export class ProfissionaisModule {}
