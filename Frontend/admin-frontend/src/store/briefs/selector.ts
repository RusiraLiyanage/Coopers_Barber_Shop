import type { RootState } from '../index';

export const selectAppointmentBriefs = (state: RootState) => state.briefs.items;
export const selectAppointmentBriefsLoading = (state: RootState) =>
  state.briefs.loading;
