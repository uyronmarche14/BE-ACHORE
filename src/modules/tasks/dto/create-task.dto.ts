import { TaskStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateTaskDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title!: string;

  @Transform(({ value }: { value: unknown }) =>
    normalizeCreateTaskDescription(value),
  )
  @ValidateIf((_object: CreateTaskDto, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ValidateIf((_object: CreateTaskDto, value: unknown) => value !== undefined)
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @Transform(({ value }: { value: unknown }) =>
    normalizeCreateTaskAssigneeId(value),
  )
  @ValidateIf((_object: CreateTaskDto, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  assigneeId?: string;

  @Transform(({ value }: { value: unknown }) =>
    normalizeCreateTaskDueDate(value),
  )
  @ValidateIf((_object: CreateTaskDto, value: unknown) => value !== undefined)
  @IsDateString()
  dueDate?: string;
}

function normalizeCreateTaskDescription(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function normalizeCreateTaskAssigneeId(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function normalizeCreateTaskDueDate(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}
