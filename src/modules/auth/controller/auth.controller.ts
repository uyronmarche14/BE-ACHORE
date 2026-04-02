import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthRateLimit } from '../decorators/auth-rate-limit.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { LoginDto } from '../dto/login.dto';
import { AuthRateLimitGuard } from '../guards/auth-rate-limit.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  mapCurrentUserResponse,
  mapLoginResponse,
  mapLogoutResponse,
  mapResendVerificationResponse,
  mapRefreshResponse,
  mapSignupResponse,
  mapVerifyEmailConfirmResponse,
} from '../mapper/auth.mapper';
import { SignupDto } from '../dto/signup.dto';
import { AuthService } from '../service/auth.service';
import type {
  CurrentUserResponse,
  LoginResponse,
  LogoutResponse,
  RefreshAccessTokenResponse,
  ResendVerificationResponse,
  SignupResponse,
  AuthUserResponse,
  VerifyEmailConfirmResponse,
} from '../types/auth-response.type';
import { getCookieValue } from '../utils/auth-request.util';
import {
  clearRefreshTokenCookie,
  getRefreshCookieName,
  setRefreshTokenCookie,
} from '../utils/refresh-cookie.util';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { VerifyEmailConfirmDto } from '../dto/verify-email-confirm.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({
    key: 'signup',
    limit: 5,
    windowMs: 60_000,
  })
  async signup(
    @Body() signupDto: SignupDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignupResponse> {
    const signupResult = await this.authService.signup(signupDto);

    clearRefreshTokenCookie(response, this.configService);

    return mapSignupResponse(signupResult);
  }

  @Post('login')
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({
    key: 'login',
    limit: 5,
    windowMs: 60_000,
  })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const loginResult = await this.authService.login(loginDto);

    setRefreshTokenCookie(
      response,
      this.configService,
      loginResult.refreshToken,
      loginResult.refreshTokenExpiresAt,
    );

    return mapLoginResponse(loginResult);
  }

  @Post('refresh')
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({
    key: 'refresh',
    limit: 20,
    windowMs: 60_000,
  })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RefreshAccessTokenResponse> {
    const refreshResult = await this.authService.refresh(
      getCookieValue(
        request.headers.cookie,
        getRefreshCookieName(this.configService),
      ),
    );

    setRefreshTokenCookie(
      response,
      this.configService,
      refreshResult.refreshToken,
      refreshResult.refreshTokenExpiresAt,
    );

    return mapRefreshResponse(refreshResult.accessToken);
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LogoutResponse> {
    const refreshToken = getCookieValue(
      request.headers.cookie,
      getRefreshCookieName(this.configService),
    );

    await this.authService.logout(refreshToken);
    clearRefreshTokenCookie(response, this.configService);

    return mapLogoutResponse();
  }

  @Post('verify-email/confirm')
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({
    key: 'verify-email-confirm',
    limit: 10,
    windowMs: 60_000,
  })
  confirmEmailVerification(
    @Body() verifyEmailConfirmDto: VerifyEmailConfirmDto,
  ): Promise<VerifyEmailConfirmResponse> {
    return this.authService
      .confirmEmailVerification(verifyEmailConfirmDto)
      .then(mapVerifyEmailConfirmResponse);
  }

  @Post('verify-email/resend')
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit({
    key: 'verify-email-resend',
    limit: 5,
    windowMs: 60_000,
  })
  resendEmailVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ): Promise<ResendVerificationResponse> {
    return this.authService
      .resendEmailVerification(resendVerificationDto)
      .then(mapResendVerificationResponse);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(
    @CurrentUser() currentUser: AuthUserResponse,
  ): CurrentUserResponse {
    return mapCurrentUserResponse(currentUser);
  }
}
