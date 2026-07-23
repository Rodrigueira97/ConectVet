import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Categoria } from '../../../generated/prisma/enums';

export class RegisterProfissionalDto {
  @IsEmail()
  email: string;

  @MinLength(4)
  senha: string;

  @IsString()
  nome: string;

  @IsString()
  documento: string;

  @IsEnum(Categoria)
  funcao: Categoria;

  @IsString()
  telefone: string;

  @IsDateString()
  dataNascimento: string;

  @IsString()
  tipoComprovacao: string;

  @IsString()
  comprovanteUrl: string;

  @IsArray()
  @IsString({ each: true })
  idDocUrls: string[];

  @IsString()
  curriculoUrl: string;

  @IsString()
  areaAtuacao: string;

  @IsOptional()
  @IsString()
  planoSaude?: string;

  @IsString()
  regioesAtendimento: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
