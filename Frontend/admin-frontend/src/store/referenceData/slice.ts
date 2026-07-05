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
  pagingMeta: null,
  pagingMetaByType: {
    barber_capability: null,
    safety_trigger: null,
  },
  loadingByType: {
    barber_capability: false,
    safety_trigger: false,
  },
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

function incrementReferenceDataTotal(
  state: ReferenceDataState,
  item: ReferenceDataItemRecord,
): void {
  const typeMeta = state.pagingMetaByType[item.type];

  if (typeMeta) {
    typeMeta.totalItem += 1;
    typeMeta.totalPage = Math.ceil(typeMeta.totalItem / typeMeta.limit);
  }

  if (state.pagingMeta) {
    state.pagingMeta.totalItem += 1;
    state.pagingMeta.totalPage = Math.ceil(
      state.pagingMeta.totalItem / state.pagingMeta.limit,
    );
  }
}

function decrementReferenceDataTotal(
  state: ReferenceDataState,
  itemType: ReferenceDataItemRecord['type'],
): void {
  const typeMeta = state.pagingMetaByType[itemType];

  if (typeMeta) {
    typeMeta.totalItem = Math.max(0, typeMeta.totalItem - 1);
    typeMeta.totalPage = Math.ceil(typeMeta.totalItem / typeMeta.limit);
  }

  if (state.pagingMeta) {
    state.pagingMeta.totalItem = Math.max(0, state.pagingMeta.totalItem - 1);
    state.pagingMeta.totalPage = Math.ceil(
      state.pagingMeta.totalItem / state.pagingMeta.limit,
    );
  }
}

const referenceDataSlice = createSlice({
  name: 'referenceData',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getReferenceDataAction.pending, (state, action) => {
        const type = action.meta.arg?.type;

        if (type) {
          state.loadingByType[type] = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(getReferenceDataAction.fulfilled, (state, action) => {
        const type = action.meta.arg?.type;

        if (type) {
          state.items = [
            ...state.items.filter((item) => item.type !== type),
            ...action.payload.data,
          ];
          state.pagingMetaByType[type] = action.payload.pagingMeta;
        } else {
          state.items = action.payload.data;
          state.pagingMeta = action.payload.pagingMeta;
        }
        state.pagingMeta = action.payload.pagingMeta;
        if (type) {
          state.loadingByType[type] = false;
        } else {
          state.loading = false;
        }
      })
      .addCase(getReferenceDataAction.rejected, (state, action) => {
        const type = action.meta.arg?.type;

        if (type) {
          state.loadingByType[type] = false;
        } else {
          state.loading = false;
        }
        state.error =
          action.error.message ?? 'Unable to load reference data.';
      })
      .addCase(createReferenceDataItemAction.pending, (state) => {
        state.saving = true;
      })
      .addCase(createReferenceDataItemAction.fulfilled, (state, action) => {
        upsertReferenceDataItem(state.items, action.payload);
        incrementReferenceDataTotal(state, action.payload);
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
        decrementReferenceDataTotal(state, action.meta.arg.type);
        state.saving = false;
      })
      .addCase(deleteReferenceDataItemAction.rejected, (state) => {
        state.saving = false;
      });
  },
});

export default referenceDataSlice.reducer;
