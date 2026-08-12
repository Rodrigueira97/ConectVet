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
  crmv?: string;

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

  // Reenvio da carteirinha/comprovante quando o link salvo no cadastro
  // ficou indisponível (ex.: documento enviado antes da migração pro R2).
  @IsOptional()
  @IsString()
  comprovanteUrl?: string;
}
