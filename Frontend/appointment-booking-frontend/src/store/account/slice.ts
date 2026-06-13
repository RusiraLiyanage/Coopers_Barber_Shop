import { createSlice } from '@reduxjs/toolkit';
import { getAccountProfileAction, updateAccountProfileAction } from './action';
import type { AccountState } from './types';

const initialState: AccountState = {
  profile: null,
  loading: false,
  saving: false,
  error: null,
};

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    clearAccountProfile(state) {
      state.profile = null;
      state.error = null;
    },
    setResetStore() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAccountProfileAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getAccountProfileAction.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.loading = false;
      })
      .addCase(getAccountProfileAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Unable to load account profile';
      })
      .addCase(updateAccountProfileAction.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateAccountProfileAction.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.saving = false;
      })
      .addCase(updateAccountProfileAction.rejected, (state, action) => {
        state.saving = false;
        state.error =
          action.error.message ?? 'Unable to update account profile';
      });
  },
});

export const { clearAccountProfile, setResetStore } = accountSlice.actions;

export default accountSlice.reducer;
