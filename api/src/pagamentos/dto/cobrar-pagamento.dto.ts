import { IsEnum } from 'class-validator';
import { FormaPagamento } from '../../../generated/prisma/enums';

export class CobrarPagamentoDto {
  @IsEnum(FormaPagamento)
  formaPagamento: FormaPagamento;
}
