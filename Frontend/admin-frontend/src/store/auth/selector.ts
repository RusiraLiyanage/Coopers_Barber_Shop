import type { RootState } from '../index';

export const selectAuthSession = (state: RootState) => state.auth.session;
export const selectAuthLoading = (state: RootState) => state.auth.loading;
