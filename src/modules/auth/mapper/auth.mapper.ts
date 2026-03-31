import type { User } from '@prisma/client';
import type {
  AuthUserResponse,
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

export function mapSignupResponse(input: SignupResponse): SignupResponse {
  return {
    user: input.user,
    accessToken: input.accessToken,
  };
}
