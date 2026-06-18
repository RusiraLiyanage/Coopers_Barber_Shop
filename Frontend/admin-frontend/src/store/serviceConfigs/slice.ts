import { createSlice } from '@reduxjs/toolkit';
import {
  createServiceConfigAction,
  getServiceConfigsAction,
  updateServiceConfigAction,
} from './action';
import type { ServiceAiConfigRecord, ServiceConfigsState } from './types';

const initialState: ServiceConfigsState = {
  items: [],
  pagingMeta: null,
  loading: false,
  saving: false,
  error: null,
};

function upsertServiceConfig(
  items: ServiceAiConfigRecord[],
  service: ServiceAiConfigRecord,
): void {
  const existingIndex = items.findIndex((item) => item.id === service.id);

  if (existingIndex >= 0) {
    items[existingIndex] = service;
    return;
  }

  items.unshift(service);
}

const serviceConfigsSlice = createSlice({
  name: 'serviceConfigs',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getServiceConfigsAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getServiceConfigsAction.fulfilled, (state, action) => {
        state.items = action.payload.data;
        state.pagingMeta = action.payload.pagingMeta;
        state.loading = false;
      })
      .addCase(getServiceConfigsAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to load service config.';
      })
      .addCase(createServiceConfigAction.pending, (state) => {
        state.saving = true;
      })
      .addCase(createServiceConfigAction.fulfilled, (state, action) => {
        upsertServiceConfig(state.items, action.payload);
        state.saving = false;
      })
      .addCase(createServiceConfigAction.rejected, (state) => {
        state.saving = false;
      })
      .addCase(updateServiceConfigAction.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateServiceConfigAction.fulfilled, (state, action) => {
        upsertServiceConfig(state.items, action.payload);
        state.saving = false;
      })
      .addCase(updateServiceConfigAction.rejected, (state) => {
        state.saving = false;
      });
  },
});

export default serviceConfigsSlice.reducer;
