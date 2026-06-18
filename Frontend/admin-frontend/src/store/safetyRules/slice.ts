import { createSlice } from '@reduxjs/toolkit';
import {
  createSafetyRuleAction,
  getSafetyRulesAction,
  updateSafetyRuleAction,
} from './action';
import type { SafetyRuleRecord, SafetyRulesState } from './types';

const initialState: SafetyRulesState = {
  items: [],
  pagingMeta: null,
  loading: false,
  saving: false,
  error: null,
};

function upsertSafetyRule(
  items: SafetyRuleRecord[],
  safetyRule: SafetyRuleRecord,
): void {
  const existingIndex = items.findIndex((item) => item.id === safetyRule.id);

  if (existingIndex >= 0) {
    items[existingIndex] = safetyRule;
    return;
  }

  items.unshift(safetyRule);
}

const safetyRulesSlice = createSlice({
  name: 'safetyRules',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getSafetyRulesAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSafetyRulesAction.fulfilled, (state, action) => {
        state.items = action.payload.data;
        state.pagingMeta = action.payload.pagingMeta;
        state.loading = false;
      })
      .addCase(getSafetyRulesAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to load safety rules.';
      })
      .addCase(createSafetyRuleAction.pending, (state) => {
        state.saving = true;
      })
      .addCase(createSafetyRuleAction.fulfilled, (state, action) => {
        upsertSafetyRule(state.items, action.payload);
        state.saving = false;
      })
      .addCase(createSafetyRuleAction.rejected, (state) => {
        state.saving = false;
      })
      .addCase(updateSafetyRuleAction.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateSafetyRuleAction.fulfilled, (state, action) => {
        upsertSafetyRule(state.items, action.payload);
        state.saving = false;
      })
      .addCase(updateSafetyRuleAction.rejected, (state) => {
        state.saving = false;
      });
  },
});

export default safetyRulesSlice.reducer;
