import type {
  CreateBarberPayload,
  CreateSafetyRulePayload,
} from '../../lib/api';
import { compactOptionalString, compactStringArray } from './formatters';
import type { BarberFormValues, SafetyRuleFormValues } from './types';

export function createBarberPayload(
  values: BarberFormValues,
): CreateBarberPayload {
  return {
    displayName: values.displayName.trim(),
    email: compactOptionalString(values.email),
    gender: values.gender,
    role: values.role,
    timezone: values.timezone.trim(),
    skills: compactStringArray(values.skills),
    rating: values.rating,
    available: values.available,
    active: values.active,
  };
}

export function createSafetyPayload(
  values: SafetyRuleFormValues,
): CreateSafetyRulePayload {
  return {
    condition: values.condition.trim(),
    serviceIds: compactStringArray(values.serviceIds),
    message: values.message.trim(),
    severity: values.severity,
    active: values.active,
  };
}
