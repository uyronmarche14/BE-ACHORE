import { ApiHideProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateTaskDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title?: string;

  @Transform(({ value }: { value: unknown }) =>
    normalizeNullableTaskDescription(value),
  )
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== undefined)
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== null)
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @Transform(({ value }: { value: unknown }) =>
    normalizeNullableTaskAssigneeId(value),
  )
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== undefined)
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== null)
  @IsString()
  @IsNotEmpty()
  assigneeId?: string | null;

  @Transform(({ value }: { value: unknown }) =>
    normalizeNullableTaskDueDate(value),
  )
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== undefined)
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== null)
  @IsDateString()
  dueDate?: string | null;

  @ValidateIf(
    (object: UpdateTaskDto) =>
      object.title === undefined &&
      object.description === undefined &&
      object.assigneeId === undefined &&
      object.dueDate === undefined,
  )
  @ApiHideProperty()
  @IsDefined({
    message:
      'At least one of title, description, assigneeId, or dueDate must be provided',
  })
  private readonly atLeastOneField?: never;
}

function normalizeNullableTaskDescription(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeNullableTaskAssigneeId(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeNullableTaskDueDate(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}
