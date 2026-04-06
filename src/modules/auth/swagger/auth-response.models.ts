import { AppRole } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class SwaggerAuthUserDto {
  @ApiProperty({
    example: 'user_2bdb3b8d-8a3d-4354-b18f-9497b9a6ec82',
  })
  id!: string;

  @ApiProperty({
    example: 'Jane Doe',
  })
  name!: string;

  @ApiProperty({
    example: 'jane@example.com',
  })
  email!: string;

  @ApiProperty({
    enum: AppRole,
    example: AppRole.MEMBER,
  })
  role!: AppRole;

  @ApiProperty({
    nullable: true,
    format: 'date-time',
    example: '2026-04-03T09:15:23.000Z',
  })
  emailVerifiedAt!: string | null;
}

export class SwaggerAuthSessionResponseDto {
  @ApiProperty({
    type: () => SwaggerAuthUserDto,
  })
  user!: SwaggerAuthUserDto;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access-token',
  })
  accessToken!: string;
}

export class SwaggerSignupResponseDto {
  @ApiProperty({
    example: 'Account created successfully. You can log in now.',
  })
  message!: string;

  @ApiProperty({
    example: 'jane@example.com',
  })
  email!: string;

  @ApiProperty({
    example: false,
    description:
      'Whether the account still needs an email verification step before login.',
  })
  emailVerificationRequired!: boolean;
}

export class SwaggerRefreshAccessTokenResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access-token',
  })
  accessToken!: string;
}

export class SwaggerCurrentUserResponseDto {
  @ApiProperty({
    type: () => SwaggerAuthUserDto,
  })
  user!: SwaggerAuthUserDto;
}

export class SwaggerLogoutResponseDto {
  @ApiProperty({
    enum: [true],
    example: true,
  })
  loggedOut!: true;
}

export class SwaggerVerifyEmailConfirmResponseDto {
  @ApiProperty({
    enum: [true],
    example: true,
  })
  verified!: true;

  @ApiProperty({
    example: 'jane@example.com',
  })
  email!: string;

  @ApiProperty({
    nullable: true,
    example: '/login',
  })
  redirectPath!: string | null;
}

export class SwaggerResendVerificationResponseDto {
  @ApiProperty({
    example: 'If the account needs verification, a new email is on the way.',
  })
  message!: string;
}
