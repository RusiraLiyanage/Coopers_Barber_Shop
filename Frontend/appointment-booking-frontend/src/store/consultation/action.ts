import { startConsultation, submitConsultation } from '../../lib/api';
import { createAppAsyncThunk } from '../createAppAsyncThunk';
import type {
  ConsultationStartResponse,
  ConsultationSubmitResponse,
  StartConsultationPayload,
  SubmitConsultationPayload,
} from './types';

const SLICE_NAME = 'consultation';

export const startConsultationAction = createAppAsyncThunk<
  ConsultationStartResponse,
  StartConsultationPayload
>(`${SLICE_NAME}/startConsultation`, async (payload) =>
  startConsultation(payload),
);

export const submitConsultationAction = createAppAsyncThunk<
  ConsultationSubmitResponse,
  SubmitConsultationPayload
>(`${SLICE_NAME}/submitConsultation`, async (payload) =>
  submitConsultation(payload),
);
