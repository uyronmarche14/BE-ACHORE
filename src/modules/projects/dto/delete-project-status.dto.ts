import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteProjectStatusDto {
  @IsString()
  @IsNotEmpty()
  moveToStatusId!: string;
}
