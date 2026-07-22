import {
  IsDateString,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { Categoria } from '../../../generated/prisma/enums';

export class CreateVagaDto {
  @IsEnum(Categoria)
  categoria: Categoria;

  @IsOptional()
  @IsString()
  cep?: string;

  @IsString()
  estado: string;

  @IsString()
  cidade: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsString()
  rua: string;

  @IsString()
  numero: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsDateString()
  data: string;

  @IsString()
  horaInicio: string;

  @IsString()
  horaFim: string;

  @IsNumberString()
  valor: string;

  @IsOptional()
  @IsString()
  descricao?: string;
}
