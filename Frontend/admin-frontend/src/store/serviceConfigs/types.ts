import type {
  CreateServicePayload,
  ServiceAiConfigRecord,
  UpdateServicePayload,
} from '../../lib/api';

export type {
  CreateServicePayload,
  ServiceAiConfigRecord,
  UpdateServicePayload,
};

export type ServiceConfigsState = {
  items: ServiceAiConfigRecord[];
  loading: boolean;
  saving: boolean;
  error: string | null;
};
