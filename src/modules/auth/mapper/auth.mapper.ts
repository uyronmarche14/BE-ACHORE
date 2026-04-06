import type {
  AuthUserResponse,
  AuthSessionResponse,
  CurrentUserResponse,
  LoginResponse,
  LogoutResponse,
  RefreshAccessTokenResponse,
  ResendVerificationResponse,
  SignupResponse,
  VerifyEmailConfirmResponse,
} from '../types/auth-response.type';
import type { User } from '@prisma/client';

export function mapUserToAuthUserResponse(user: User): AuthUserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
  };
}

export function mapAuthSessionResponse(
  input: AuthSessionResponse,
): AuthSessionResponse {
  return {
    user: input.user,
    accessToken: input.accessToken,
  };
}

export function mapSignupResponse(input: SignupResponse): SignupResponse {
  return {
    message: input.message,
    email: input.email,
    emailVerificationRequired: input.emailVerificationRequired,
  };
}

export function mapLoginResponse(input: LoginResponse): LoginResponse {
  return mapAuthSessionResponse(input);
}

export function mapRefreshResponse(
  accessToken: string,
): RefreshAccessTokenResponse {
  return {
    accessToken,
  };
}

export function mapCurrentUserResponse(
  user: AuthUserResponse | User,
): CurrentUserResponse {
  return {
    user: 'passwordHash' in user ? mapUserToAuthUserResponse(user) : user,
  };
}

export function mapLogoutResponse(): LogoutResponse {
  return {
    loggedOut: true,
  };
}

export function mapVerifyEmailConfirmResponse(
  input: VerifyEmailConfirmResponse,
): VerifyEmailConfirmResponse {
  return {
    verified: true,
    email: input.email,
    redirectPath: input.redirectPath,
  };
}

export function mapResendVerificationResponse(
  input: ResendVerificationResponse,
): ResendVerificationResponse {
  return {
    message: input.message,
  };
}
