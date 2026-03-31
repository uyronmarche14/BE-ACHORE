import { Body, Controller, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { getAuthRuntimeConfig } from '../../../config/runtime-config';
import { mapSignupResponse } from '../mapper/auth.mapper';
import { SignupDto } from '../dto/signup.dto';
import { AuthService } from '../service/auth.service';
import type { SignupResponse } from '../types/auth-response.type';

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
    const authConfig = getAuthRuntimeConfig(this.configService);
    const signupResult = await this.authService.signup(signupDto);

    response.cookie(authConfig.refreshCookieName, signupResult.refreshToken, {
      httpOnly: true,
      secure: authConfig.refreshCookieSecure,
      sameSite: 'lax',
      expires: signupResult.refreshTokenExpiresAt,
      path: '/',
    });

    return mapSignupResponse(signupResult);
  }
}
