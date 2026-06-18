import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { format } from 'date-fns';
import { SACard, SAModalHeader, SAStatusTag } from '../components/common';
import { getServiceAiStarterConfig } from '../lib/adminOptions';
import { createAdminInvite } from '../lib/api';
import {
  getUserFriendlyErrorMessage,
  isSessionExpiredError,
} from '../lib/errors';
import {
  createBarberAction,
  deleteBarberAction,
  getBarbersAction,
  updateBarberAction,
} from '../store/barbers/action';
import {
  selectBarbers,
  selectBarbersLoading,
  selectBarbersPagingMeta,
  selectBarbersSaving,
} from '../store/barbers/selector';
import { getAppointmentBriefsAction } from '../store/briefs/action';
import {
  selectAppointmentBriefs,
  selectAppointmentBriefsLoading,
  selectAppointmentBriefsPagingMeta,
} from '../store/briefs/selector';
import { getHairHistoryAction } from '../store/hairHistory/action';
import {
  selectHairHistory,
  selectHairHistoryLoading,
  selectHairHistoryPagingMeta,
} from '../store/hairHistory/selector';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createReferenceDataItemAction,
  deleteReferenceDataItemAction,
  getReferenceDataAction,
  updateReferenceDataItemAction,
} from '../store/referenceData/action';
import {
  selectReferenceData,
  selectReferenceDataLoading,
  selectReferenceDataPagingMetaByType,
  selectReferenceDataSaving,
} from '../store/referenceData/selector';
import {
  createSafetyRuleAction,
  getSafetyRulesAction,
  updateSafetyRuleAction,
} from '../store/safetyRules/action';
import {
  selectSafetyRules,
  selectSafetyRulesLoading,
  selectSafetyRulesPagingMeta,
  selectSafetyRulesSaving,
} from '../store/safetyRules/selector';
import {
  createServiceConfigAction,
  getServiceConfigsAction,
  updateServiceConfigAction,
} from '../store/serviceConfigs/action';
import {
  selectServiceConfigs,
  selectServiceConfigsLoading,
  selectServiceConfigsPagingMeta,
  selectServiceConfigsSaving,
} from '../store/serviceConfigs/selector';
import type {
  AppointmentBriefRecord,
  AdminInviteResponse,
  BarberRecord,
  CreateBarberPayload,
  CreateSafetyRulePayload,
  HairHistoryRecord,
  ReferenceDataItemRecord,
  ReferenceDataType,
  SafetyRuleRecord,
  ServiceAiConfigRecord,
  ServiceComplexity,
  StaffGender,
  StaffRole,
} from '../lib/api';
import './AdminDashboard.css';

type AdminTabKey =
  | 'overview'
  | 'barbers'
  | 'services'
  | 'referenceData'
  | 'safety'
  | 'briefs'
  | 'hairHistory'
  | 'invites';

type BarberFormValues = {
  displayName: string;
  email?: string;
  gender: StaffGender;
  role: StaffRole;
  timezone: string;
  skills: string[];
  rating: number;
  available: boolean;
  active: boolean;
};

type ServiceConfigFormValues = {
  name: string;
  durationMinutes: number;
  requiredSkills: string[];
  safetyTriggers: string[];
  complexity: ServiceComplexity;
  isActive: boolean;
};

type SafetyRuleFormValues = {
  condition: string;
  serviceIds: string[];
  message: string;
  severity: 'low' | 'medium' | 'high';
  active: boolean;
};

type InviteFormValues = {
  email: string;
  expiresInDays: number;
};

type ReferenceDataFormValues = {
  label: string;
};

const STAFF_ROLE_OPTIONS = [
  { label: 'Junior', value: 'junior' },
  { label: 'Senior', value: 'senior' },
  { label: 'Owner', value: 'owner' },
];

const STAFF_GENDER_OPTIONS = [
  { label: 'Not specified', value: 'unspecified' },
  { label: 'Female', value: 'female' },
  { label: 'Male', value: 'male' },
  { label: 'Non-binary', value: 'non_binary' },
];

const COMPLEXITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const SEVERITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const BOOTSTRAP_STAFF_ID = '11111111-1111-1111-1111-111111111111';
const BOOTSTRAP_STAFF_NAME = 'Main Staff';
const DEFAULT_TABLE_PAGE_SIZE = 8;
const REFERENCE_TABLE_PAGE_SIZE = 6;

type TablePage = {
  page: number;
  limit: number;
};

function toTitleCase(value: string | null | undefined): string {
  if (!value) {
    return 'Unknown';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatStaffGender(gender: StaffGender | null | undefined): string {
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

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, 'd MMM yyyy, h:mm a');
}

function compactStringArray(values: string[] | undefined): string[] {
  return (values ?? [])
    .map((value) => value.trim())
    .filter((value, index, collection) => {
      return value.length > 0 && collection.indexOf(value) === index;
    });
}

function compactOptionalString(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : undefined;
}

function decodeEscapedUnicode(value: string) {
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
}

function cleanBriefText(value: string) {
  return decodeEscapedUnicode(value)
    .replace(/\u2014/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

function filterSelectOption(
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

function renderTags(values: string[] | undefined, emptyText = 'None') {
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

function renderMappedTags(
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

function getStatusTag(active: boolean, available?: boolean) {
  if (!active) {
    return <SAStatusTag color="default">Inactive</SAStatusTag>;
  }

  if (available === false) {
    return <SAStatusTag color="gold">Unavailable</SAStatusTag>;
  }

  return <SAStatusTag color="green">Active</SAStatusTag>;
}

function getCustomerName(brief: AppointmentBriefRecord): string {
  const { firstName, lastName, email } = brief.booking.customer;
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  return fullName || email;
}

function getBriefBarberName(brief: AppointmentBriefRecord): string {
  return (
    brief.barber?.displayName ?? brief.booking.staff?.displayName ?? 'Unassigned'
  );
}

function getBriefSafetyLines(brief: AppointmentBriefRecord): string[] {
  return (brief.safetyNotes ?? '')
    .split('\n')
    .map(cleanBriefText)
    .filter(Boolean);
}

function formatBriefLabel(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getBriefSummaryLines(brief: AppointmentBriefRecord): string[] {
  return cleanBriefText(brief.clientSummary)
    .split(/\s+\|\s+|(?<=\.)\s+(?=[A-Z][a-z]+(?:\s+[a-z]+)?:)/)
    .map((line) =>
      line.replace(/^([a-z][a-z0-9-]*):/i, (_, label: string) => {
        return `${formatBriefLabel(label)}:`;
      }),
    )
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildPrepBriefText(brief: AppointmentBriefRecord): string {
  const safetyLines = getBriefSafetyLines(brief);
  const summaryLines = getBriefSummaryLines(brief);
  const generationText =
    brief.generationSource === 'claude'
      ? `Claude${brief.generationModel ? ` (${brief.generationModel})` : ''}`
      : 'Deterministic fallback';

  return [
    `Customer: ${getCustomerName(brief)}`,
    `Service: ${brief.booking.service.name}`,
    `Appointment: ${formatDateTime(brief.booking.startAt)}`,
    `Barber: ${getBriefBarberName(brief)}`,
    `Generated by: ${generationText}`,
    '',
    'Client summary:',
    summaryLines.length > 0
      ? summaryLines.map((line) => `- ${line}`).join('\n')
      : 'Not recorded',
    '',
    'Hair state:',
    compactStringArray(brief.hairState).map(cleanBriefText).join(', ') ||
      'None recorded',
    '',
    'Desired look:',
    brief.desiredLook ? cleanBriefText(brief.desiredLook) : 'Not provided',
    '',
    'Safety notes:',
    safetyLines.length > 0 ? safetyLines.join('\n') : 'No safety notes',
  ].join('\n');
}

function renderBriefGenerationTag(brief: AppointmentBriefRecord) {
  if (brief.generationSource === 'claude') {
    return <Tag color="green">{brief.generationModel ?? 'Claude'}</Tag>;
  }

  return <Tag color="gold">Fallback</Tag>;
}

function getBriefGoalPhotoSrc(brief: AppointmentBriefRecord): string | null {
  if (!brief.goalPhoto) {
    return null;
  }

  return `data:${brief.goalPhoto.mediaType};base64,${brief.goalPhoto.data}`;
}

function isAdminVisibleBarber(barber: BarberRecord): boolean {
  const isBootstrapId = barber.id === BOOTSTRAP_STAFF_ID;
  const isDefaultBookingStaff =
    barber.displayName === BOOTSTRAP_STAFF_NAME &&
    barber.email === null &&
    compactStringArray(barber.skills).length === 0;

  return !isBootstrapId && !isDefaultBookingStaff;
}

function isConfiguredService(
  service: ServiceAiConfigRecord,
  knownCapabilityValues: Set<string>,
): boolean {
  const requiredSkills = compactStringArray(service.requiredSkills);

  return (
    requiredSkills.length > 0 &&
    requiredSkills.every((skill) => knownCapabilityValues.has(skill))
  );
}

function getServiceSetupTag(
  service: ServiceAiConfigRecord,
  knownCapabilityValues: Set<string>,
) {
  if (isConfiguredService(service, knownCapabilityValues)) {
    return <SAStatusTag color="green">Ready</SAStatusTag>;
  }

  return <SAStatusTag color="gold">Needs setup</SAStatusTag>;
}

function createBarberPayload(
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

function createSafetyPayload(
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

export default function AdminDashboard() {
  const dispatch = useAppDispatch();
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState<AdminTabKey>('overview');
  const [barberForm] = Form.useForm<BarberFormValues>();
  const [serviceConfigForm] = Form.useForm<ServiceConfigFormValues>();
  const [safetyRuleForm] = Form.useForm<SafetyRuleFormValues>();
  const [inviteForm] = Form.useForm<InviteFormValues>();
  const [referenceDataForm] = Form.useForm<ReferenceDataFormValues>();
  const [barberModalOpen, setBarberModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [referenceDataModalOpen, setReferenceDataModalOpen] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [createdInvite, setCreatedInvite] =
    useState<AdminInviteResponse | null>(null);
  const [editingBarber, setEditingBarber] = useState<BarberRecord | null>(
    null,
  );
  const [editingService, setEditingService] =
    useState<ServiceAiConfigRecord | null>(null);
  const [editingSafetyRule, setEditingSafetyRule] =
    useState<SafetyRuleRecord | null>(null);
  const [editingReferenceDataItem, setEditingReferenceDataItem] =
    useState<ReferenceDataItemRecord | null>(null);
  const [referenceDataType, setReferenceDataType] =
    useState<ReferenceDataType>('barber_capability');
  const [selectedBrief, setSelectedBrief] =
    useState<AppointmentBriefRecord | null>(null);
  const [barbersPage, setBarbersPage] = useState<TablePage>({
    page: 1,
    limit: DEFAULT_TABLE_PAGE_SIZE,
  });
  const [servicesPage, setServicesPage] = useState<TablePage>({
    page: 1,
    limit: DEFAULT_TABLE_PAGE_SIZE,
  });
  const [safetyPage, setSafetyPage] = useState<TablePage>({
    page: 1,
    limit: DEFAULT_TABLE_PAGE_SIZE,
  });
  const [barberCapabilityPage, setBarberCapabilityPage] = useState<TablePage>({
    page: 1,
    limit: REFERENCE_TABLE_PAGE_SIZE,
  });
  const [safetyTriggerPage, setSafetyTriggerPage] = useState<TablePage>({
    page: 1,
    limit: REFERENCE_TABLE_PAGE_SIZE,
  });
  const [briefsPage, setBriefsPage] = useState<TablePage>({
    page: 1,
    limit: DEFAULT_TABLE_PAGE_SIZE,
  });
  const [hairHistoryPage, setHairHistoryPage] = useState<TablePage>({
    page: 1,
    limit: DEFAULT_TABLE_PAGE_SIZE,
  });
  const watchedServiceName = Form.useWatch('name', serviceConfigForm);

  const barbers = useAppSelector(selectBarbers);
  const referenceData = useAppSelector(selectReferenceData);
  const serviceConfigs = useAppSelector(selectServiceConfigs);
  const safetyRules = useAppSelector(selectSafetyRules);
  const appointmentBriefs = useAppSelector(selectAppointmentBriefs);
  const hairHistory = useAppSelector(selectHairHistory);
  const barberCapabilityPagingMeta = useAppSelector(
    selectReferenceDataPagingMetaByType('barber_capability'),
  );
  const safetyTriggerPagingMeta = useAppSelector(
    selectReferenceDataPagingMetaByType('safety_trigger'),
  );
  const barbersPagingMeta = useAppSelector(selectBarbersPagingMeta);
  const serviceConfigsPagingMeta = useAppSelector(
    selectServiceConfigsPagingMeta,
  );
  const safetyRulesPagingMeta = useAppSelector(selectSafetyRulesPagingMeta);
  const briefsPagingMeta = useAppSelector(selectAppointmentBriefsPagingMeta);
  const hairHistoryPagingMeta = useAppSelector(selectHairHistoryPagingMeta);
  const barbersLoading = useAppSelector(selectBarbersLoading);
  const referenceDataLoading = useAppSelector(selectReferenceDataLoading);
  const referenceDataSaving = useAppSelector(selectReferenceDataSaving);
  const serviceConfigsLoading = useAppSelector(selectServiceConfigsLoading);
  const safetyRulesLoading = useAppSelector(selectSafetyRulesLoading);
  const briefsLoading = useAppSelector(selectAppointmentBriefsLoading);
  const hairHistoryLoading = useAppSelector(selectHairHistoryLoading);
  const barbersSaving = useAppSelector(selectBarbersSaving);
  const serviceConfigsSaving = useAppSelector(selectServiceConfigsSaving);
  const safetyRulesSaving = useAppSelector(selectSafetyRulesSaving);

  const serviceNameById = useMemo(
    () =>
      new Map(
        serviceConfigs.map((service) => [service.id, service.name] as const),
      ),
    [serviceConfigs],
  );

  const barberCapabilityItems = useMemo(
    () =>
      referenceData.filter(
        (item) => item.type === 'barber_capability',
      ),
    [referenceData],
  );

  const safetyTriggerItems = useMemo(
    () => referenceData.filter((item) => item.type === 'safety_trigger'),
    [referenceData],
  );

  const barberCapabilityOptions = useMemo(
    () =>
      barberCapabilityItems.map((item) => ({
        label: item.label,
        value: item.value,
      })),
    [barberCapabilityItems],
  );

  const safetyTriggerOptions = useMemo(
    () =>
      safetyTriggerItems.map((item) => ({
        label: item.label,
        value: item.value,
      })),
    [safetyTriggerItems],
  );

  const barberCapabilityLabelByValue = useMemo(
    () =>
      new Map(
        barberCapabilityItems.map((item) => [item.value, item.label] as const),
      ),
    [barberCapabilityItems],
  );

  const safetyTriggerLabelByValue = useMemo(
    () =>
      new Map(
        safetyTriggerItems.map((item) => [item.value, item.label] as const),
      ),
    [safetyTriggerItems],
  );

  const knownBarberCapabilities = useMemo(
    () => new Set(barberCapabilityItems.map((item) => item.value)),
    [barberCapabilityItems],
  );

  const visibleBarbers = useMemo(
    () => barbers.filter(isAdminVisibleBarber),
    [barbers],
  );

  const showRequestError = useCallback(
    (error: unknown) => {
      if (isSessionExpiredError(error)) {
        return;
      }

      messageApi.error(getUserFriendlyErrorMessage(error));
    },
    [messageApi],
  );

  const configuredServiceConfigs = useMemo(
    () =>
      serviceConfigs.filter((service) =>
        isConfiguredService(service, knownBarberCapabilities),
      ),
    [knownBarberCapabilities, serviceConfigs],
  );

  const servicesNeedingSetup = useMemo(
    () =>
      serviceConfigs.filter(
        (service) => !isConfiguredService(service, knownBarberCapabilities),
      ),
    [knownBarberCapabilities, serviceConfigs],
  );

  const sortedServiceConfigs = useMemo(
    () =>
      [...serviceConfigs].sort((left, right) => {
        const leftConfigured = isConfiguredService(
          left,
          knownBarberCapabilities,
        );
        const rightConfigured = isConfiguredService(
          right,
          knownBarberCapabilities,
        );

        if (leftConfigured !== rightConfigured) {
          return leftConfigured ? 1 : -1;
        }

        return left.name.localeCompare(right.name);
      }),
    [knownBarberCapabilities, serviceConfigs],
  );

  const serviceOptions = useMemo(
    () =>
      configuredServiceConfigs.map((service) => ({
        label: service.name,
        value: service.id,
      })),
    [configuredServiceConfigs],
  );

  const unconfiguredServiceOptions = useMemo(
    () =>
      servicesNeedingSetup.map((service) => ({
        label: service.name,
        value: service.id,
      })),
    [servicesNeedingSetup],
  );

  const selectedServiceStarterConfig = useMemo(
    () => getServiceAiStarterConfig(watchedServiceName),
    [watchedServiceName],
  );

  const loadAdminData = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(getBarbersAction(barbersPage)).unwrap(),
        dispatch(
          getReferenceDataAction({
            type: 'barber_capability',
            ...barberCapabilityPage,
          }),
        ).unwrap(),
        dispatch(
          getReferenceDataAction({
            type: 'safety_trigger',
            ...safetyTriggerPage,
          }),
        ).unwrap(),
        dispatch(getServiceConfigsAction(servicesPage)).unwrap(),
        dispatch(getSafetyRulesAction(safetyPage)).unwrap(),
        dispatch(getAppointmentBriefsAction(briefsPage)).unwrap(),
        dispatch(getHairHistoryAction(hairHistoryPage)).unwrap(),
      ]);
    } catch (error) {
      showRequestError(error);
    }
  }, [
    barberCapabilityPage,
    barbersPage,
    briefsPage,
    dispatch,
    hairHistoryPage,
    safetyPage,
    safetyTriggerPage,
    servicesPage,
    showRequestError,
  ]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const overviewStats = useMemo(
    () => [
      {
        label: 'Active barbers',
        value: visibleBarbers.filter((barber) => barber.active).length,
      },
      {
        label: 'Capabilities',
        value: barberCapabilityItems.length,
      },
      {
        label: 'Safety triggers',
        value: safetyTriggerItems.length,
      },
      {
        label: 'Services ready for AI',
        value: configuredServiceConfigs.length,
      },
      {
        label: 'Services needing setup',
        value: servicesNeedingSetup.length,
      },
      {
        label: 'Active safety rules',
        value: safetyRules.filter((rule) => rule.active).length,
      },
      {
        label: 'Generated briefs',
        value: appointmentBriefs.length,
      },
      {
        label: 'Hair history records',
        value: hairHistory.length,
      },
    ],
    [
      appointmentBriefs.length,
      barberCapabilityItems.length,
      visibleBarbers,
      configuredServiceConfigs.length,
      servicesNeedingSetup.length,
      hairHistory.length,
      safetyTriggerItems.length,
      safetyRules,
    ],
  );

  const servicesMissingSkills = useMemo(
    () =>
      serviceConfigs.filter(
        (service) => !isConfiguredService(service, knownBarberCapabilities),
      ),
    [knownBarberCapabilities, serviceConfigs],
  );

  const barbersMissingSkills = useMemo(
    () =>
      visibleBarbers.filter(
        (barber) => compactStringArray(barber.skills).length === 0,
      ),
    [visibleBarbers],
  );

  const showCreateBarberModal = () => {
    setEditingBarber(null);
    barberForm.setFieldsValue({
      displayName: '',
      email: '',
      gender: 'unspecified',
      role: 'junior',
      timezone: 'Australia/Sydney',
      skills: [],
      rating: 0,
      available: true,
      active: true,
    });
    setBarberModalOpen(true);
  };

  const showEditBarberModal = (barber: BarberRecord) => {
    setEditingBarber(barber);
    barberForm.setFieldsValue({
      displayName: barber.displayName,
      email: barber.email ?? '',
      gender: barber.gender ?? 'unspecified',
      role: barber.role,
      timezone: barber.timezone,
      skills: barber.skills,
      rating: barber.rating,
      available: barber.available,
      active: barber.active,
    });
    setBarberModalOpen(true);
  };

  const showCreateServiceModal = () => {
    setEditingService(null);
    serviceConfigForm.setFieldsValue({
      name: '',
      durationMinutes: 30,
      requiredSkills: [],
      safetyTriggers: [],
      complexity: 'low',
      isActive: true,
    });
    setServiceModalOpen(true);
  };

  const showServiceModal = (service: ServiceAiConfigRecord) => {
    setEditingService(service);
    serviceConfigForm.setFieldsValue({
      name: service.name,
      durationMinutes: service.durationMinutes,
      requiredSkills: service.requiredSkills,
      safetyTriggers: service.safetyTriggers,
      complexity: service.complexity,
      isActive: service.isActive,
    });
    setServiceModalOpen(true);
  };

  const handleSelectServiceToConfigure = (serviceId: string) => {
    const service = serviceConfigs.find((item) => item.id === serviceId);

    if (service) {
      showServiceModal(service);
    }
  };

  const showCreateSafetyRuleModal = () => {
    setEditingSafetyRule(null);
    safetyRuleForm.setFieldsValue({
      condition: '',
      serviceIds: [],
      message: '',
      severity: 'medium',
      active: true,
    });
    setSafetyModalOpen(true);
  };

  const showCreateReferenceDataModal = (type: ReferenceDataType) => {
    setEditingReferenceDataItem(null);
    setReferenceDataType(type);
    referenceDataForm.setFieldsValue({
      label: '',
    });
    setReferenceDataModalOpen(true);
  };

  const showEditReferenceDataModal = (item: ReferenceDataItemRecord) => {
    setEditingReferenceDataItem(item);
    setReferenceDataType(item.type);
    referenceDataForm.setFieldsValue({
      label: item.label,
    });
    setReferenceDataModalOpen(true);
  };

  const showEditSafetyRuleModal = (safetyRule: SafetyRuleRecord) => {
    setEditingSafetyRule(safetyRule);
    safetyRuleForm.setFieldsValue({
      condition: safetyRule.condition,
      serviceIds: safetyRule.serviceIds,
      message: safetyRule.message,
      severity: safetyRule.severity,
      active: safetyRule.active,
    });
    setSafetyModalOpen(true);
  };

  const handleSaveBarber = async () => {
    const values = await barberForm.validateFields();
    const payload = createBarberPayload(values);

    try {
      if (editingBarber) {
        await dispatch(
          updateBarberAction({ id: editingBarber.id, payload }),
        ).unwrap();
      } else {
        await dispatch(createBarberAction(payload)).unwrap();
      }

      await dispatch(getBarbersAction(barbersPage)).unwrap();
      messageApi.success('Barber profile saved.');
      setBarberModalOpen(false);
    } catch (error) {
      showRequestError(error);
    }
  };

  const handleDeleteBarber = async (barber: BarberRecord) => {
    try {
      await dispatch(deleteBarberAction(barber.id)).unwrap();
      await dispatch(getBarbersAction(barbersPage)).unwrap();
      messageApi.success(`${barber.displayName} deleted.`);
    } catch (error) {
      showRequestError(error);
    }
  };

  const handleSaveServiceConfig = async () => {
    const values = await serviceConfigForm.validateFields();

    try {
      const payload = {
        name: values.name.trim(),
        durationMinutes: values.durationMinutes,
        requiredSkills: compactStringArray(values.requiredSkills),
        safetyTriggers: compactStringArray(values.safetyTriggers),
        complexity: values.complexity,
        isActive: values.isActive,
      };

      if (editingService) {
        await dispatch(
          updateServiceConfigAction({
            id: editingService.id,
            payload,
          }),
        ).unwrap();
      } else {
        await dispatch(createServiceConfigAction(payload)).unwrap();
      }

      await dispatch(getServiceConfigsAction(servicesPage)).unwrap();
      messageApi.success('Service saved.');
      setServiceModalOpen(false);
    } catch (error) {
      showRequestError(error);
    }
  };

  const handleApplyServiceStarterConfig = () => {
    if (!selectedServiceStarterConfig) {
      return;
    }

    serviceConfigForm.setFieldsValue({
      name: serviceConfigForm.getFieldValue('name'),
      durationMinutes: serviceConfigForm.getFieldValue('durationMinutes') ?? 30,
      requiredSkills: selectedServiceStarterConfig.requiredSkills,
      safetyTriggers: selectedServiceStarterConfig.safetyTriggers,
      complexity: selectedServiceStarterConfig.complexity,
      isActive: serviceConfigForm.getFieldValue('isActive') ?? true,
    });
  };

  const handleSaveSafetyRule = async () => {
    const values = await safetyRuleForm.validateFields();
    const payload = createSafetyPayload(values);

    try {
      if (editingSafetyRule) {
        await dispatch(
          updateSafetyRuleAction({ id: editingSafetyRule.id, payload }),
        ).unwrap();
      } else {
        await dispatch(createSafetyRuleAction(payload)).unwrap();
      }

      await dispatch(getSafetyRulesAction(safetyPage)).unwrap();
      messageApi.success('Safety rule saved.');
      setSafetyModalOpen(false);
    } catch (error) {
      showRequestError(error);
    }
  };

  const handleSaveReferenceDataItem = async () => {
    const values = await referenceDataForm.validateFields();

    try {
      if (editingReferenceDataItem) {
        await dispatch(
          updateReferenceDataItemAction({
            id: editingReferenceDataItem.id,
            payload: {
              label: values.label.trim(),
            },
          }),
        ).unwrap();
      } else {
        await dispatch(
          createReferenceDataItemAction({
            type: referenceDataType,
            label: values.label.trim(),
          }),
        ).unwrap();
      }

      await dispatch(
        getReferenceDataAction({
          type: referenceDataType,
          ...(referenceDataType === 'barber_capability'
            ? barberCapabilityPage
            : safetyTriggerPage),
        }),
      ).unwrap();
      messageApi.success('Reference data saved.');
      setReferenceDataModalOpen(false);
    } catch (error) {
      showRequestError(error);
    }
  };

  const handleDeleteReferenceDataItem = async (
    item: ReferenceDataItemRecord,
  ) => {
    try {
      await dispatch(deleteReferenceDataItemAction(item.id)).unwrap();
      await dispatch(
        getReferenceDataAction({
          type: item.type,
          ...(item.type === 'barber_capability'
            ? barberCapabilityPage
            : safetyTriggerPage),
        }),
      ).unwrap();
      messageApi.success(`${item.label} deleted.`);
    } catch (error) {
      showRequestError(error);
    }
  };

  const handleCreateInvite = async () => {
    const values = await inviteForm.validateFields();

    setInviteSubmitting(true);
    setCreatedInvite(null);

    try {
      const invite = await createAdminInvite({
        email: values.email.trim(),
        expiresInDays: values.expiresInDays,
      });

      setCreatedInvite(invite);
      messageApi.success('Admin invite created.');
    } catch (error) {
      showRequestError(error);
    } finally {
      setInviteSubmitting(false);
    }
  };

  const inviteLink = useMemo(() => {
    if (!createdInvite) {
      return null;
    }

    const url = new URL('/accept-invite', window.location.origin);
    url.searchParams.set('token', createdInvite.token);

    return url.toString();
  }, [createdInvite]);

  const handleCopyInviteLink = async () => {
    if (!inviteLink) {
      return;
    }

    await navigator.clipboard.writeText(inviteLink);
    messageApi.success('Invite link copied.');
  };

  const handleCopyPrepBrief = async (brief: AppointmentBriefRecord) => {
    await navigator.clipboard.writeText(buildPrepBriefText(brief));
    messageApi.success('Appointment prep brief copied.');
  };

  const barberColumns: ColumnsType<BarberRecord> = [
    {
      title: 'Barber',
      dataIndex: 'displayName',
      key: 'displayName',
      fixed: 'left',
      width: 220,
      render: (displayName: string, barber) => (
        <div className="admin-primary-cell">
          <Typography.Text strong>{displayName}</Typography.Text>
          <Typography.Text type="secondary">
            {barber.email ?? 'No email'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Gender',
      dataIndex: 'gender',
      key: 'gender',
      width: 140,
      render: (gender: StaffGender) => <Tag>{formatStaffGender(gender)}</Tag>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: StaffRole) => <Tag>{toTitleCase(role)}</Tag>,
    },
    {
      title: 'Capabilities',
      dataIndex: 'skills',
      key: 'skills',
      render: (skills: string[]) =>
        renderMappedTags(
          skills,
          barberCapabilityLabelByValue,
          'No capabilities linked',
        ),
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      render: (rating: number | null | undefined) =>
        typeof rating === 'number' && Number.isFinite(rating)
          ? rating.toFixed(1)
          : '0.0',
    },
    {
      title: 'Status',
      key: 'status',
      width: 140,
      render: (_, barber) => getStatusTag(barber.active, barber.available),
    },
    {
      title: '',
      key: 'action',
      width: 180,
      render: (_, barber) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => showEditBarberModal(barber)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete barber profile?"
            description={`Remove ${barber.displayName} from admin matching?`}
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={() => void handleDeleteBarber(barber)}
          >
            <Button danger icon={<DeleteOutlined />} loading={barbersSaving}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const serviceColumns: ColumnsType<ServiceAiConfigRecord> = [
    {
      title: 'Service',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 240,
      render: (name: string, service) => (
        <div className="admin-primary-cell">
          <Typography.Text strong>{name}</Typography.Text>
          <Typography.Text type="secondary">
            {service.durationMinutes} minutes
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'AI setup',
      key: 'setup',
      width: 140,
      render: (_, service) =>
        getServiceSetupTag(service, knownBarberCapabilities),
    },
    {
      title: 'Complexity',
      dataIndex: 'complexity',
      key: 'complexity',
      width: 140,
      render: (complexity: ServiceComplexity) => (
        <Tag color={complexity === 'high' ? 'red' : 'blue'}>
          {toTitleCase(complexity)}
        </Tag>
      ),
    },
    {
      title: 'Required skills',
      dataIndex: 'requiredSkills',
      key: 'requiredSkills',
      render: (skills: string[]) =>
        renderMappedTags(
          skills,
          barberCapabilityLabelByValue,
          'Add required skills',
        ),
    },
    {
      title: 'Safety triggers',
      dataIndex: 'safetyTriggers',
      key: 'safetyTriggers',
      render: (triggers: string[]) =>
        renderMappedTags(
          triggers,
          safetyTriggerLabelByValue,
          'Optional safety triggers',
        ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: (isActive: boolean) => getStatusTag(isActive),
    },
    {
      title: '',
      key: 'action',
      width: 120,
      render: (_, service) => (
        <Button icon={<EditOutlined />} onClick={() => showServiceModal(service)}>
          {isConfiguredService(service, knownBarberCapabilities)
            ? 'Edit'
            : 'Configure'}
        </Button>
      ),
    },
  ];

  const safetyColumns: ColumnsType<SafetyRuleRecord> = [
    {
      title: 'Condition',
      dataIndex: 'condition',
      key: 'condition',
      width: 260,
      render: (condition: string, rule) => (
        <div className="admin-primary-cell">
          <Typography.Text strong>{condition}</Typography.Text>
          <Typography.Text type="secondary" ellipsis>
            {rule.message}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Services',
      dataIndex: 'serviceIds',
      key: 'serviceIds',
      render: (serviceIds: string[]) =>
        renderTags(
          serviceIds.map(
            (serviceId) => serviceNameById.get(serviceId) ?? 'Unknown service',
          ),
        ),
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 130,
      render: (severity: SafetyRuleRecord['severity']) => (
        <Tag color={severity === 'high' ? 'red' : 'gold'}>
          {toTitleCase(severity)}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'active',
      key: 'active',
      width: 120,
      render: (active: boolean) => getStatusTag(active),
    },
    {
      title: '',
      key: 'action',
      width: 120,
      render: (_, rule) => (
        <Button
          icon={<EditOutlined />}
          onClick={() => showEditSafetyRuleModal(rule)}
        >
          Edit
        </Button>
      ),
    },
  ];

  const referenceDataColumns: ColumnsType<ReferenceDataItemRecord> = [
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
      render: (label: string, item) => (
        <div className="admin-primary-cell">
          <Typography.Text strong>{label}</Typography.Text>
          <Typography.Text type="secondary">{item.value}</Typography.Text>
        </div>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 180,
      render: (_, item) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => showEditReferenceDataModal(item)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete reference item?"
            description="This removes it from dropdowns and linked service or barber records."
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={() => void handleDeleteReferenceDataItem(item)}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={referenceDataSaving}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const briefColumns: ColumnsType<AppointmentBriefRecord> = [
    {
      title: 'Generated',
      dataIndex: 'generatedAt',
      key: 'generatedAt',
      width: 180,
      render: (generatedAt: string) => formatDateTime(generatedAt),
    },
    {
      title: 'Customer',
      key: 'customer',
      width: 220,
      render: (_, brief) => (
        <div className="admin-primary-cell">
          <Typography.Text strong>{getCustomerName(brief)}</Typography.Text>
          <Typography.Text type="secondary">
            {brief.booking.customer.email}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Appointment',
      key: 'appointment',
      width: 260,
      render: (_, brief) => (
        <div className="admin-primary-cell">
          <Typography.Text strong>{brief.booking.service.name}</Typography.Text>
          <Typography.Text type="secondary">
            {formatDateTime(brief.booking.startAt)}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Assigned barber',
      key: 'barber',
      width: 180,
      render: (_, brief) => getBriefBarberName(brief),
    },
    {
      title: 'Hair state',
      dataIndex: 'hairState',
      key: 'hairState',
      width: 220,
      render: (hairState: string[]) => renderTags(hairState, 'Not recorded'),
    },
    {
      title: 'Safety',
      dataIndex: 'safetyNotes',
      key: 'safetyNotes',
      width: 180,
      render: (safetyNotes: string | null) =>
        safetyNotes ? (
          <Tag color="gold">Needs review</Tag>
        ) : (
          <Tag color="green">Clear</Tag>
        ),
    },
    {
      title: 'Source',
      key: 'generationSource',
      width: 160,
      render: (_, brief) => renderBriefGenerationTag(brief),
    },
    {
      title: '',
      key: 'action',
      width: 120,
      render: (_, brief) => (
        <Button onClick={() => setSelectedBrief(brief)}>Open</Button>
      ),
    },
  ];

  const hairHistoryColumns: ColumnsType<HairHistoryRecord> = [
    {
      title: 'Visit date',
      dataIndex: 'visitDate',
      key: 'visitDate',
      width: 150,
      render: (visitDate: string) => format(new Date(visitDate), 'd MMM yyyy'),
    },
    {
      title: 'Client',
      key: 'client',
      width: 220,
      render: (_, history) => {
        const fullName = [history.client.firstName, history.client.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();

        return (
          <div className="admin-primary-cell">
            <Typography.Text strong>
              {fullName || history.client.email}
            </Typography.Text>
            <Typography.Text type="secondary">
              {history.client.email}
            </Typography.Text>
          </div>
        );
      },
    },
    {
      title: 'Service',
      dataIndex: 'service',
      key: 'service',
      width: 180,
    },
    {
      title: 'Hair state',
      dataIndex: 'hairState',
      key: 'hairState',
      render: (hairState: string[]) => renderTags(hairState),
    },
    {
      title: 'Barber',
      key: 'barber',
      width: 180,
      render: (_, history) => history.barber?.displayName ?? 'Unassigned',
    },
    {
      title: 'Notes',
      dataIndex: 'barberNotes',
      key: 'barberNotes',
      render: (barberNotes: string | null) =>
        barberNotes ?? <Typography.Text type="secondary">None</Typography.Text>,
    },
  ];

  return (
    <main className="admin-dashboard">
      {contextHolder}
      <section className="admin-dashboard-header">
        <div>
          <Typography.Title level={2}>AI Operations</Typography.Title>
          <Typography.Text type="secondary">
            Cooper's BarberShop administration
          </Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void loadAdminData()}>
          Refresh
        </Button>
      </section>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as AdminTabKey)}
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <Space direction="vertical" size={20} className="admin-full-width">
                <Alert
                  type="info"
                  showIcon
                  message="Admin setup order"
                  description="Keep barber profiles, service matching rules, and safety rules current. New client consultations create appointment briefs here so staff can prepare before the visit."
                />
                <div className="admin-overview-grid">
                  {overviewStats.map((stat) => (
                    <SACard key={stat.label} bodyPadding={20}>
                      <div className="admin-stat-card">
                        <Typography.Text type="secondary">
                          {stat.label}
                        </Typography.Text>
                        <Typography.Title level={2}>
                          {stat.value}
                        </Typography.Title>
                      </div>
                    </SACard>
                  ))}
                </div>
                <div className="admin-quality-panel">
                  {servicesMissingSkills.length > 0 ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="Services needing AI setup"
                      description={servicesMissingSkills
                        .map((service) => service.name)
                        .join(', ')}
                    />
                  ) : null}
                  {barbersMissingSkills.length > 0 ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="Barbers missing capabilities"
                      description={barbersMissingSkills
                        .map((barber) => barber.displayName)
                        .join(', ')}
                    />
                  ) : null}
                  {servicesMissingSkills.length === 0 &&
                  barbersMissingSkills.length === 0 ? (
                    <Alert
                      type="success"
                      showIcon
                      message="AI-critical service and barber metadata is complete."
                    />
                  ) : null}
                </div>
              </Space>
            ),
          },
          {
            key: 'barbers',
            label: 'Barbers',
            children: (
              <div className="admin-table-section">
                <Alert
                  type="info"
                  showIcon
                  className="admin-section-guide"
                  message="Why barber profiles matter"
                  description="The AI consultation will use each barber's capabilities, role, availability, and rating to recommend the right person for a client request. Add only barbers that should participate in AI matching."
                />
                <div className="admin-section-toolbar">
                  <Typography.Title level={4}>Barber profiles</Typography.Title>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={showCreateBarberModal}
                  >
                    Add barber
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  columns={barberColumns}
                  dataSource={visibleBarbers}
                  loading={barbersLoading}
                  scroll={{ x: 980 }}
                  pagination={{
                    current: barbersPagingMeta?.page ?? barbersPage.page,
                    pageSize: barbersPagingMeta?.limit ?? barbersPage.limit,
                    total: barbersPagingMeta?.totalItem ?? 0,
                    showSizeChanger: false,
                    onChange: (page, limit) => setBarbersPage({ page, limit }),
                  }}
                  locale={{
                    emptyText: (
                      <Empty description="No AI-ready barbers yet. Add barber profiles manually to start matching clients." />
                    ),
                  }}
                />
              </div>
            ),
          },
          {
            key: 'services',
            label: 'Service AI Config',
            children: (
              <div className="admin-table-section">
                <Alert
                  type="info"
                  showIcon
                  className="admin-section-guide"
                  message="Why service AI config matters"
                  description="Required skills tell the AI who can perform a service. Safety triggers are keywords or situations that should make the AI check safety rules before recommending a path."
                />
                <div className="admin-section-toolbar">
                  <div>
                    <Typography.Title level={4}>
                      Service matching rules
                    </Typography.Title>
                    <Typography.Text type="secondary">
                      Every booking service should have capabilities, complexity, and optional safety triggers before the consultation agent uses it.
                    </Typography.Text>
                  </div>
                  <Space wrap>
                    <Select
                      className="admin-toolbar-select"
                      placeholder="Jump to a service that needs setup"
                      options={unconfiguredServiceOptions}
                      onSelect={handleSelectServiceToConfigure}
                      showSearch
                      filterOption={filterSelectOption}
                      optionFilterProp="label"
                      disabled={
                        serviceConfigsLoading ||
                        unconfiguredServiceOptions.length === 0
                      }
                      allowClear
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={showCreateServiceModal}
                    >
                      Add service
                    </Button>
                  </Space>
                </div>
                <Table
                  rowKey="id"
                  columns={serviceColumns}
                  dataSource={sortedServiceConfigs}
                  loading={serviceConfigsLoading}
                  scroll={{ x: 1040 }}
                  pagination={{
                    current: serviceConfigsPagingMeta?.page ?? servicesPage.page,
                    pageSize:
                      serviceConfigsPagingMeta?.limit ?? servicesPage.limit,
                    total: serviceConfigsPagingMeta?.totalItem ?? 0,
                    showSizeChanger: false,
                    onChange: (page, limit) => setServicesPage({ page, limit }),
                  }}
                  locale={{
                    emptyText: (
                      <Empty description="No booking services available yet." />
                    ),
                  }}
                />
              </div>
            ),
          },
          {
            key: 'referenceData',
            label: 'Reference Data',
            children: (
              <Space direction="vertical" size={20} className="admin-full-width">
                <Alert
                  type="info"
                  showIcon
                  className="admin-section-guide"
                  message="Why reference data matters"
                  description="Capabilities and safety triggers are the canonical vocabulary for AI matching. Admins should maintain these here so barber profiles and services both use the same controlled terms."
                />
                <div className="admin-reference-grid">
                  <SACard bodyPadding={24}>
                    <div className="admin-section-toolbar">
                      <div>
                        <Typography.Title level={4}>
                          Barber capabilities
                        </Typography.Title>
                        <Typography.Text type="secondary">
                          Used by barber profiles and service matching rules.
                        </Typography.Text>
                      </div>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() =>
                          showCreateReferenceDataModal('barber_capability')
                        }
                      >
                        Add capability
                      </Button>
                    </div>
                    <Table
                      rowKey="id"
                      columns={referenceDataColumns}
                      dataSource={barberCapabilityItems}
                      loading={referenceDataLoading}
                      pagination={{
                        current:
                          barberCapabilityPagingMeta?.page ??
                          barberCapabilityPage.page,
                        pageSize:
                          barberCapabilityPagingMeta?.limit ??
                          barberCapabilityPage.limit,
                        total: barberCapabilityPagingMeta?.totalItem ?? 0,
                        showSizeChanger: false,
                        onChange: (page, limit) =>
                          setBarberCapabilityPage({ page, limit }),
                      }}
                      locale={{
                        emptyText: (
                          <Empty description="No barber capabilities added yet." />
                        ),
                      }}
                    />
                  </SACard>
                  <SACard bodyPadding={24}>
                    <div className="admin-section-toolbar">
                      <div>
                        <Typography.Title level={4}>
                          Safety triggers
                        </Typography.Title>
                        <Typography.Text type="secondary">
                          Used by service AI config before safety rules are checked.
                        </Typography.Text>
                      </div>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() =>
                          showCreateReferenceDataModal('safety_trigger')
                        }
                      >
                        Add trigger
                      </Button>
                    </div>
                    <Table
                      rowKey="id"
                      columns={referenceDataColumns}
                      dataSource={safetyTriggerItems}
                      loading={referenceDataLoading}
                      pagination={{
                        current:
                          safetyTriggerPagingMeta?.page ??
                          safetyTriggerPage.page,
                        pageSize:
                          safetyTriggerPagingMeta?.limit ??
                          safetyTriggerPage.limit,
                        total: safetyTriggerPagingMeta?.totalItem ?? 0,
                        showSizeChanger: false,
                        onChange: (page, limit) =>
                          setSafetyTriggerPage({ page, limit }),
                      }}
                      locale={{
                        emptyText: (
                          <Empty description="No safety triggers added yet." />
                        ),
                      }}
                    />
                  </SACard>
                </div>
              </Space>
            ),
          },
          {
            key: 'safety',
            label: 'Safety Rules',
            children: (
              <div className="admin-table-section">
                <Alert
                  type="info"
                  showIcon
                  className="admin-section-guide"
                  message="Why safety rules matter"
                  description="Safety rules are the policy layer for risky requests such as scalp sensitivity, allergies, bleach damage, box dye, or formal styling requirements. The AI should use them before creating a recommendation."
                />
                <div className="admin-section-toolbar">
                  <Typography.Title level={4}>Safety rules</Typography.Title>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={showCreateSafetyRuleModal}
                  >
                    Add rule
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  columns={safetyColumns}
                  dataSource={safetyRules}
                  loading={safetyRulesLoading}
                  scroll={{ x: 900 }}
                  pagination={{
                    current: safetyRulesPagingMeta?.page ?? safetyPage.page,
                    pageSize: safetyRulesPagingMeta?.limit ?? safetyPage.limit,
                    total: safetyRulesPagingMeta?.totalItem ?? 0,
                    showSizeChanger: false,
                    onChange: (page, limit) => setSafetyPage({ page, limit }),
                  }}
                  locale={{
                    emptyText: (
                      <Empty description="No safety rules yet. Add rules after configuring the services they apply to." />
                    ),
                  }}
                />
              </div>
            ),
          },
          {
            key: 'briefs',
            label: 'Appointment Briefs',
            children: (
              <div className="admin-table-section">
                <Alert
                  type="info"
                  showIcon
                  className="admin-section-guide"
                  message="Appointment prep queue"
                  description="Briefs are generated from the client consultation at booking time. Open a brief to review the customer's request, hair state, desired look, and safety notes before the appointment."
                />
                <div className="admin-section-toolbar">
                  <Typography.Title level={4}>
                    Upcoming appointment briefs
                  </Typography.Title>
                </div>
                {appointmentBriefs.length === 0 && !briefsLoading ? (
                  <Empty description="No briefs generated yet" />
                ) : (
                  <Table
                    rowKey="id"
                    columns={briefColumns}
                    dataSource={appointmentBriefs}
                    loading={briefsLoading}
                    scroll={{ x: 980 }}
                    pagination={{
                      current: briefsPagingMeta?.page ?? briefsPage.page,
                      pageSize: briefsPagingMeta?.limit ?? briefsPage.limit,
                      total: briefsPagingMeta?.totalItem ?? 0,
                      showSizeChanger: false,
                      onChange: (page, limit) => setBriefsPage({ page, limit }),
                    }}
                  />
                )}
              </div>
            ),
          },
          {
            key: 'hairHistory',
            label: 'Hair History',
            children: (
              <div className="admin-table-section">
                <Alert
                  type="info"
                  showIcon
                  className="admin-section-guide"
                  message="Why hair history matters"
                  description="Hair history is cross-visit memory. It helps the AI avoid repeating unsafe recommendations when a client has previous colour, bleach, product, sensitivity, or damage history."
                />
                <div className="admin-section-toolbar">
                  <Typography.Title level={4}>Client hair history</Typography.Title>
                </div>
                {hairHistory.length === 0 && !hairHistoryLoading ? (
                  <Empty description="No hair history recorded yet" />
                ) : (
                  <Table
                    rowKey="id"
                    columns={hairHistoryColumns}
                    dataSource={hairHistory}
                    loading={hairHistoryLoading}
                    scroll={{ x: 1100 }}
                    pagination={{
                      current:
                        hairHistoryPagingMeta?.page ?? hairHistoryPage.page,
                      pageSize:
                        hairHistoryPagingMeta?.limit ?? hairHistoryPage.limit,
                      total: hairHistoryPagingMeta?.totalItem ?? 0,
                      showSizeChanger: false,
                      onChange: (page, limit) =>
                        setHairHistoryPage({ page, limit }),
                    }}
                  />
                )}
              </div>
            ),
          },
          {
            key: 'invites',
            label: 'Admin Invites',
            children: (
              <div className="admin-table-section">
                <Alert
                  type="info"
                  showIcon
                  className="admin-section-guide"
                  message="Why admin invites matter"
                  description="Use invites to onboard trusted admins without sharing the main admin password. Invite acceptance creates an admin account that can manage AI setup data."
                />
                <div className="admin-section-toolbar">
                  <Typography.Title level={4}>Invite administrators</Typography.Title>
                </div>
                <SACard bodyPadding={24}>
                  <Form<InviteFormValues>
                    form={inviteForm}
                    layout="vertical"
                    initialValues={{ expiresInDays: 7 }}
                    onFinish={() => void handleCreateInvite()}
                  >
                    <div className="admin-form-grid">
                      <Form.Item
                        name="email"
                        label="Admin email"
                        rules={[
                          { required: true, message: 'Email is required.' },
                          { type: 'email', message: 'Enter a valid email.' },
                        ]}
                      >
                        <Input placeholder="admin@coopers.local" />
                      </Form.Item>
                      <Form.Item
                        name="expiresInDays"
                        label="Expires in days"
                        rules={[{ required: true }]}
                      >
                        <InputNumber
                          min={1}
                          max={30}
                          className="admin-full-width"
                        />
                      </Form.Item>
                    </div>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={inviteSubmitting}
                    >
                      Create invite
                    </Button>
                  </Form>

                  {inviteLink ? (
                    <Alert
                      className="admin-invite-result"
                      type="success"
                      showIcon
                      message={`Invite created for ${createdInvite?.email}`}
                      description={
                        <Space direction="vertical" className="admin-full-width">
                          <Typography.Text copyable>{inviteLink}</Typography.Text>
                          <Button
                            icon={<CopyOutlined />}
                            onClick={() => void handleCopyInviteLink()}
                          >
                            Copy invite link
                          </Button>
                        </Space>
                      }
                    />
                  ) : null}
                </SACard>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={barberModalOpen}
        onCancel={() => setBarberModalOpen(false)}
        onOk={() => void handleSaveBarber()}
        okText={editingBarber ? 'Save changes' : 'Create barber'}
        confirmLoading={barbersSaving}
        width={720}
      >
        <SAModalHeader
          title={editingBarber ? 'Update Barber' : 'Create Barber'}
          subtitle="Staff metadata used by appointment matching."
          className="admin-modal-header"
        />
        <Form form={barberForm} layout="vertical" requiredMark>
          <Form.Item
            name="displayName"
            label="Display name"
            rules={[{ required: true, message: 'Display name is required.' }]}
            extra="Customer-facing barber name used in recommendations and appointment briefs."
          >
            <Input placeholder="Sophia Reed" />
          </Form.Item>
          <div className="admin-form-grid">
            <Form.Item
              name="email"
              label="Email"
              extra="Optional internal contact email for the barber."
            >
              <Input placeholder="sophia@coopers.local" />
            </Form.Item>
            <Form.Item
              name="role"
              label="Role"
              rules={[{ required: true }]}
              extra="High-complexity services can be directed to senior or owner-level barbers."
            >
              <Select
                options={STAFF_ROLE_OPTIONS}
                showSearch
                filterOption={filterSelectOption}
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item
              name="gender"
              label="Gender"
              rules={[{ required: true }]}
              extra="Shown to customers with the recommended barber."
            >
              <Select
                options={STAFF_GENDER_OPTIONS}
                showSearch
                filterOption={filterSelectOption}
                optionFilterProp="label"
              />
            </Form.Item>
          </div>
          <div className="admin-form-grid">
            <Form.Item
              name="timezone"
              label="Timezone"
              rules={[{ required: true, message: 'Timezone is required.' }]}
              extra="Used when interpreting appointment times for this barber."
            >
              <Input placeholder="Australia/Sydney" />
            </Form.Item>
          </div>
          <Form.Item
            name="skills"
            label="Barber capabilities"
            extra="Choose the services, treatments, and client situations this barber can confidently handle. These choices help the AI match clients to the right barber."
          >
            <Select
              mode="multiple"
              options={barberCapabilityOptions}
              placeholder="Select capabilities from reference data"
              showSearch
              filterOption={filterSelectOption}
              optionFilterProp="label"
            />
          </Form.Item>
          <div className="admin-form-grid">
            <Form.Item
              name="rating"
              label="Rating"
              rules={[{ required: true }]}
              extra="A simple confidence signal for matching when multiple barbers qualify."
            >
              <InputNumber
                min={0}
                max={5}
                step={0.1}
                className="admin-full-width"
              />
            </Form.Item>
            <div className="admin-switch-row">
              <Form.Item
                name="available"
                label="Available"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item name="active" label="Active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        open={serviceModalOpen}
        onCancel={() => setServiceModalOpen(false)}
        onOk={() => void handleSaveServiceConfig()}
        okText="Save config"
        confirmLoading={serviceConfigsSaving}
        width={720}
      >
        <SAModalHeader
          title={editingService ? 'Update Service' : 'Create Service'}
          subtitle="Business-facing service details and AI matching inputs."
          className="admin-modal-header"
        />
        <Form form={serviceConfigForm} layout="vertical" requiredMark>
          <div className="admin-form-grid">
            <Form.Item
              name="name"
              label="Service name"
              rules={[{ required: true, message: 'Service name is required.' }]}
            >
              <Input placeholder="Texture Styling" />
            </Form.Item>
            <Form.Item
              name="durationMinutes"
              label="Duration (minutes)"
              rules={[{ required: true, message: 'Duration is required.' }]}
            >
              <InputNumber min={1} className="admin-full-width" />
            </Form.Item>
          </div>
          {selectedServiceStarterConfig ? (
            <Alert
              type="info"
              showIcon
              className="admin-service-starter-alert"
              message="Suggested starter setup"
              description={
                <Space direction="vertical" size={12} className="admin-full-width">
                  <Typography.Text>
                    These starter values fit the current service type and can be
                    adjusted before saving.
                  </Typography.Text>
                  <div className="admin-service-starter-grid">
                    <div>
                      <Typography.Text strong>
                        Recommended capabilities
                      </Typography.Text>
                      <div>
                        {renderMappedTags(
                          selectedServiceStarterConfig.requiredSkills,
                          barberCapabilityLabelByValue,
                        )}
                      </div>
                    </div>
                    <div>
                      <Typography.Text strong>
                        Recommended safety triggers
                      </Typography.Text>
                      <div>
                        {renderMappedTags(
                          selectedServiceStarterConfig.safetyTriggers,
                          safetyTriggerLabelByValue,
                          'No default triggers',
                        )}
                      </div>
                    </div>
                  </div>
                  <Typography.Text strong>
                    Suggested complexity: {toTitleCase(selectedServiceStarterConfig.complexity)}
                  </Typography.Text>
                  <ul className="admin-service-starter-notes">
                    {selectedServiceStarterConfig.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                  <div>
                    <Button onClick={handleApplyServiceStarterConfig}>
                      Use suggested values
                    </Button>
                  </div>
                </Space>
              }
            />
          ) : null}
          <Form.Item
            name="requiredSkills"
            label="Required skills"
            rules={[
              {
                required: true,
                type: 'array',
                min: 1,
                message: 'Add at least one required skill.',
              },
            ]}
            extra="These capabilities are the main matching rule. The AI should not recommend a barber without at least one of them."
          >
            <Select
              mode="multiple"
              options={barberCapabilityOptions}
              placeholder="Select required skills for this service"
              showSearch
              filterOption={filterSelectOption}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            name="safetyTriggers"
            label="Safety triggers"
            extra="Optional keywords or situations that should make the AI check the safety rules before recommending this service."
          >
            <Select
              mode="multiple"
              options={safetyTriggerOptions}
              placeholder="allergy, scalp sensitivity, box dye"
              showSearch
              filterOption={filterSelectOption}
              optionFilterProp="label"
            />
          </Form.Item>
          <div className="admin-form-grid">
            <Form.Item
              name="complexity"
              label="Complexity"
              rules={[{ required: true }]}
              extra="High complexity helps the AI prefer senior or owner-level barbers."
            >
              <Select
                options={COMPLEXITY_OPTIONS}
                showSearch
                filterOption={filterSelectOption}
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Modal
        open={referenceDataModalOpen}
        onCancel={() => setReferenceDataModalOpen(false)}
        onOk={() => void handleSaveReferenceDataItem()}
        okText={editingReferenceDataItem ? 'Save changes' : 'Create item'}
        confirmLoading={referenceDataSaving}
        width={560}
      >
        <SAModalHeader
          title={
            editingReferenceDataItem
              ? 'Update Reference Item'
              : referenceDataType === 'barber_capability'
                ? 'Add Barber Capability'
                : 'Add Safety Trigger'
          }
          subtitle={
            referenceDataType === 'barber_capability'
              ? 'Canonical capability used by barber profiles and service matching.'
              : 'Canonical trigger used by service AI safety checks.'
          }
          className="admin-modal-header"
        />
        <Form form={referenceDataForm} layout="vertical" requiredMark>
          <Form.Item
            name="label"
            label="Display label"
            rules={[{ required: true, message: 'Label is required.' }]}
            extra="This is the term admins will see and select in dropdowns."
          >
            <Input
              placeholder={
                referenceDataType === 'barber_capability'
                  ? 'Texture specialist'
                  : 'Scalp inflammation'
              }
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={safetyModalOpen}
        onCancel={() => setSafetyModalOpen(false)}
        onOk={() => void handleSaveSafetyRule()}
        okText={editingSafetyRule ? 'Save changes' : 'Create rule'}
        confirmLoading={safetyRulesSaving}
        width={760}
      >
        <SAModalHeader
          title={editingSafetyRule ? 'Update Safety Rule' : 'Create Safety Rule'}
          subtitle="Safety messages shown before risky appointment paths."
          className="admin-modal-header"
        />
        <Form form={safetyRuleForm} layout="vertical" requiredMark>
          <Form.Item
            name="condition"
            label="Condition"
            rules={[{ required: true, message: 'Condition is required.' }]}
            extra="Describe the risk or customer situation that should trigger this rule."
          >
            <Input placeholder="Client reports allergy, rash, or scalp sensitivity" />
          </Form.Item>
          <Form.Item
            name="serviceIds"
            label="Services"
            rules={[{ required: true, message: 'At least one service is required.' }]}
            extra="Only configured service AI records are available here."
          >
            <Select
              mode="multiple"
              options={serviceOptions}
              placeholder="Select configured services"
              showSearch
              filterOption={filterSelectOption}
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            name="message"
            label="Message"
            rules={[{ required: true, message: 'Message is required.' }]}
            extra="This is the operational guidance the AI should preserve in the appointment brief."
          >
            <Input.TextArea
              rows={4}
              placeholder="Recommend patch test before chemical products. Assign a senior barber for review."
            />
          </Form.Item>
          <div className="admin-form-grid">
            <Form.Item
              name="severity"
              label="Severity"
              rules={[{ required: true }]}
            >
              <Select
                options={SEVERITY_OPTIONS}
                showSearch
                filterOption={filterSelectOption}
                optionFilterProp="label"
              />
            </Form.Item>
            <Form.Item name="active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Drawer
        open={Boolean(selectedBrief)}
        onClose={() => setSelectedBrief(null)}
        title="Appointment prep brief"
        width={620}
        extra={
          selectedBrief ? (
            <Button
              icon={<CopyOutlined />}
              onClick={() => void handleCopyPrepBrief(selectedBrief)}
            >
              Copy Brief
            </Button>
          ) : null
        }
      >
        {selectedBrief ? (
          <Space direction="vertical" size={20} className="admin-full-width">
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Customer">
                {getCustomerName(selectedBrief)}
              </Descriptions.Item>
              <Descriptions.Item label="Service">
                {selectedBrief.booking.service.name}
              </Descriptions.Item>
              <Descriptions.Item label="Appointment">
                {formatDateTime(selectedBrief.booking.startAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Barber">
                {getBriefBarberName(selectedBrief)}
              </Descriptions.Item>
              <Descriptions.Item label="Booking status">
                <Tag>{toTitleCase(selectedBrief.booking.status)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Generated">
                {formatDateTime(selectedBrief.generatedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Generation source">
                {renderBriefGenerationTag(selectedBrief)}
              </Descriptions.Item>
            </Descriptions>
            <Alert
              type={selectedBrief.safetyNotes ? 'warning' : 'success'}
              showIcon
              message={
                selectedBrief.safetyNotes
                  ? 'Safety notes to review before starting'
                  : 'No safety notes'
              }
              description={
                selectedBrief.safetyNotes ? (
                  <div className="admin-brief-safety-notes">
                    {getBriefSafetyLines(selectedBrief).map((note) => (
                      <Typography.Text key={note}>{note}</Typography.Text>
                    ))}
                  </div>
                ) : undefined
              }
            />
            <section className="admin-brief-section">
              <Typography.Title level={5}>What the barber should know</Typography.Title>
              <ul className="admin-brief-summary-list">
                {getBriefSummaryLines(selectedBrief).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
            <section className="admin-brief-section">
              <Typography.Title level={5}>Hair state</Typography.Title>
              {renderTags(
                selectedBrief.hairState.map(cleanBriefText),
                'Not recorded',
              )}
            </section>
            <section className="admin-brief-section">
              <Typography.Title level={5}>Desired look</Typography.Title>
              <Typography.Paragraph>
                {selectedBrief.desiredLook
                  ? cleanBriefText(selectedBrief.desiredLook)
                  : 'Not provided'}
              </Typography.Paragraph>
            </section>
            <section className="admin-brief-section">
              <Typography.Title level={5}>Goal photo</Typography.Title>
              {getBriefGoalPhotoSrc(selectedBrief) ? (
                <img
                  className="admin-brief-goal-photo"
                  src={getBriefGoalPhotoSrc(selectedBrief) ?? undefined}
                  alt="Customer goal reference"
                />
              ) : (
                <Typography.Text type="secondary">Not provided</Typography.Text>
              )}
            </section>
          </Space>
        ) : null}
      </Drawer>
    </main>
  );
}
