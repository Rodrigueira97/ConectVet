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
  areaAtuacao?: string;

  @IsOptional()
  @IsString()
  planoSaude?: string;

  @IsOptional()
  @IsString()
  regioesAtendimento?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
