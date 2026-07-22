import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterClinicaDto {
  @IsEmail()
  email: string;

  @MinLength(4)
  senha: string;

  @IsString()
  nome: string;

  @IsString()
  cnpj: string;

  @IsString()
  inscricaoEstadual: string;

  @IsString()
  responsavelTecnico: string;

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

  @IsString()
  alvaraUrl: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  fotosEstrutura: string[];

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
