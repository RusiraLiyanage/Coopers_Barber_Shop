import type {
  ReferenceDataType,
  ServiceComplexity,
  StaffGender,
  StaffRole,
} from '../../lib/api';

export type AdminTabKey =
  | 'overview'
  | 'barbers'
  | 'services'
  | 'referenceData'
  | 'safety'
  | 'briefs'
  | 'hairHistory'
  | 'invites';

export type BarberFormValues = {
  displayName: string;
  email?: string;
  gender: StaffGender;
  role: StaffRole;
  timezone: string;
  skills: string[];
  rating: number;
  available: boolean;
  active: boolean;
};

export type ServiceConfigFormValues = {
  name: string;
  durationMinutes: number;
  requiredSkills: string[];
  safetyTriggers: string[];
  complexity: ServiceComplexity;
  isActive: boolean;
};

export type SafetyRuleFormValues = {
  condition: string;
  serviceIds: string[];
  message: string;
  severity: 'low' | 'medium' | 'high';
  active: boolean;
};

export type InviteFormValues = {
  email: string;
  expiresInDays: number;
};

export type ReferenceDataFormValues = {
  label: string;
};

export type ReferenceDataTableType = ReferenceDataType;

export type TablePage = {
  page: number;
  limit: number;
};
