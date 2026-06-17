import {
  SafetyRuleSeverity,
  ServiceComplexity,
  StaffRole,
} from '@coopers/entities';

export type ConsultationQuestion = {
  id: string;
  label: string;
  helperText?: string;
  required: boolean;
};

export type ConsultationServiceSummary = {
  id: string;
  name: string;
  complexity: ServiceComplexity;
  requiredSkills: string[];
  safetyTriggers: string[];
};

export type ConsultationHairHistorySummary = {
  service: string;
  hairState: string[];
  productsUsed: string | null;
  barberNotes: string | null;
  visitDate: string;
};

export type ConsultationStartResponse = {
  service: ConsultationServiceSummary;
  questions: ConsultationQuestion[];
  previousHairHistory: ConsultationHairHistorySummary[];
};

export type ConsultationSafetyNote = {
  severity: SafetyRuleSeverity;
  message: string;
  source: 'safety-rule' | 'service-trigger';
};

export type ConsultationBarberMatch = {
  id: string;
  displayName: string;
  role: StaffRole;
  rating: number;
  matchedSkills: string[];
  missingSkills: string[];
};

export type ConsultationSubmitResponse = {
  service: ConsultationServiceSummary;
  matchedBarber: ConsultationBarberMatch;
  matchScore: number;
  matchReasons: string[];
  safetyNotes: ConsultationSafetyNote[];
  hairState: string[];
  desiredLook: string | null;
  consultationSummary: string;
  previousHairHistoryCount: number;
};
