import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FotoEstruturaDto } from '../../clinicas/dto/foto-estrutura.dto';

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
  responsavelTecnicoNome: string;

  @IsString()
  responsavelTecnicoCrmv: string;

  @IsString()
  telefone: string;

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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => FotoEstruturaDto)
  fotosEstrutura?: FotoEstruturaDto[];

  @IsOptional()
  @IsString()
  logoUrl?: string;

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
