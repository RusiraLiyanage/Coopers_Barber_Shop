import {
  createSafetyRule,
  getSafetyRules,
  updateSafetyRule,
  type CreateSafetyRulePayload,
  type PaginatedResponse,
  type PaginationRequest,
  type SafetyRuleRecord,
  type UpdateSafetyRulePayload,
} from '../../lib/api';
import { createAppAsyncThunk } from '../createAppAsyncThunk';

const SLICE_NAME = 'safetyRules';

export const getSafetyRulesAction = createAppAsyncThunk<
  PaginatedResponse<SafetyRuleRecord>,
  PaginationRequest | undefined
>(
  `${SLICE_NAME}/getSafetyRules`,
  async (pagination) => getSafetyRules(pagination),
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
