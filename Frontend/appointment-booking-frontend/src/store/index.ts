import {
  combineReducers,
  configureStore,
  createAction,
  type Action,
  type ThunkAction,
  type UnknownAction,
} from '@reduxjs/toolkit';
import accountReducer from './account/slice';
import appointmentsReducer from './appointments/slice';
import authReducer from './auth/slice';
import consultationReducer from './consultation/slice';
import servicesReducer from './services/slice';

// Single, global "wipe everything back to initial state" action — dispatched on
// logout so no user's data lingers in the store for the next session.
export const resetStore = createAction('store/reset');

const combinedReducer = combineReducers({
  account: accountReducer,
  appointments: appointmentsReducer,
  auth: authReducer,
  consultation: consultationReducer,
  services: servicesReducer,
});

const rootReducer = (
  state: ReturnType<typeof combinedReducer> | undefined,
  action: UnknownAction,
) => {
  if (action.type === resetStore.type) {
    return combinedReducer(undefined, action);
  }

  return combinedReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Rejected thunks carry the original Error instance (see
        // createAppAsyncThunk) so components can use `instanceof`; it never
        // reaches the state tree, so ignore it on the action.
        ignoredActionPaths: ['error', 'meta.arg', 'meta.baseQueryMeta'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
