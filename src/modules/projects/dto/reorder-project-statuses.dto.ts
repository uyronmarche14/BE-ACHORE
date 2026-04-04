import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';

class ProjectStatusOrderItemDto {
  @IsString()
  @IsNotEmpty()
  id!: string;
}

export class ReorderProjectStatusesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProjectStatusOrderItemDto)
  statuses!: ProjectStatusOrderItemDto[];
}
