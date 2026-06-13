import { createSlice } from '@reduxjs/toolkit';
import { getAccountProfileAction, updateAccountProfileAction } from './action';
import type { AccountState } from './types';

const initialState: AccountState = {
  profile: null,
  loading: false,
  saving: false,
};

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    clearAccountProfile(state) {
      state.profile = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAccountProfileAction.pending, (state) => {
        state.loading = true;
      })
      .addCase(getAccountProfileAction.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.loading = false;
      })
      .addCase(getAccountProfileAction.rejected, (state) => {
        state.loading = false;
      })
      .addCase(updateAccountProfileAction.pending, (state) => {
        state.saving = true;
      })
      .addCase(updateAccountProfileAction.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.saving = false;
      })
      .addCase(updateAccountProfileAction.rejected, (state) => {
        state.saving = false;
      });
  },
});

export const { clearAccountProfile } = accountSlice.actions;

export default accountSlice.reducer;
