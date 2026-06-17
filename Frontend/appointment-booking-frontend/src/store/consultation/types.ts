import type {
  ConsultationAnswerPayload,
  ConsultationStartResponse,
  ConsultationSubmitResponse,
} from '../../lib/api';

export type {
  ConsultationAnswerPayload,
  ConsultationStartResponse,
  ConsultationSubmitResponse,
};

export type StartConsultationPayload = {
  serviceId: string;
};

export type SubmitConsultationPayload = {
  serviceId: string;
  answers: ConsultationAnswerPayload[];
};

export type ConsultationState = {
  startResult: ConsultationStartResponse | null;
  result: ConsultationSubmitResponse | null;
  loadingStart: boolean;
  submitting: boolean;
  error: string | null;
};
