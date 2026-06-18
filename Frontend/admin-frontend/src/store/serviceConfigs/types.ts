import type {
  CreateServicePayload,
  PagingMeta,
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
  pagingMeta: PagingMeta | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
};
