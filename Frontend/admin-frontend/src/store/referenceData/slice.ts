import { createSlice } from '@reduxjs/toolkit';
import {
  createReferenceDataItemAction,
  deleteReferenceDataItemAction,
  getReferenceDataAction,
  updateReferenceDataItemAction,
} from './action';
import type { ReferenceDataItemRecord, ReferenceDataState } from './types';

const initialState: ReferenceDataState = {
  items: [],
  loading: false,
  saving: false,
  error: null,
};

function upsertReferenceDataItem(
  items: ReferenceDataItemRecord[],
  item: ReferenceDataItemRecord,
): void {
  const existingIndex = items.findIndex(
    (existingItem) => existingItem.id === item.id,
  );

  if (existingIndex >= 0) {
    items[existingIndex] = item;
    return;
  }

  items.unshift(item);
}

const referenceDataSlice = createSlice({
  name: 'referenceData',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getReferenceDataAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getReferenceDataAction.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(getReferenceDataAction.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message ?? 'Unable to load reference data.';
      })
      .addCase(createReferenceDataItemAction.pending, (state) => {
        state.saving = true;
      })
      .addCase(createReferenceDataItemAction.fulfilled, (state, action) => {
        upsertReferenceDataItem(state.items, action.payload);
        state.saving = false;
      })
      .addCase(createReferenceDataItemAction.rejected, (state) => {
        state.saving = false;
      })
      .addCase(updateReferenceDataItemAction.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateReferenceDataItemAction.fulfilled, (state, action) => {
        upsertReferenceDataItem(state.items, action.payload);
        state.saving = false;
      })
      .addCase(updateReferenceDataItemAction.rejected, (state) => {
        state.saving = false;
      })
      .addCase(deleteReferenceDataItemAction.pending, (state) => {
        state.saving = true;
      })
      .addCase(deleteReferenceDataItemAction.fulfilled, (state, action) => {
        state.items = state.items.filter(
          (item) => item.id !== action.payload.id,
        );
        state.saving = false;
      })
      .addCase(deleteReferenceDataItemAction.rejected, (state) => {
        state.saving = false;
      });
  },
});

export default referenceDataSlice.reducer;
