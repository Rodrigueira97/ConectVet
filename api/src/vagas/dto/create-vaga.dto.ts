import {
  IsArray,
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

  // IDs de profissionais favoritos (da categoria desta vaga) pra notificar assim que
  // ela for publicada — ver VagasService#criar. Opcional, nunca bloqueia a publicação.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  convidarFavoritos?: string[];
}
