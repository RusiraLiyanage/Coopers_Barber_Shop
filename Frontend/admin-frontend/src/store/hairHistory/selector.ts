import type { RootState } from '../index';

export const selectHairHistory = (state: RootState) => state.hairHistory.items;
export const selectHairHistoryPagingMeta = (state: RootState) =>
  state.hairHistory.pagingMeta;

export const selectHairHistoryLoading = (state: RootState) =>
  state.hairHistory.loading;
