import { IsString } from 'class-validator';

export class CreateCandidaturaDto {
  @IsString()
  vagaId: string;
}
