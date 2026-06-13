import type { RootState } from '../index';

export const selectAuthSession = (state: RootState) => state.auth.session;
