import type {
  CreateReferenceDataItemPayload,
  PagingMeta,
  ReferenceDataItemRecord,
  ReferenceDataType,
  UpdateReferenceDataItemPayload,
} from '../../lib/api';

export type {
  CreateReferenceDataItemPayload,
  ReferenceDataItemRecord,
  UpdateReferenceDataItemPayload,
};

export type ReferenceDataState = {
  items: ReferenceDataItemRecord[];
  pagingMeta: PagingMeta | null;
  pagingMetaByType: Record<ReferenceDataType, PagingMeta | null>;
  loading: boolean;
  saving: boolean;
  error: string | null;
};
