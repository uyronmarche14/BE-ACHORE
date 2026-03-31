import type { User } from '@prisma/client';
import type {
  AuthUserResponse,
  AuthSessionResponse,
  CurrentUserResponse,
  LoginResponse,
  LogoutResponse,
  RefreshAccessTokenResponse,
  SignupResponse,
} from '../types/auth-response.type';

export function mapUserToAuthUserResponse(user: User): AuthUserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
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
  return mapAuthSessionResponse(input);
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

export function mapCurrentUserResponse(user: User): CurrentUserResponse {
  return {
    user: mapUserToAuthUserResponse(user),
  };
}

export function mapLogoutResponse(): LogoutResponse {
  return {
    loggedOut: true,
  };
}
