import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
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

  @IsOptional()
  @IsString()
  especialidade?: string;

  // Obrigatório só para VETERINARIO_CLINICO e VETERINARIO_ESPECIALISTA —
  // estagiário e auxiliar não têm registro no conselho.
  @ValidateIf(
    (o: RegisterProfissionalDto) =>
      o.funcao === Categoria.VETERINARIO_CLINICO ||
      o.funcao === Categoria.VETERINARIO_ESPECIALISTA,
  )
  @IsString()
  @IsNotEmpty()
  crmv?: string;

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

  @IsOptional()
  @IsString()
  curriculoUrl?: string;

  @IsOptional()
  @IsString()
  fotoUrl?: string;

  @IsOptional()
  @IsString()
  areaAtuacao?: string;

  @IsString()
  regioesAtendimento: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
