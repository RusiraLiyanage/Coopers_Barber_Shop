import {
  getHairHistory,
  type HairHistoryRecord,
  type PaginatedResponse,
  type PaginationRequest,
} from '../../lib/api';
import { createAppAsyncThunk } from '../createAppAsyncThunk';

const SLICE_NAME = 'hairHistory';

export const getHairHistoryAction = createAppAsyncThunk<
  PaginatedResponse<HairHistoryRecord>,
  PaginationRequest | undefined
>(
  `${SLICE_NAME}/getHairHistory`,
  async (pagination) => getHairHistory(pagination),
);
