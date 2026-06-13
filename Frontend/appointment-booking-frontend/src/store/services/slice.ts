import { createSlice } from '@reduxjs/toolkit';
import { getServicesAction } from './action';
import type { ServicesState } from './types';

const initialState: ServicesState = {
  items: [],
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
        state.loading = false;
      })
      .addCase(getServicesAction.rejected, (state) => {
        state.loading = false;
      });
  },
});

export default servicesSlice.reducer;
