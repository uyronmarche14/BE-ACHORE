import { randomUUID } from 'node:crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { RefreshToken, User } from '@prisma/client';
import bcrypt from 'bcrypt';
import ms from 'ms';
import {
  createConflictException,
  createForbiddenException,
  createNotFoundException,
  createUnauthenticatedException,
} from '../../../common/utils/api-exception.util';
import {
  generateOpaqueToken,
  hashOpaqueToken,
} from '../../../common/utils/opaque-token.util';
import { getAuthRuntimeConfig } from '../../../config/runtime-config';
import { PrismaService } from '../../../database/prisma.service';
import { MailService } from '../../mail/service/mail.service';
import { buildVerificationEmailTemplate } from '../../mail/templates/verification-email.template';
import type { LoginDto } from '../dto/login.dto';
import type { ResendVerificationDto } from '../dto/resend-verification.dto';
import type { SignupDto } from '../dto/signup.dto';
import type { VerifyEmailConfirmDto } from '../dto/verify-email-confirm.dto';
import { mapUserToAuthUserResponse } from '../mapper/auth.mapper';
import type {
  AuthUserResponse,
  CurrentUserResponse,
  LoginResult,
  LogoutResponse,
  RefreshResult,
  ResendVerificationResult,
  SignupResult,
  VerifyEmailConfirmResult,
} from '../types/auth-response.type';

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

const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async signup(signupDto: SignupDto): Promise<SignupResult> {
    const signupStartedAt = Date.now();
    const passwordHash = await bcrypt.hash(signupDto.password, 12);
    const newUserId = randomUUID();
    const emailVerificationRequired = this.isEmailVerificationRequired();

    try {
      const user = await this.prismaService.user.create({
        data: {
          id: newUserId,
          name: signupDto.name,
          email: signupDto.email,
          passwordHash,
          role: 'MEMBER',
          emailVerifiedAt: emailVerificationRequired ? null : new Date(),
        },
      });
      this.logger.log(
        emailVerificationRequired
          ? `Created signup candidate ${user.id} for ${user.email}; preparing verification email.`
          : `Created signup account ${user.id} for ${user.email} with verification bypass enabled.`,
      );

      if (!emailVerificationRequired) {
        this.logger.log(
          `Signup flow for ${user.email} completed in ${Date.now() - signupStartedAt}ms.`,
        );

        return {
          message: 'Account created successfully. You can log in now.',
          email: user.email,
          emailVerificationRequired: false,
        };
      }

      try {
        await this.createAndSendVerificationToken(user, signupDto.redirectPath);
      } catch (error) {
        this.logger.error(
          `Verification email setup failed for user ${user.id} (${user.email}) after ${Date.now() - signupStartedAt}ms. Rolling back the account.`,
          error instanceof Error ? error.stack : undefined,
        );
        // Do not leave behind an account that can never finish signup because the
        // verification mail step failed after the user record was created.
        await this.prismaService.user
          .delete({
            where: {
              id: user.id,
            },
          })
          .catch((cleanupError: unknown) => {
            this.logger.error(
              `Failed to roll back user ${user.id} after verification mail setup error.`,
              cleanupError instanceof Error ? cleanupError.stack : undefined,
            );
          });

        throw error;
      }

      this.logger.log(
        `Signup flow for ${user.email} completed in ${Date.now() - signupStartedAt}ms.`,
      );

      return {
        message: 'Check your email to verify your account',
        email: user.email,
        emailVerificationRequired: true,
      };
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

    // Verification is the boundary between account creation and workspace access.
    if (this.isEmailVerificationRequired() && !user.emailVerifiedAt) {
      throw createForbiddenException({
        message: 'Email verification is required before login',
        details: {
          needsVerification: true,
          email: user.email,
        },
      });
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

    if (
      !user ||
      (this.isEmailVerificationRequired() && !user.emailVerifiedAt)
    ) {
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

    // Rotate refresh tokens on every successful refresh so an older token becomes
    // useless as soon as the client moves to the new session bundle.
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

      // Re-read the user record so deleted or newly unverified accounts cannot keep
      // using an otherwise valid JWT until it expires.
      if (
        !user ||
        (this.isEmailVerificationRequired() && !user.emailVerifiedAt)
      ) {
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

  async confirmEmailVerification(
    verifyEmailConfirmDto: VerifyEmailConfirmDto,
  ): Promise<VerifyEmailConfirmResult> {
    if (!this.isEmailVerificationRequired()) {
      this.logger.log(
        'Email verification confirmation requested while verification bypass is active; returning dormant success response.',
      );

      return {
        verified: true,
        email: '',
        redirectPath: null,
      };
    }

    const now = new Date();
    const tokenHash = hashOpaqueToken(verifyEmailConfirmDto.token);
    const verificationToken =
      await this.prismaService.emailVerificationToken.findUnique({
        where: {
          tokenHash,
        },
        include: {
          user: true,
        },
      });

    if (
      !verificationToken ||
      verificationToken.consumedAt ||
      verificationToken.expiresAt <= now
    ) {
      throw createNotFoundException({
        message: 'Verification token is invalid or expired',
      });
    }

    // Mark the token as consumed in the same transaction as the user update so the
    // verification link stays single-use even under retries.
    await this.prismaService.$transaction([
      this.prismaService.user.update({
        where: {
          id: verificationToken.userId,
        },
        data: {
          emailVerifiedAt: now,
        },
      }),
      this.prismaService.emailVerificationToken.update({
        where: {
          id: verificationToken.id,
        },
        data: {
          consumedAt: now,
        },
      }),
    ]);

    return {
      verified: true,
      email: verificationToken.user.email,
      redirectPath: verificationToken.redirectPath ?? null,
    };
  }

  async resendEmailVerification(
    resendVerificationDto: ResendVerificationDto,
  ): Promise<ResendVerificationResult> {
    if (!this.isEmailVerificationRequired()) {
      this.logger.log(
        `Email verification resend requested for ${resendVerificationDto.email} while verification bypass is active; skipping mail delivery.`,
      );

      return {
        message:
          'If the account needs verification, a new email is on the way.',
      };
    }

    const user = await this.prismaService.user.findUnique({
      where: {
        email: resendVerificationDto.email,
      },
    });

    // Keep the response generic so resend does not reveal whether an address belongs
    // to a real account or is already verified.
    if (user && !user.emailVerifiedAt) {
      await this.createAndSendVerificationToken(
        user,
        resendVerificationDto.redirectPath,
      );
    }

    return {
      message: 'If the account needs verification, a new email is on the way.',
    };
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

  private async createAndSendVerificationToken(
    user: Pick<User, 'id' | 'email' | 'name'>,
    redirectPath?: string,
  ) {
    const verificationStartedAt = Date.now();
    const rawToken = generateOpaqueToken();
    const tokenHash = hashOpaqueToken(rawToken);
    const verificationLink = this.buildVerificationLink(
      rawToken,
      user.email,
      redirectPath,
    );

    // Only keep one active verification token per user so the latest email always
    // represents the canonical path forward.
    await this.prismaService.$transaction([
      this.prismaService.emailVerificationToken.deleteMany({
        where: {
          userId: user.id,
          consumedAt: null,
        },
      }),
      this.prismaService.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
          redirectPath: redirectPath ?? null,
        },
      }),
    ]);
    this.logger.log(
      `Stored email verification token for ${user.email} in ${Date.now() - verificationStartedAt}ms; sending email next.`,
    );

    const verificationEmail = buildVerificationEmailTemplate({
      recipientName: user.name,
      verificationUrl: verificationLink,
      frontendUrl: getAuthRuntimeConfig(this.configService).frontendUrl,
    });

    await this.mailService.sendMail({
      to: user.email,
      ...verificationEmail,
    });
    this.logger.log(
      `Verification email flow for ${user.email} completed in ${Date.now() - verificationStartedAt}ms.`,
    );
  }

  private buildVerificationLink(
    token: string,
    email: string,
    redirectPath?: string,
  ) {
    const authConfig = getAuthRuntimeConfig(this.configService);
    const verificationUrl = new URL('/verify-email', authConfig.frontendUrl);
    verificationUrl.searchParams.set('token', token);
    verificationUrl.searchParams.set('email', email);

    if (redirectPath) {
      verificationUrl.searchParams.set('next', redirectPath);
    }

    return verificationUrl.toString();
  }

  private createInvalidCredentialsException() {
    return this.createUnauthenticatedException('Invalid email or password');
  }

  private createInvalidRefreshTokenException() {
    return this.createUnauthenticatedException(
      'Refresh token is missing or invalid',
    );
  }

  private isEmailVerificationRequired() {
    return (
      getAuthRuntimeConfig(this.configService).emailVerificationMode ===
      'required'
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
