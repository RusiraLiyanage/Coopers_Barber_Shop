import type { RootState } from '../index';

export const selectAccountProfile = (state: RootState) => state.account.profile;

export const selectAccountLoading = (state: RootState) => state.account.loading;

export const selectAccountSaving = (state: RootState) => state.account.saving;

export const selectAccountError = (state: RootState) => state.account.error;
