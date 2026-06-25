export const REDIS_CACHE_KEYS = {
  consultation: {
    activeService: (serviceId: string) =>
      `consultation:active-service:${serviceId}`,
    activeSafetyRules: 'consultation:active-safety-rules',
    availableBarbers: 'consultation:available-barbers',
    clientHairHistory: (userId: string) =>
      `consultation:client-hair-history:${userId}`,
  },
} as const;
