import {
  createSafetyRule,
  getSafetyRules,
  updateSafetyRule,
  type CreateSafetyRulePayload,
  type SafetyRuleRecord,
  type UpdateSafetyRulePayload,
} from '../../lib/api';
import { createAppAsyncThunk } from '../createAppAsyncThunk';

const SLICE_NAME = 'safetyRules';

export const getSafetyRulesAction = createAppAsyncThunk<SafetyRuleRecord[]>(
  `${SLICE_NAME}/getSafetyRules`,
  async () => getSafetyRules(),
);

export const createSafetyRuleAction = createAppAsyncThunk<
  SafetyRuleRecord,
  CreateSafetyRulePayload
>(`${SLICE_NAME}/createSafetyRule`, async (payload) =>
  createSafetyRule(payload),
);

export const updateSafetyRuleAction = createAppAsyncThunk<
  SafetyRuleRecord,
  { id: string; payload: UpdateSafetyRulePayload }
>(`${SLICE_NAME}/updateSafetyRule`, async ({ id, payload }) =>
  updateSafetyRule(id, payload),
);
