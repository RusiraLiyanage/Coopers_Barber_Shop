import {
  combineReducers,
  configureStore,
  type Action,
  type ThunkAction,
  type UnknownAction,
} from '@reduxjs/toolkit';
import accountReducer from './account/slice';
import appointmentsReducer from './appointments/slice';
import authReducer from './auth/slice';
import servicesReducer from './services/slice';

const combinedReducer = combineReducers({
  account: accountReducer,
  appointments: appointmentsReducer,
  auth: authReducer,
  services: servicesReducer,
});

const rootReducer = (
  state: ReturnType<typeof combinedReducer> | undefined,
  action: UnknownAction,
) => {
  if (action.type === 'RESET') {
    return combinedReducer(undefined, action);
  }

  return combinedReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
