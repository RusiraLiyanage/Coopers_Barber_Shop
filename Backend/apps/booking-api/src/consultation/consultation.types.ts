import {
  SafetyRuleSeverity,
  ServiceComplexity,
  StaffGender,
  StaffRole,
} from '@coopers/entities';

export type ConsultationQuestion = {
  id: string;
  label: string;
  helperText?: string;
  required: boolean;
  answerType?: 'text' | 'single_choice' | 'multi_choice';
  options?: string[];
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
  monthsAgo: number;
  relevance: 'high' | 'medium' | 'low';
  safetyCritical: boolean;
};

export type ConsultationStartResponse = {
  service: ConsultationServiceSummary;
  questions: ConsultationQuestion[];
  previousHairHistory: ConsultationHairHistorySummary[];
};

export type ConsultationSafetyNote = {
  severity: SafetyRuleSeverity;
  message: string;
  source: 'safety-rule' | 'service-trigger' | 'ai-observation';
};

export type ConsultationBarberMatch = {
  id: string;
  displayName: string;
  gender: StaffGender;
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
  generation: {
    source: 'claude' | 'fallback';
    model: string | null;
  };
};

export type ConsultationStreamEvent =
  | {
      type: 'status';
      message: string;
    }
  | {
      type: 'text_delta';
      text: string;
    }
  | {
      type: 'tool_use';
      name: string;
    }
  | {
      type: 'tool_result';
      name: string;
      ok: boolean;
    }
  | {
      type: 'result';
      result: ConsultationSubmitResponse;
    }
  | {
      type: 'error';
      message: string;
    }
  | {
      type: 'done';
    };
