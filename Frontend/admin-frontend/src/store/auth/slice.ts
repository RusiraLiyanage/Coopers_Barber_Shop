import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  extendAdminSessionAction,
  getCurrentSessionAction,
  loginAdminAction,
  logoutAction,
} from './action';
import type { AuthSession, AuthState } from './types';

const initialState: AuthState = {
  session: null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthSession(state, action: PayloadAction<AuthSession | null>) {
      state.session = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCurrentSessionAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrentSessionAction.fulfilled, (state, action) => {
        state.session = action.payload;
        state.loading = false;
      })
      .addCase(getCurrentSessionAction.rejected, (state) => {
        state.session = null;
        state.loading = false;
      })
      .addCase(loginAdminAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAdminAction.fulfilled, (state, action) => {
        state.session = action.payload;
        state.loading = false;
      })
      .addCase(loginAdminAction.rejected, (state, action) => {
        state.session = null;
        state.loading = false;
        state.error = action.error.message ?? 'Unable to login.';
      })
      .addCase(extendAdminSessionAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(extendAdminSessionAction.fulfilled, (state, action) => {
        state.session = action.payload;
        state.loading = false;
      })
      .addCase(extendAdminSessionAction.rejected, (state, action) => {
        state.session = null;
        state.loading = false;
        state.error = action.error.message ?? 'Unable to extend session.';
      })
      .addCase(logoutAction.fulfilled, (state) => {
        state.session = null;
      });
  },
});

export const { setAuthSession } = authSlice.actions;

export default authSlice.reducer;
