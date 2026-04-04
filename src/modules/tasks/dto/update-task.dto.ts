import { ApiHideProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsDefined,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import {
  normalizeNullableTaskLongText,
  TaskChecklistItemInputDto,
  TaskLinkInputDto,
} from './task-detail-input.dto';

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
    normalizeNullableTaskLongText(value),
  )
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== undefined)
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== null)
  @IsString()
  @MaxLength(5000)
  acceptanceCriteria?: string | null;

  @Transform(({ value }: { value: unknown }) =>
    normalizeNullableTaskLongText(value),
  )
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== undefined)
  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== null)
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

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

  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== undefined)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskLinkInputDto)
  links?: TaskLinkInputDto[];

  @ValidateIf((_object: UpdateTaskDto, value: unknown) => value !== undefined)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaskChecklistItemInputDto)
  checklistItems?: TaskChecklistItemInputDto[];

  @ValidateIf(
    (object: UpdateTaskDto) =>
      object.title === undefined &&
      object.description === undefined &&
      object.acceptanceCriteria === undefined &&
      object.notes === undefined &&
      object.assigneeId === undefined &&
      object.dueDate === undefined &&
      object.links === undefined &&
      object.checklistItems === undefined,
  )
  @ApiHideProperty()
  @IsDefined({
    message: 'At least one mutable task field must be provided',
  })
  private readonly atLeastOneField?: never;
}

function normalizeNullableTaskDescription(value: unknown) {
  return normalizeNullableTaskLongText(value);
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
