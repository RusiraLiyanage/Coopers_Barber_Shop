import { Space, Tag, Typography } from 'antd';
import { format } from 'date-fns';

import { SAStatusTag } from '../../components/common';
import type {
  BarberRecord,
  ServiceAiConfigRecord,
  StaffGender,
} from '../../lib/api';
import { BOOTSTRAP_STAFF_ID, BOOTSTRAP_STAFF_NAME } from './constants';

export function toTitleCase(value: string | null | undefined): string {
  if (!value) {
    return 'Unknown';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatStaffGender(
  gender: StaffGender | null | undefined,
): string {
  switch (gender) {
    case 'female':
      return 'Female';
    case 'male':
      return 'Male';
    case 'non_binary':
      return 'Non-binary';
    case 'unspecified':
    default:
      return 'Not specified';
  }
}

export function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'd MMM yyyy, h:mm a');
}

export function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'd MMM yyyy');
}

export function compactStringArray(values: string[] | undefined): string[] {
  return (values ?? [])
    .map((value) => value.trim())
    .filter((value, index, collection) => {
      return value.length > 0 && collection.indexOf(value) === index;
    });
}

export function compactOptionalString(
  value: string | undefined,
): string | undefined {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : undefined;
}

export function filterSelectOption(
  inputValue: string,
  option?: { label?: unknown; value?: unknown },
): boolean {
  const normalizedInput = inputValue.trim().toLowerCase();

  if (!normalizedInput) {
    return true;
  }

  const label = String(option?.label ?? '').toLowerCase();
  const value = String(option?.value ?? '').toLowerCase();

  return label.includes(normalizedInput) || value.includes(normalizedInput);
}

export function renderTags(values: string[] | undefined, emptyText = 'None') {
  const tags = compactStringArray(values);

  if (tags.length === 0) {
    return <Typography.Text type="secondary">{emptyText}</Typography.Text>;
  }

  return (
    <Space size={[4, 4]} wrap>
      {tags.map((value) => (
        <Tag key={value}>{value}</Tag>
      ))}
    </Space>
  );
}

export function renderMappedTags(
  values: string[] | undefined,
  labelByValue: Map<string, string>,
  emptyText = 'None',
) {
  const tags = compactStringArray(values);

  if (tags.length === 0) {
    return <Typography.Text type="secondary">{emptyText}</Typography.Text>;
  }

  return (
    <Space size={[4, 4]} wrap>
      {tags.map((value) => (
        <Tag key={value}>{labelByValue.get(value) ?? value}</Tag>
      ))}
    </Space>
  );
}

export function getStatusTag(active: boolean, available?: boolean) {
  if (!active) {
    return <SAStatusTag color="default">Inactive</SAStatusTag>;
  }

  if (available === false) {
    return <SAStatusTag color="gold">Unavailable</SAStatusTag>;
  }

  return <SAStatusTag color="green">Active</SAStatusTag>;
}

function getAppointmentStatusCategory(status: string) {
  switch (status) {
    case 'cancelled':
    case 'cancelled_by_client':
      return 'cancelledClient';
    case 'cancelled_by_barber':
      return 'cancelledBarber';
    default:
      return 'scheduled';
  }
}

function getAppointmentStatusLabel(status: string) {
  switch (getAppointmentStatusCategory(status)) {
    case 'cancelledClient':
      return 'Cancelled by client';
    case 'cancelledBarber':
      return 'Cancelled by barber';
    default:
      return 'Booked';
  }
}

function getAppointmentStatusTagColor(status: string) {
  switch (getAppointmentStatusCategory(status)) {
    case 'cancelledClient':
      return 'red';
    case 'cancelledBarber':
      return 'gold';
    default:
      return 'green';
  }
}

export function renderAppointmentStatusTag(status: string) {
  return (
    <Tag color={getAppointmentStatusTagColor(status)}>
      {getAppointmentStatusLabel(status)}
    </Tag>
  );
}

export function isAdminVisibleBarber(barber: BarberRecord): boolean {
  const isBootstrapId = barber.id === BOOTSTRAP_STAFF_ID;
  const isDefaultBookingStaff =
    barber.displayName === BOOTSTRAP_STAFF_NAME &&
    barber.email === null &&
    compactStringArray(barber.skills).length === 0;

  return !isBootstrapId && !isDefaultBookingStaff;
}

export function isConfiguredService(
  service: ServiceAiConfigRecord,
  knownCapabilityValues: Set<string>,
): boolean {
  const requiredSkills = compactStringArray(service.requiredSkills);

  return (
    requiredSkills.length > 0 &&
    requiredSkills.every((skill) => knownCapabilityValues.has(skill))
  );
}

export function getServiceSetupTag(
  service: ServiceAiConfigRecord,
  knownCapabilityValues: Set<string>,
) {
  if (isConfiguredService(service, knownCapabilityValues)) {
    return <SAStatusTag color="green">Ready</SAStatusTag>;
  }

  return <SAStatusTag color="gold">Needs setup</SAStatusTag>;
}
