import { Body, Controller, Get, Headers, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { LoginDto } from '../dto/login.dto';
import {
  mapLoginResponse,
  mapLogoutResponse,
  mapRefreshResponse,
  mapSignupResponse,
} from '../mapper/auth.mapper';
import { SignupDto } from '../dto/signup.dto';
import { AuthService } from '../service/auth.service';
import type {
  CurrentUserResponse,
  LoginResponse,
  LogoutResponse,
  RefreshAccessTokenResponse,
  SignupResponse,
} from '../types/auth-response.type';
import { extractBearerToken, getCookieValue } from '../utils/auth-request.util';
import {
  clearRefreshTokenCookie,
  getRefreshCookieName,
  setRefreshTokenCookie,
} from '../utils/refresh-cookie.util';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  async signup(
    @Body() signupDto: SignupDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignupResponse> {
    const signupResult = await this.authService.signup(signupDto);

    setRefreshTokenCookie(
      response,
      this.configService,
      signupResult.refreshToken,
      signupResult.refreshTokenExpiresAt,
    );

    return mapSignupResponse(signupResult);
  }

  @Post('login')
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

  @Get('me')
  async getCurrentUser(
    @Headers('authorization') authorizationHeader: string | undefined,
  ): Promise<CurrentUserResponse> {
    const currentUser = await this.authService.getCurrentUser(
      extractBearerToken(authorizationHeader),
    );

    return currentUser;
  }
}
