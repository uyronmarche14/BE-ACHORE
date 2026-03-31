import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';
import { mapUserToAuthUserResponse } from '../mapper/auth.mapper';
import { getAuthRuntimeConfig } from '../../../config/runtime-config';
import type { SignupResult } from '../types/auth-response.type';
import type { SignupDto } from '../dto/signup.dto';

type AuthTokenPayload = {
  sub: string;
  email: string;
  role: User['role'];
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto): Promise<SignupResult> {
    const authConfig = getAuthRuntimeConfig(this.configService);
    const passwordHash = await bcrypt.hash(signupDto.password, 12);

    try {
      return await this.prismaService.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: {
            name: signupDto.name,
            email: signupDto.email,
            passwordHash,
            role: 'MEMBER',
          },
        });

        const tokenPayload = this.createTokenPayload(user);
        const [accessToken, refreshToken] = await Promise.all([
          this.jwtService.signAsync(tokenPayload, {
            secret: authConfig.jwtAccessSecret,
            expiresIn: authConfig.jwtAccessTtl,
          }),
          this.jwtService.signAsync(tokenPayload, {
            secret: authConfig.jwtRefreshSecret,
            expiresIn: authConfig.jwtRefreshTtl,
          }),
        ]);

        const refreshTokenExpiresAt = new Date(
          Date.now() + ms(authConfig.jwtRefreshTtl),
        );
        const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

        await transaction.refreshToken.create({
          data: {
            userId: user.id,
            tokenHash: refreshTokenHash,
            expiresAt: refreshTokenExpiresAt,
          },
        });

        return {
          user: mapUserToAuthUserResponse(user),
          accessToken,
          refreshToken,
          refreshTokenExpiresAt,
        };
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'An account with this email already exists',
          details: {
            email: ['Email is already in use'],
          },
        });
      }

      throw error;
    }
  }

  private createTokenPayload(user: User): AuthTokenPayload {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
  }
}

function isPrismaUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}
