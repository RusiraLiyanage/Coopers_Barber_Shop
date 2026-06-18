import { createSelector } from '@reduxjs/toolkit';
import type { ReferenceDataType } from '../../lib/api';
import type { RootState } from '../index';

export const selectReferenceData = (state: RootState) =>
  state.referenceData.items;
export const selectReferenceDataPagingMeta = (state: RootState) =>
  state.referenceData.pagingMeta;
export const selectReferenceDataPagingMetaByType = (type: ReferenceDataType) =>
  createSelector(
    [(state: RootState) => state.referenceData.pagingMetaByType],
    (pagingMetaByType) => pagingMetaByType[type],
  );
export const selectReferenceDataLoading = (state: RootState) =>
  state.referenceData.loading;
export const selectReferenceDataSaving = (state: RootState) =>
  state.referenceData.saving;

export const selectReferenceDataByType = (type: ReferenceDataType) =>
  createSelector([selectReferenceData], (items) =>
    items.filter((item) => item.type === type),
  );
