import { MinLength } from 'class-validator';

export class AlterarSenhaDto {
  @MinLength(4)
  senhaAtual: string;

  @MinLength(4)
  novaSenha: string;
}
