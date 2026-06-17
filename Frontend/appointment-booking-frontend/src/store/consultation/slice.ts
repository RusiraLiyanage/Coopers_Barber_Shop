import { createSlice } from '@reduxjs/toolkit';
import {
  startConsultationAction,
  submitConsultationAction,
} from './action';
import type { ConsultationState } from './types';

const initialState: ConsultationState = {
  startResult: null,
  result: null,
  loadingStart: false,
  submitting: false,
  error: null,
};

const consultationSlice = createSlice({
  name: 'consultation',
  initialState,
  reducers: {
    clearConsultation(state) {
      state.startResult = null;
      state.result = null;
      state.loadingStart = false;
      state.submitting = false;
      state.error = null;
    },
    clearConsultationResult(state) {
      state.result = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(startConsultationAction.pending, (state) => {
        state.loadingStart = true;
        state.startResult = null;
        state.result = null;
        state.error = null;
      })
      .addCase(startConsultationAction.fulfilled, (state, action) => {
        state.startResult = action.payload;
        state.loadingStart = false;
      })
      .addCase(startConsultationAction.rejected, (state, action) => {
        state.loadingStart = false;
        state.error = action.error.message ?? 'Unable to start consultation';
      })
      .addCase(submitConsultationAction.pending, (state) => {
        state.submitting = true;
        state.result = null;
        state.error = null;
      })
      .addCase(submitConsultationAction.fulfilled, (state, action) => {
        state.result = action.payload;
        state.submitting = false;
      })
      .addCase(submitConsultationAction.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.error.message ?? 'Unable to match a barber';
      });
  },
});

export const { clearConsultation, clearConsultationResult } =
  consultationSlice.actions;

export default consultationSlice.reducer;
