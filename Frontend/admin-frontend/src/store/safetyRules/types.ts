import type {
  CreateSafetyRulePayload,
  SafetyRuleRecord,
  UpdateSafetyRulePayload,
} from '../../lib/api';

export type {
  CreateSafetyRulePayload,
  SafetyRuleRecord,
  UpdateSafetyRulePayload,
};

export type SafetyRulesState = {
  items: SafetyRuleRecord[];
  loading: boolean;
  saving: boolean;
  error: string | null;
};
