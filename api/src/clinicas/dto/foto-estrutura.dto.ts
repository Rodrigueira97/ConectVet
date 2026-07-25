import { IsOptional, IsString } from 'class-validator';

export class FotoEstruturaDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  descricao?: string;
}
