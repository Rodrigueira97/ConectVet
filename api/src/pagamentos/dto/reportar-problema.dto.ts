import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportarProblemaDto {
  @IsString()
  @MaxLength(80)
  motivo: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descricao?: string;
}
