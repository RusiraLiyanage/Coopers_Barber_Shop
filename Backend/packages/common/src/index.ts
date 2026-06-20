export * from './bootstrap';
export * from './configs';
export * from './filters';
export * from './health';
export * from './middlewares';
export * from './pipes';
export * from './rate-limit';
export * from './services';
export * from './swagger';

// Re-exported so gateway-side code can reference the role enum without taking a
// direct dependency on @coopers/entities (it already depends on @coopers/common).
export { UserRole } from '@coopers/entities';
