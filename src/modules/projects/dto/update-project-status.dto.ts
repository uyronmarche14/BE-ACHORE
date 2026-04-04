import { ProjectStatusColor } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiHideProperty } from '@nestjs/swagger';

export class UpdateProjectStatusDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @ValidateIf(
    (_object: UpdateProjectStatusDto, value: unknown) => value !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @IsOptional()
  @IsEnum(ProjectStatusColor)
  color?: ProjectStatusColor;

  @ValidateIf(
    (object: UpdateProjectStatusDto) =>
      object.name === undefined &&
      object.isClosed === undefined &&
      object.color === undefined,
  )
  @ApiHideProperty()
  @IsDefined({
    message: 'At least one of name, isClosed, or color must be provided',
  })
  private readonly atLeastOneField?: never;
}
