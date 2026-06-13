import { createSlice } from '@reduxjs/toolkit';
import { getServicesAction } from './action';
import type { ServicesState } from './types';

const initialState: ServicesState = {
  items: [],
  loading: false,
  error: null,
};

const servicesSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    setResetStore() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getServicesAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getServicesAction.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(getServicesAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to load services';
      });
  },
});

export const { setResetStore } = servicesSlice.actions;

export default servicesSlice.reducer;
