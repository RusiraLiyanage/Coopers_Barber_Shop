import type { RootState } from '../index';

export const selectConsultationStartResult = (state: RootState) =>
  state.consultation.startResult;

export const selectConsultationResult = (state: RootState) =>
  state.consultation.result;

export const selectConsultationLoadingStart = (state: RootState) =>
  state.consultation.loadingStart;

export const selectConsultationSubmitting = (state: RootState) =>
  state.consultation.submitting;

export const selectConsultationError = (state: RootState) =>
  state.consultation.error;
