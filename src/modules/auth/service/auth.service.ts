import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { RefreshToken, User } from '@prisma/client';
import bcrypt from 'bcrypt';
import {
  createConflictException,
  createUnauthenticatedException,
} from '../../../common/utils/api-exception.util';
import { PrismaService } from '../../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';
import { mapUserToAuthUserResponse } from '../mapper/auth.mapper';
import { getAuthRuntimeConfig } from '../../../config/runtime-config';
import type {
  AuthUserResponse,
  CurrentUserResponse,
  LoginResult,
  LogoutResponse,
  RefreshResult,
  SignupResult,
} from '../types/auth-response.type';
import type { LoginDto } from '../dto/login.dto';
import type { SignupDto } from '../dto/signup.dto';

type AuthTokenPayload = {
  sub: string;
  email: string;
  role: User['role'];
};

type TokenSubject = Pick<User, 'id' | 'email' | 'role'>;

type TokenBundle = {
  accessToken: string;
  refreshToken: string;
  refreshTokenHash: string;
  refreshTokenExpiresAt: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto): Promise<SignupResult> {
    const passwordHash = await bcrypt.hash(signupDto.password, 12);
    const newUserId = randomUUID();
    const tokenBundle = await this.issueTokenBundle({
      id: newUserId,
      email: signupDto.email,
      role: 'MEMBER',
    });

    try {
      const user = await this.prismaService.user.create({
        data: {
          id: newUserId,
          name: signupDto.name,
          email: signupDto.email,
          passwordHash,
          role: 'MEMBER',
          refreshTokens: {
            create: {
              tokenHash: tokenBundle.refreshTokenHash,
              expiresAt: tokenBundle.refreshTokenExpiresAt,
            },
          },
        },
      });

      return this.buildAuthSessionResult(user, tokenBundle);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw createConflictException({
          message: 'An account with this email already exists',
          details: {
            email: ['Email is already in use'],
          },
        });
      }

      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<LoginResult> {
    const user = await this.prismaService.user.findUnique({
      where: {
        email: loginDto.email,
      },
    });

    if (!user) {
      throw this.createInvalidCredentialsException();
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw this.createInvalidCredentialsException();
    }

    const tokenBundle = await this.issueTokenBundle(user);

    await this.prismaService.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenBundle.refreshTokenHash,
        expiresAt: tokenBundle.refreshTokenExpiresAt,
      },
    });

    return this.buildAuthSessionResult(user, tokenBundle);
  }

  async refresh(refreshToken: string | null): Promise<RefreshResult> {
    if (!refreshToken) {
      throw this.createInvalidRefreshTokenException();
    }

    const refreshTokenPayload = await this.verifyRefreshToken(refreshToken);
    const user = await this.prismaService.user.findUnique({
      where: {
        id: refreshTokenPayload.sub,
      },
    });

    if (!user) {
      throw this.createInvalidRefreshTokenException();
    }

    const matchedRefreshToken = await this.findMatchingRefreshToken(
      user.id,
      refreshToken,
    );

    if (!matchedRefreshToken) {
      throw this.createInvalidRefreshTokenException();
    }

    const nextTokenBundle = await this.issueTokenBundle(user);

    await this.prismaService.$transaction([
      this.prismaService.refreshToken.update({
        where: {
          id: matchedRefreshToken.id,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
      this.prismaService.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: nextTokenBundle.refreshTokenHash,
          expiresAt: nextTokenBundle.refreshTokenExpiresAt,
        },
      }),
    ]);

    return {
      accessToken: nextTokenBundle.accessToken,
      refreshToken: nextTokenBundle.refreshToken,
      refreshTokenExpiresAt: nextTokenBundle.refreshTokenExpiresAt,
    };
  }

  async logout(refreshToken: string | null): Promise<LogoutResponse> {
    if (refreshToken) {
      const refreshTokenPayload =
        await this.tryVerifyRefreshToken(refreshToken);

      if (refreshTokenPayload?.sub) {
        const matchedRefreshToken = await this.findMatchingRefreshToken(
          refreshTokenPayload.sub,
          refreshToken,
        );

        if (matchedRefreshToken) {
          await this.prismaService.refreshToken.update({
            where: {
              id: matchedRefreshToken.id,
            },
            data: {
              revokedAt: new Date(),
            },
          });
        }
      }
    }

    return {
      loggedOut: true,
    };
  }

  async getCurrentUser(
    accessToken: string | null,
  ): Promise<CurrentUserResponse> {
    const user = await this.authenticateAccessToken(accessToken);

    return {
      user,
    };
  }

  async authenticateAccessToken(
    accessToken: string | null,
  ): Promise<AuthUserResponse> {
    if (!accessToken) {
      throw this.createUnauthenticatedException('Authentication is required');
    }

    const authConfig = getAuthRuntimeConfig(this.configService);

    try {
      const payload = await this.jwtService.verifyAsync<AuthTokenPayload>(
        accessToken,
        {
          secret: authConfig.jwtAccessSecret,
        },
      );

      const user = await this.prismaService.user.findUnique({
        where: {
          id: payload.sub,
        },
      });

      if (!user) {
        throw this.createUnauthenticatedException('Authentication is required');
      }

      return mapUserToAuthUserResponse(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw this.createUnauthenticatedException('Authentication is required');
    }
  }

  private createTokenPayload(user: User): AuthTokenPayload {
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
  }

  private async issueTokenBundle(user: TokenSubject): Promise<TokenBundle> {
    const authConfig = getAuthRuntimeConfig(this.configService);
    const tokenPayload = this.createTokenPayload(user as User);
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

    return {
      accessToken,
      refreshToken,
      refreshTokenHash,
      refreshTokenExpiresAt,
    };
  }

  private buildAuthSessionResult(user: User, tokenBundle: TokenBundle) {
    return {
      user: mapUserToAuthUserResponse(user),
      accessToken: tokenBundle.accessToken,
      refreshToken: tokenBundle.refreshToken,
      refreshTokenExpiresAt: tokenBundle.refreshTokenExpiresAt,
    };
  }

  private async verifyRefreshToken(refreshToken: string) {
    const authConfig = getAuthRuntimeConfig(this.configService);

    try {
      return await this.jwtService.verifyAsync<AuthTokenPayload>(refreshToken, {
        secret: authConfig.jwtRefreshSecret,
      });
    } catch {
      throw this.createInvalidRefreshTokenException();
    }
  }

  private async tryVerifyRefreshToken(refreshToken: string) {
    const authConfig = getAuthRuntimeConfig(this.configService);

    try {
      return await this.jwtService.verifyAsync<AuthTokenPayload>(refreshToken, {
        secret: authConfig.jwtRefreshSecret,
      });
    } catch {
      return null;
    }
  }

  private async findMatchingRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<RefreshToken | null> {
    const activeRefreshTokens = await this.prismaService.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    for (const storedRefreshToken of activeRefreshTokens) {
      const matches = await bcrypt.compare(
        refreshToken,
        storedRefreshToken.tokenHash,
      );

      if (matches) {
        return storedRefreshToken;
      }
    }

    return null;
  }

  private createInvalidCredentialsException() {
    return this.createUnauthenticatedException('Invalid email or password');
  }

  private createInvalidRefreshTokenException() {
    return this.createUnauthenticatedException(
      'Refresh token is missing or invalid',
    );
  }

  private createUnauthenticatedException(message: string) {
    return createUnauthenticatedException({
      message,
    });
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
