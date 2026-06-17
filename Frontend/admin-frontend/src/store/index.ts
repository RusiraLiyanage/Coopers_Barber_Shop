import {
  combineReducers,
  configureStore,
  createAction,
  type Action,
  type ThunkAction,
  type UnknownAction,
} from '@reduxjs/toolkit';
import authReducer from './auth/slice';
import barbersReducer from './barbers/slice';
import briefsReducer from './briefs/slice';
import hairHistoryReducer from './hairHistory/slice';
import referenceDataReducer from './referenceData/slice';
import safetyRulesReducer from './safetyRules/slice';
import serviceConfigsReducer from './serviceConfigs/slice';

export const resetStore = createAction('store/reset');

const combinedReducer = combineReducers({
  auth: authReducer,
  barbers: barbersReducer,
  briefs: briefsReducer,
  hairHistory: hairHistoryReducer,
  referenceData: referenceDataReducer,
  safetyRules: safetyRulesReducer,
  serviceConfigs: serviceConfigsReducer,
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
