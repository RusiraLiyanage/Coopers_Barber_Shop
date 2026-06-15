import { getHairHistory, type HairHistoryRecord } from '../../lib/api';
import { createAppAsyncThunk } from '../createAppAsyncThunk';

const SLICE_NAME = 'hairHistory';

export const getHairHistoryAction = createAppAsyncThunk<HairHistoryRecord[]>(
  `${SLICE_NAME}/getHairHistory`,
  async () => getHairHistory(),
);
