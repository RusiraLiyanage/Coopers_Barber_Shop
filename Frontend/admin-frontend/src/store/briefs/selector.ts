import type { RootState } from '../index';

export const selectAppointmentBriefs = (state: RootState) => state.briefs.items;
export const selectAppointmentBriefsPagingMeta = (state: RootState) =>
  state.briefs.pagingMeta;
export const selectAppointmentBriefsLoading = (state: RootState) =>
  state.briefs.loading;
