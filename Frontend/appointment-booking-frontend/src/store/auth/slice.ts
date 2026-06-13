import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthSession, AuthState } from './types';

const initialState: AuthState = {
  session: null,
};

// The session is owned by the app shell, which sets it explicitly after every
// auth thunk resolves (login/register/extend/restore) and clears it on logout
// or failure. The auth thunks therefore only perform the network call; the
// store does not duplicate that bookkeeping in extraReducers.
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthSession(state, action: PayloadAction<AuthSession | null>) {
      state.session = action.payload;
    },
  },
});

export const { setAuthSession } = authSlice.actions;

export default authSlice.reducer;
