import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class ResendVerificationDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(190)
  email!: string;

  @Transform(({ value }: { value: unknown }) => normalizeRedirectPath(value))
  @ValidateIf(
    (_object: ResendVerificationDto, value: unknown) => value !== undefined,
  )
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Matches(/^\/(?!\/).*/, {
    message: 'redirectPath must start with a single /',
  })
  redirectPath?: string;
}

function normalizeRedirectPath(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : undefined;
}
