import { IsString, Length } from 'class-validator';

export class CheckInDto {
  @IsString()
  @Length(4, 4)
  codigo: string;
}
