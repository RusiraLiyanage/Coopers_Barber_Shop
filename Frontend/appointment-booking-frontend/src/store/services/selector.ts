import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export const selectServices = (state: RootState) => state.services.items;

// Memoized so the filtered array keeps a stable reference across unrelated
// store updates and doesn't trigger needless re-renders via useSelector.
export const selectActiveServices = createSelector([selectServices], (services) =>
  services.filter((service) => service.isActive),
);

export const selectServicesLoading = (state: RootState) =>
  state.services.loading;
