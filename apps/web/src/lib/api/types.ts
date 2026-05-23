export type Role = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN' | 'PLATFORM_ADMIN' | 'KNOWLEDGE_CURATOR';
export type Lang = 'UZ' | 'RU' | 'EN';
export type UserStatus = 'ACTIVE' | 'INVITED' | 'DEPARTING' | 'INACTIVE';

export type AuthUser = {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: Role;
  status: UserStatus;
  preferredLang: Lang;
  pointsTotal: number;
};

export type LoginResponse = { user: AuthUser; accessToken: string };

export type ProblemDetails = {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
};
