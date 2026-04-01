import { Transform, Type } from 'class-transformer';
import { TaskStatus } from '@prisma/client';
import { IsEnum, IsInt, Min, ValidateIf } from 'class-validator';

export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus)
  status!: TaskStatus;

  @Transform(({ value }: { value: unknown }) =>
    normalizeNullableTaskPosition(value),
  )
  @Type(() => Number)
  @ValidateIf(
    (_object: UpdateTaskStatusDto, value: unknown) => value !== undefined,
  )
  @ValidateIf((_object: UpdateTaskStatusDto, value: unknown) => value !== null)
  @IsInt()
  @Min(1)
  position?: number | null;
}

function normalizeNullableTaskPosition(value: unknown) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim();

    return normalizedValue.length > 0 ? normalizedValue : value;
  }

  return value;
}
