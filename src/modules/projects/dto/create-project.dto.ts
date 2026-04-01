import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @Transform(({ value }: { value: unknown }) =>
    normalizeCreateProjectDescription(value),
  )
  @ValidateIf(
    (_object: CreateProjectDto, value: unknown) => value !== undefined,
  )
  @IsString()
  @MaxLength(2000)
  description?: string;
}

function normalizeCreateProjectDescription(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}
