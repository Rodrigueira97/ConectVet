import { IsEnum, IsString, MinLength } from 'class-validator';
import { TipoChavePix } from '../../../generated/prisma/enums';

export class UpsertContaRecebimentoDto {
  @IsEnum(TipoChavePix)
  tipoChavePix: TipoChavePix;

  @IsString()
  @MinLength(3)
  chavePix: string;
}
