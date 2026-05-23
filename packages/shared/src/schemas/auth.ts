import { z } from 'zod';
import { Lang, Role, UserStatus } from '../enums';

export const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const AuthUser = z.object({
  id: z.string(),
  tenantId: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  role: z.enum([Role.EMPLOYEE, Role.MANAGER, Role.HR_ADMIN, Role.PLATFORM_ADMIN, Role.KNOWLEDGE_CURATOR]),
  status: z.enum([UserStatus.ACTIVE, UserStatus.INVITED, UserStatus.DEPARTING, UserStatus.INACTIVE]),
  preferredLang: z.enum([Lang.UZ, Lang.RU, Lang.EN]),
  pointsTotal: z.number().int(),
});
export type AuthUser = z.infer<typeof AuthUser>;

export const LoginResponse = z.object({
  user: AuthUser,
  accessToken: z.string(),
});
export type LoginResponse = z.infer<typeof LoginResponse>;

export const RefreshResponse = z.object({
  accessToken: z.string(),
});
export type RefreshResponse = z.infer<typeof RefreshResponse>;

export const UpdateLangInput = z.object({
  lang: z.enum([Lang.UZ, Lang.RU, Lang.EN]),
});
export type UpdateLangInput = z.infer<typeof UpdateLangInput>;
