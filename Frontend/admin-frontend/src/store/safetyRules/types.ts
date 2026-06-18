import type {
  CreateSafetyRulePayload,
  PagingMeta,
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
  pagingMeta: PagingMeta | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
};
