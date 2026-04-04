import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class TaskLinkInputDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  label!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  @IsUrl({
    require_protocol: true,
  })
  url!: string;
}

export class TaskChecklistItemInputDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label!: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}

export function normalizeOptionalTaskLongText(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

export function normalizeNullableTaskLongText(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

export function taskDetailArrayValidators() {
  return {
    isArray: IsArray(),
    nested: ValidateNested({ each: true }),
  };
}

export function taskLinkArrayType() {
  return Type(() => TaskLinkInputDto);
}

export function taskChecklistArrayType() {
  return Type(() => TaskChecklistItemInputDto);
}
