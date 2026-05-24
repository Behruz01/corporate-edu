import type { AxiosProgressEvent } from 'axios';
import { api } from '@/lib/api/client';

export const ADMIN_ROLES = ['EMPLOYEE', 'MANAGER', 'HR_ADMIN', 'PLATFORM_ADMIN', 'KNOWLEDGE_CURATOR'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'INVITED', 'DEPARTING', 'INACTIVE'] as const;
export type AdminUserStatus = (typeof USER_STATUSES)[number];

export const DIFFICULTIES = ['BASIC', 'INTERMEDIATE', 'ADVANCED'] as const;
export type ScenarioDifficulty = (typeof DIFFICULTIES)[number];

export const INDUSTRIES = ['banking', 'it', 'retail', 'healthcare', 'manufacturing', 'government'] as const;
export type TenantIndustry = (typeof INDUSTRIES)[number];

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  department: string | null;
  position?: string | null;
  status: AdminUserStatus;
  preferredLang?: string;
  pointsTotal?: number;
  createdAt: string;
};

export type CreateUserInput = {
  email: string;
  fullName: string;
  role: AdminRole;
  department?: string;
};

export type DocumentStatus = 'PROCESSING' | 'READY' | 'FAILED' | 'OUTDATED';

export type AdminDocument = {
  id: string;
  title: string;
  filename: string;
  mimeType: string;
  lang: 'UZ' | 'RU' | 'EN';
  status: DocumentStatus;
  category: string | null;
  chunkCount: number;
  pages: number | null;
  createdAt: string;
  uploadedBy?: { id: string; fullName: string; email: string };
};

export type UploadDocumentInput = {
  file: File;
  title?: string;
  lang: 'UZ' | 'RU' | 'EN';
  category?: string;
  visibility?: string;
  onProgress?: (percent: number) => void;
};

export type Scenario = {
  id: string;
  category: string;
  title: string;
  brief: string;
  personaDesc: string;
  difficulty: ScenarioDifficulty;
  lang: 'UZ' | 'RU' | 'EN';
  active: boolean;
  createdAt: string;
};

export type CreateScenarioInput = {
  title: string;
  category: string;
  difficulty: ScenarioDifficulty;
  brief: string;
  personaDesc: string;
};

export type OnboardingTemplateSummary = {
  id: string;
  role: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  _count?: { days: number; assignments: number };
};

export type OnboardingDay = {
  id: string;
  dayNumber: number;
  title: string;
  description: string;
  estimatedMin: number;
  topics?: Array<{ id: string; order: number; title: string }>;
};

export type OnboardingTemplateDetail = OnboardingTemplateSummary & {
  days: OnboardingDay[];
};

export type Project = {
  id: string;
  name: string;
  department: string | null;
  description: string | null;
  status: string;
  createdAt: string;
  _count?: { members: number; notes: number };
};

export type CreateProjectInput = {
  name: string;
  department?: string;
  description?: string;
};

export type TenantSettings = {
  id: string;
  name: string;
  slug: string;
  industry: TenantIndustry | string;
  branding: {
    platformName?: string;
    colors?: { primary?: string };
  } | null;
};

export type UpdateTenantSettingsInput = {
  platformName: string;
  primaryColor: string;
  industry: TenantIndustry;
};

export async function fetchUsers(): Promise<AdminUser[]> {
  const { data } = await api.get<AdminUser[]>('/users');
  return data;
}

export async function createUser(input: CreateUserInput): Promise<AdminUser> {
  const { data } = await api.post<AdminUser>('/users', input);
  return data;
}

export async function updateUserStatus(input: { id: string; status: AdminUserStatus }): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(`/users/${input.id}/status`, { status: input.status });
  return data;
}

export async function fetchDocuments(): Promise<AdminDocument[]> {
  const { data } = await api.get<AdminDocument[]>('/documents');
  return data;
}

export async function uploadDocument(input: UploadDocumentInput): Promise<AdminDocument> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('lang', input.lang);
  if (input.title) form.append('title', input.title);
  if (input.category) form.append('category', input.category);
  if (input.visibility) form.append('visibility', input.visibility);

  const { data } = await api.post<AdminDocument>('/documents', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (!event.total || !input.onProgress) return;
      input.onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return data;
}

export async function reprocessDocument(id: string): Promise<{ ok: boolean }> {
  const { data } = await api.post<{ ok: boolean }>(`/documents/${id}/reprocess`);
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`);
}

export async function fetchScenarios(): Promise<Scenario[]> {
  const { data } = await api.get<Scenario[]>('/scenarios');
  return data;
}

export async function createScenario(input: CreateScenarioInput): Promise<Scenario> {
  const { data } = await api.post<Scenario>('/scenarios', { ...input, lang: 'UZ', active: true, criteria: [] });
  return data;
}

export async function fetchOnboardingTemplates(): Promise<OnboardingTemplateDetail[]> {
  const { data } = await api.get<OnboardingTemplateSummary[]>('/onboarding/templates');
  return Promise.all(data.map((template) => fetchOnboardingTemplate(template.id)));
}

async function fetchOnboardingTemplate(id: string): Promise<OnboardingTemplateDetail> {
  const { data } = await api.get<OnboardingTemplateDetail>(`/onboarding/templates/${id}`);
  return data;
}

export async function fetchProjects(): Promise<Project[]> {
  const { data } = await api.get<Project[]>('/projects');
  return data;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const { data } = await api.post<Project>('/projects', { ...input, status: 'active' });
  return data;
}

export async function fetchTenantSettings(): Promise<TenantSettings> {
  const { data } = await api.get<TenantSettings>('/tenants/me');
  return data;
}

export async function updateTenantSettings(input: UpdateTenantSettingsInput): Promise<TenantSettings> {
  const { data } = await api.patch<TenantSettings>('/admin/settings', {
    platformName: input.platformName,
    primaryColor: input.primaryColor,
    colors: { primary: input.primaryColor },
    industry: input.industry,
  });
  return data;
}
