import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateProfissionalDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @IsOptional()
  @IsString()
  especialidade?: string;

  @IsOptional()
  @IsString()
  areaAtuacao?: string;

  @IsOptional()
  @IsString()
  regioesAtendimento?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;

  @IsOptional()
  @IsString()
  fotoUrl?: string;

  @IsOptional()
  @IsString()
  curriculoUrl?: string | null;
}
