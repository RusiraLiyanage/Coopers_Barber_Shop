import { createSlice } from '@reduxjs/toolkit';
import { getHairHistoryAction } from './action';
import type { HairHistoryState } from './types';

const initialState: HairHistoryState = {
  items: [],
  pagingMeta: null,
  loading: false,
  error: null,
};

const hairHistorySlice = createSlice({
  name: 'hairHistory',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getHairHistoryAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getHairHistoryAction.fulfilled, (state, action) => {
        state.items = action.payload.data;
        state.pagingMeta = action.payload.pagingMeta;
        state.loading = false;
      })
      .addCase(getHairHistoryAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to load hair history.';
      });
  },
});

export default hairHistorySlice.reducer;
