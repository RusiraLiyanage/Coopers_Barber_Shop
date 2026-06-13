import type { RootState } from '../index';

export const selectServices = (state: RootState) => state.services.items;

export const selectActiveServices = (state: RootState) =>
  state.services.items.filter((service) => service.isActive);

export const selectServicesLoading = (state: RootState) =>
  state.services.loading;
