import type { RootState } from '../index';

export const selectAuthSession = (state: RootState) => state.auth.session;

export const selectIsAuthenticated = (state: RootState) =>
  Boolean(state.auth.session?.authenticated);

export const selectAuthLoading = (state: RootState) => state.auth.loading;
