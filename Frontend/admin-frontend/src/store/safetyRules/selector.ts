import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export const selectSafetyRules = (state: RootState) => state.safetyRules.items;
export const selectSafetyRulesPagingMeta = (state: RootState) =>
  state.safetyRules.pagingMeta;
export const selectSafetyRulesLoading = (state: RootState) =>
  state.safetyRules.loading;
export const selectSafetyRulesSaving = (state: RootState) =>
  state.safetyRules.saving;

export const selectActiveSafetyRules = createSelector(
  [selectSafetyRules],
  (rules) => rules.filter((rule) => rule.active),
);
