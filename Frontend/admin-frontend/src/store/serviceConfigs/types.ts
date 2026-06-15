import type {
  ServiceAiConfigRecord,
  UpdateServiceAiConfigPayload,
} from '../../lib/api';

export type { ServiceAiConfigRecord, UpdateServiceAiConfigPayload };

export type ServiceConfigsState = {
  items: ServiceAiConfigRecord[];
  loading: boolean;
  saving: boolean;
  error: string | null;
};
