import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateClinicaDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  inscricaoEstadual?: string;

  @IsOptional()
  @IsString()
  responsavelTecnico?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @IsString()
  rua?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fotosEstrutura?: string[];

  @IsOptional()
  @IsString()
  planosSaude?: string;

  @IsOptional()
  @IsString()
  sistemas?: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
