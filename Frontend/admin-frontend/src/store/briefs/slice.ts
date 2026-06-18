import { createSlice } from '@reduxjs/toolkit';
import { getAppointmentBriefsAction } from './action';
import type { BriefsState } from './types';

const initialState: BriefsState = {
  items: [],
  pagingMeta: null,
  loading: false,
  error: null,
};

const briefsSlice = createSlice({
  name: 'briefs',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getAppointmentBriefsAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAppointmentBriefsAction.fulfilled, (state, action) => {
        state.items = action.payload.data;
        state.pagingMeta = action.payload.pagingMeta;
        state.loading = false;
      })
      .addCase(getAppointmentBriefsAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to load briefs.';
      });
  },
});

export default briefsSlice.reducer;
