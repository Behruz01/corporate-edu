export const Lang = { UZ: 'UZ', RU: 'RU', EN: 'EN' } as const;
export type Lang = (typeof Lang)[keyof typeof Lang];

export const Role = {
  EMPLOYEE: 'EMPLOYEE',
  MANAGER: 'MANAGER',
  HR_ADMIN: 'HR_ADMIN',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  KNOWLEDGE_CURATOR: 'KNOWLEDGE_CURATOR',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INVITED: 'INVITED',
  DEPARTING: 'DEPARTING',
  INACTIVE: 'INACTIVE',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const OnboardingStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
} as const;
export type OnboardingStatus = (typeof OnboardingStatus)[keyof typeof OnboardingStatus];

export const Difficulty = { BASIC: 'BASIC', INTERMEDIATE: 'INTERMEDIATE', ADVANCED: 'ADVANCED' } as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

export const DocStatus = {
  PROCESSING: 'PROCESSING',
  READY: 'READY',
  FAILED: 'FAILED',
  OUTDATED: 'OUTDATED',
} as const;
export type DocStatus = (typeof DocStatus)[keyof typeof DocStatus];

export const ConvSource = {
  KB: 'KB',
  ONBOARDING_COMPANION: 'ONBOARDING_COMPANION',
  MEMORY_PERSONA: 'MEMORY_PERSONA',
} as const;
export type ConvSource = (typeof ConvSource)[keyof typeof ConvSource];

export const MsgRole = { USER: 'USER', ASSISTANT: 'ASSISTANT', SYSTEM: 'SYSTEM' } as const;
export type MsgRole = (typeof MsgRole)[keyof typeof MsgRole];

export const NoteVisibility = { PRIVATE: 'PRIVATE', TEAM: 'TEAM', ALL: 'ALL' } as const;
export type NoteVisibility = (typeof NoteVisibility)[keyof typeof NoteVisibility];

export const InterviewStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;
export type InterviewStatus = (typeof InterviewStatus)[keyof typeof InterviewStatus];
