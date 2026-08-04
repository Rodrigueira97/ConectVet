import { IsEmail } from 'class-validator';

export class ReenviarConfirmacaoDto {
  @IsEmail()
  email: string;
}
