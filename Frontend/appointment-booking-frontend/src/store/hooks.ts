import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from 'react-redux';
import type { AppDispatch, RootState } from './index';

type DispatchFunc = () => AppDispatch;

export const useAppDispatch: DispatchFunc = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export const useAppSelectorWithParams = <T, P>(
  selector: (state: RootState, params: P) => T,
  params: P,
): T => useSelector((state: RootState) => selector(state, params));
