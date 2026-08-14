import { IsIn, IsOptional, IsString } from 'class-validator';

export class SimularPagamentoDto {
  @IsIn(['aprovado', 'recusado'])
  resultado: 'aprovado' | 'recusado';

  @IsOptional()
  @IsString()
  motivo?: string;
}
