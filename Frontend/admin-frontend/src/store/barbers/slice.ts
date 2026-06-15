import { createSlice } from '@reduxjs/toolkit';
import {
  createBarberAction,
  getBarbersAction,
  updateBarberAction,
} from './action';
import type { BarberRecord, BarbersState } from './types';

const initialState: BarbersState = {
  items: [],
  loading: false,
  saving: false,
  error: null,
};

function upsertBarber(items: BarberRecord[], barber: BarberRecord): void {
  const existingIndex = items.findIndex((item) => item.id === barber.id);

  if (existingIndex >= 0) {
    items[existingIndex] = barber;
    return;
  }

  items.unshift(barber);
}

const barbersSlice = createSlice({
  name: 'barbers',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getBarbersAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getBarbersAction.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(getBarbersAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to load barbers.';
      })
      .addCase(createBarberAction.pending, (state) => {
        state.saving = true;
      })
      .addCase(createBarberAction.fulfilled, (state, action) => {
        upsertBarber(state.items, action.payload);
        state.saving = false;
      })
      .addCase(createBarberAction.rejected, (state) => {
        state.saving = false;
      })
      .addCase(updateBarberAction.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateBarberAction.fulfilled, (state, action) => {
        upsertBarber(state.items, action.payload);
        state.saving = false;
      })
      .addCase(updateBarberAction.rejected, (state) => {
        state.saving = false;
      });
  },
});

export default barbersSlice.reducer;
