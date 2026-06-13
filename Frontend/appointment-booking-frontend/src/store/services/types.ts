import type { ServiceOption } from '../../lib/api';

export type { ServiceOption };

export type ServicesState = {
  items: ServiceOption[];
  loading: boolean;
};
