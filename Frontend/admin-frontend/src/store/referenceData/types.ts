import type {
  CreateReferenceDataItemPayload,
  ReferenceDataItemRecord,
  UpdateReferenceDataItemPayload,
} from '../../lib/api';

export type {
  CreateReferenceDataItemPayload,
  ReferenceDataItemRecord,
  UpdateReferenceDataItemPayload,
};

export type ReferenceDataState = {
  items: ReferenceDataItemRecord[];
  loading: boolean;
  saving: boolean;
  error: string | null;
};
