import { SetMetadata } from '@nestjs/common';

export const SKIP_INTERNAL_SERVICE_AUTH = 'skipInternalServiceAuth';

// Marks a route as reachable without the gateway secret (e.g. health probes that
// hit the pod directly rather than coming through the booking-guard).
export const SkipInternalServiceAuth = () =>
  SetMetadata(SKIP_INTERNAL_SERVICE_AUTH, true);
