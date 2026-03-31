import { AppRole } from '@prisma/client';

export type AuthUserResponse = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
};

export type AuthSessionResponse = {
  user: AuthUserResponse;
  accessToken: string;
};

export type SignupResponse = AuthSessionResponse;

export type LoginResponse = AuthSessionResponse;

export type RefreshAccessTokenResponse = {
  accessToken: string;
};

export type CurrentUserResponse = {
  user: AuthUserResponse;
};

export type LogoutResponse = {
  loggedOut: true;
};

export type AuthSessionResult = AuthSessionResponse & {
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

export type SignupResult = AuthSessionResult;

export type LoginResult = AuthSessionResult;

export type RefreshResult = RefreshAccessTokenResponse & {
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};
