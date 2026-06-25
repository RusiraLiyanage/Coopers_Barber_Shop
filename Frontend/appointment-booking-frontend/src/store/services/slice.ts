import { createSlice } from '@reduxjs/toolkit';
import { getServicesAction } from './action';
import type { ServicesState } from './types';

const initialState: ServicesState = {
  items: [],
  loaded: false,
  loading: false,
};

const servicesSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getServicesAction.pending, (state) => {
        state.loading = true;
      })
      .addCase(getServicesAction.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loaded = true;
        state.loading = false;
      })
      .addCase(getServicesAction.rejected, (state) => {
        state.loaded = true;
        state.loading = false;
      });
  },
});

export default servicesSlice.reducer;
