import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  confirmPasswordResetAction,
  extendSessionAction,
  getCurrentSessionAction,
  loginAction,
  logoutAction,
  refreshSessionAction,
  registerAction,
} from './action';
import type { AuthResponse, AuthSession, AuthState } from './types';

const initialState: AuthState = {
  session: null,
  loading: false,
  error: null,
};

function setAuthenticatedSession(state: AuthState, response: AuthResponse) {
  state.session = response.authenticated ? { authenticated: true } : null;
  state.loading = false;
  state.error = null;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthSession(state, action: PayloadAction<AuthSession | null>) {
      state.session = action.payload;
      state.error = null;
    },
    clearAuthSession(state) {
      state.session = null;
      state.error = null;
    },
    setResetStore() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getCurrentSessionAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrentSessionAction.fulfilled, (state, action) => {
        setAuthenticatedSession(state, action.payload);
      })
      .addCase(getCurrentSessionAction.rejected, (state, action) => {
        state.session = null;
        state.loading = false;
        state.error = action.error.message ?? 'Unable to restore session';
      })
      .addCase(refreshSessionAction.fulfilled, (state, action) => {
        setAuthenticatedSession(state, action.payload);
      })
      .addCase(extendSessionAction.fulfilled, (state, action) => {
        setAuthenticatedSession(state, action.payload);
      })
      .addCase(loginAction.fulfilled, (state, action) => {
        setAuthenticatedSession(state, action.payload);
      })
      .addCase(registerAction.fulfilled, (state, action) => {
        setAuthenticatedSession(state, action.payload);
      })
      .addCase(logoutAction.fulfilled, (state) => {
        state.session = null;
        state.error = null;
      })
      .addCase(confirmPasswordResetAction.fulfilled, (state) => {
        state.session = null;
        state.error = null;
      });
  },
});

export const { clearAuthSession, setAuthSession, setResetStore } =
  authSlice.actions;

export default authSlice.reducer;
