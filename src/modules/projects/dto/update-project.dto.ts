import { ApiHideProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProjectDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @ValidateIf(
    (_object: UpdateProjectDto, value: unknown) => value !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @Transform(({ value }: { value: unknown }) =>
    normalizeUpdateProjectDescription(value),
  )
  @ValidateIf(
    (_object: UpdateProjectDto, value: unknown) => value !== undefined,
  )
  @ValidateIf((_object: UpdateProjectDto, value: unknown) => value !== null)
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ValidateIf(
    (object: UpdateProjectDto) =>
      object.name === undefined && object.description === undefined,
  )
  @ApiHideProperty()
  @IsDefined({
    message: 'At least one of name or description must be provided',
  })
  private readonly atLeastOneField?: never;
}

function normalizeUpdateProjectDescription(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}
