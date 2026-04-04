import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import {
  normalizeOptionalTaskLongText,
  TaskChecklistItemInputDto,
  TaskLinkInputDto,
} from './task-detail-input.dto';

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

  @Transform(({ value }: { value: unknown }) =>
    normalizeOptionalTaskLongText(value),
  )
  @ValidateIf((_object: CreateTaskDto, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(5000)
  acceptanceCriteria?: string;

  @Transform(({ value }: { value: unknown }) =>
    normalizeOptionalTaskLongText(value),
  )
  @ValidateIf((_object: CreateTaskDto, value: unknown) => value !== undefined)
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ValidateIf((_object: CreateTaskDto, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  statusId?: string;

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

  @Transform(({ value }: { value: unknown }) =>
    normalizeCreateTaskParentTaskId(value),
  )
  @ValidateIf((_object: CreateTaskDto, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  parentTaskId?: string;

  @ValidateIf((_object: CreateTaskDto, value: unknown) => value !== undefined)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskLinkInputDto)
  links?: TaskLinkInputDto[];

  @ValidateIf((_object: CreateTaskDto, value: unknown) => value !== undefined)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskChecklistItemInputDto)
  checklistItems?: TaskChecklistItemInputDto[];
}

function normalizeCreateTaskDescription(value: unknown) {
  return normalizeOptionalTaskLongText(value);
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

function normalizeCreateTaskParentTaskId(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}
