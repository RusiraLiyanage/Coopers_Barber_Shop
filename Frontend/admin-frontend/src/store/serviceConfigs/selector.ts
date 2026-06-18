import type { RootState } from '../index';

export const selectServiceConfigs = (state: RootState) =>
  state.serviceConfigs.items;
export const selectServiceConfigsPagingMeta = (state: RootState) =>
  state.serviceConfigs.pagingMeta;
export const selectServiceConfigsLoading = (state: RootState) =>
  state.serviceConfigs.loading;
export const selectServiceConfigsSaving = (state: RootState) =>
  state.serviceConfigs.saving;
