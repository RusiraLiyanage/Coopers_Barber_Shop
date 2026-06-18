import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export const selectBarbers = (state: RootState) => state.barbers.items;
export const selectBarbersPagingMeta = (state: RootState) =>
  state.barbers.pagingMeta;
export const selectBarbersLoading = (state: RootState) => state.barbers.loading;
export const selectBarbersSaving = (state: RootState) => state.barbers.saving;

export const selectActiveBarbers = createSelector([selectBarbers], (barbers) =>
  barbers.filter((barber) => barber.active),
);
