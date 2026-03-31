import { AppRole } from '@prisma/client';

export type AuthUserResponse = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
};

export type SignupResponse = {
  user: AuthUserResponse;
  accessToken: string;
};

export type SignupResult = SignupResponse & {
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};
