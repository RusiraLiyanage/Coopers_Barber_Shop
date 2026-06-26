import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
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
  ReloadOutlined,
} from '@ant-design/icons';

import { SAModalHeader } from '../../components/common';
import { useAdminDataFreshness } from '../../hooks/useAdminDataFreshness';
import { getServiceAiStarterConfig } from '../../lib/adminOptions';
import { createAdminInvite, createHairHistoryFromBrief } from '../../lib/api';
import {
  getUserFriendlyErrorMessage,
  isSessionExpiredError,
} from '../../lib/errors';
import {
  createBarberAction,
  deleteBarberAction,
  getBarbersAction,
  updateBarberAction,
} from '../../store/barbers/action';
import {
  selectBarbers,
  selectBarbersLoading,
  selectBarbersPagingMeta,
  selectBarbersSaving,
} from '../../store/barbers/selector';
import { getAppointmentBriefsAction } from '../../store/briefs/action';
import {
  selectAppointmentBriefs,
  selectAppointmentBriefsLoading,
  selectAppointmentBriefsPagingMeta,
} from '../../store/briefs/selector';
import { getHairHistoryAction } from '../../store/hairHistory/action';
import {
  selectHairHistory,
  selectHairHistoryLoading,
  selectHairHistoryPagingMeta,
} from '../../store/hairHistory/selector';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  createReferenceDataItemAction,
  deleteReferenceDataItemAction,
  getReferenceDataAction,
  updateReferenceDataItemAction,
} from '../../store/referenceData/action';
import {
  selectReferenceData,
  selectReferenceDataLoading,
  selectReferenceDataPagingMetaByType,
  selectReferenceDataSaving,
} from '../../store/referenceData/selector';
import {
  createSafetyRuleAction,
  getSafetyRulesAction,
  updateSafetyRuleAction,
} from '../../store/safetyRules/action';
import {
  selectSafetyRules,
  selectSafetyRulesLoading,
  selectSafetyRulesPagingMeta,
  selectSafetyRulesSaving,
} from '../../store/safetyRules/selector';
import {
  createServiceConfigAction,
  getServiceConfigsAction,
  updateServiceConfigAction,
} from '../../store/serviceConfigs/action';
import {
  selectServiceConfigs,
  selectServiceConfigsLoading,
  selectServiceConfigsPagingMeta,
  selectServiceConfigsSaving,
} from '../../store/serviceConfigs/selector';
import type {
  AppointmentBriefRecord,
  AdminInviteResponse,
  BarberRecord,
  HairHistoryRecord,
  ReferenceDataItemRecord,
  ReferenceDataType,
  SafetyRuleRecord,
  ServiceAiConfigRecord,
  ServiceComplexity,
  StaffGender,
  StaffRole,
} from '../../lib/api';
import {
  buildPrepBriefText,
  cleanBriefText,
  getBriefBarberName,
  getBriefGoalPhotoSrc,
  getBriefSafetyLines,
  getBriefSummaryLines,
  getCustomerName,
  renderBriefGenerationTag,
} from './briefUtils';
import {
  COMPLEXITY_OPTIONS,
  DEFAULT_TABLE_PAGE_SIZE,
  REFERENCE_TABLE_PAGE_SIZE,
  SEVERITY_OPTIONS,
  STAFF_GENDER_OPTIONS,
  STAFF_ROLE_OPTIONS,
} from './constants';
import {
  compactStringArray,
  filterSelectOption,
  formatDate,
  formatDateTime,
  formatStaffGender,
  getServiceSetupTag,
  getStatusTag,
  isAdminVisibleBarber,
  isConfiguredService,
  renderAppointmentStatusTag,
  renderMappedTags,
  renderTags,
  toTitleCase,
} from './formatters';
import { createBarberPayload, createSafetyPayload } from './payloads';
import type {
  AdminTabKey,
  BarberFormValues,
  HairHistoryFromBriefFormValues,
  InviteFormValues,
  ReferenceDataFormValues,
  SafetyRuleFormValues,
  ServiceConfigFormValues,
  TablePage,
} from './types';
import {
  AdminInvitesTab,
  AppointmentBriefsTab,
  BarbersTab,
  HairHistoryTab,
  OverviewTab,
  ReferenceDataTab,
  SafetyRulesTab,
  ServiceAiConfigTab,
} from './tabs';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const dispatch = useAppDispatch();
  const [messageApi, contextHolder] = message.useMessage();
  const [activeTab, setActiveTab] = useState<AdminTabKey>('overview');
  const [barberForm] = Form.useForm<BarberFormValues>();
  const [serviceConfigForm] = Form.useForm<ServiceConfigFormValues>();
  const [safetyRuleForm] = Form.useForm<SafetyRuleFormValues>();
  const [inviteForm] = Form.useForm<InviteFormValues>();
  const [referenceDataForm] = Form.useForm<ReferenceDataFormValues>();
  const [hairHistoryFromBriefForm] =
    Form.useForm<HairHistoryFromBriefFormValues>();
  const [barberModalOpen, setBarberModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [referenceDataModalOpen, setReferenceDataModalOpen] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [hairHistorySaving, setHairHistorySaving] = useState(false);
  const [createdInvite, setCreatedInvite] =
    useState<AdminInviteResponse | null>(null);
  const [editingBarber, setEditingBarber] = useState<BarberRecord | null>(null);
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
    () => {
      const serviceNames = new Map(
        serviceConfigs.map((service) => [service.id, service.name] as const),
      );

      safetyRules.forEach((rule) => {
        rule.services?.forEach((service) => {
          serviceNames.set(service.id, service.name);
        });
      });

      return serviceNames;
    },
    [safetyRules, serviceConfigs],
  );

  const barberCapabilityItems = useMemo(
    () => referenceData.filter((item) => item.type === 'barber_capability'),
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
  const { hasFreshData, dismissFreshDataNotice, refreshKnownVersion } =
    useAdminDataFreshness();

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
    () => {
      const optionsById = new Map(
        configuredServiceConfigs.map((service) => [
          service.id,
          {
            label: service.name,
            value: service.id,
          },
        ]),
      );

      editingSafetyRule?.services?.forEach((service) => {
        optionsById.set(service.id, {
          label: service.name,
          value: service.id,
        });
      });

      return Array.from(optionsById.values());
    },
    [configuredServiceConfigs, editingSafetyRule],
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
      await refreshKnownVersion();
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
    refreshKnownVersion,
  ]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  useEffect(() => {
    if (!selectedBrief) {
      hairHistoryFromBriefForm.resetFields();
      return;
    }

    const startAt = new Date(selectedBrief.booking.startAt);

    hairHistoryFromBriefForm.setFieldsValue({
      visitDate: Number.isNaN(startAt.getTime())
        ? undefined
        : startAt.toISOString().slice(0, 10),
      productsUsed: '',
      barberNotes: '',
    });
  }, [hairHistoryFromBriefForm, selectedBrief]);

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
      await refreshKnownVersion();
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
      await refreshKnownVersion();
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
      await refreshKnownVersion();
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
      await refreshKnownVersion();
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
      await refreshKnownVersion();
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
      await refreshKnownVersion();
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
      await refreshKnownVersion();
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

  const handleSaveHairHistoryFromBrief = async () => {
    if (!selectedBrief) {
      return;
    }

    const values = await hairHistoryFromBriefForm.validateFields();
    setHairHistorySaving(true);

    try {
      await createHairHistoryFromBrief(selectedBrief.id, {
        visitDate: values.visitDate,
        productsUsed: values.productsUsed?.trim() || undefined,
        barberNotes: values.barberNotes?.trim() || undefined,
      });
      await dispatch(getHairHistoryAction(hairHistoryPage)).unwrap();
      await refreshKnownVersion();
      messageApi.success('Hair history saved for future consultations.');
      hairHistoryFromBriefForm.resetFields();
    } catch (error) {
      showRequestError(error);
    } finally {
      setHairHistorySaving(false);
    }
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
        <Button
          icon={<EditOutlined />}
          onClick={() => showServiceModal(service)}
        >
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
      render: (serviceIds: string[], rule) =>
        renderTags(
          serviceIds.map(
            (serviceId) =>
              rule.services?.find((service) => service.id === serviceId)
                ?.name ??
              serviceNameById.get(serviceId) ??
              'Unknown service',
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
      width: 280,
      render: (_, brief) => (
        <div className="admin-primary-cell">
          <Typography.Text strong>{brief.booking.service.name}</Typography.Text>
          <Typography.Text type="secondary">
            {formatDateTime(brief.booking.startAt)}
          </Typography.Text>
          <div>{renderAppointmentStatusTag(brief.booking.status)}</div>
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
      render: (visitDate: string) => formatDate(visitDate),
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
      {hasFreshData ? (
        <Alert
          className="admin-fresh-data-alert"
          type="error"
          showIcon
          message="Updated information available"
          description="Refresh to load the latest admin data."
          action={
            <Space>
              <Button size="small" onClick={dismissFreshDataNotice}>
                Dismiss
              </Button>
              <Button
                size="small"
                type="primary"
                color="red"
                icon={<ReloadOutlined />}
                onClick={() => void loadAdminData()}
              >
                Refresh
              </Button>
            </Space>
          }
        />
      ) : null}

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as AdminTabKey)}
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <OverviewTab
                overviewStats={overviewStats}
                servicesMissingSkills={servicesMissingSkills}
                barbersMissingSkills={barbersMissingSkills}
              />
            ),
          },
          {
            key: 'barbers',
            label: 'Barbers',
            children: (
              <BarbersTab
                columns={barberColumns}
                data={visibleBarbers}
                loading={barbersLoading}
                pagingMeta={barbersPagingMeta}
                page={barbersPage}
                onPageChange={setBarbersPage}
                onCreate={showCreateBarberModal}
              />
            ),
          },
          {
            key: 'services',
            label: 'Service AI Config',
            children: (
              <ServiceAiConfigTab
                columns={serviceColumns}
                data={sortedServiceConfigs}
                loading={serviceConfigsLoading}
                pagingMeta={serviceConfigsPagingMeta}
                page={servicesPage}
                unconfiguredServiceOptions={unconfiguredServiceOptions}
                onPageChange={setServicesPage}
                onCreate={showCreateServiceModal}
                onSelectServiceToConfigure={handleSelectServiceToConfigure}
                filterSelectOption={filterSelectOption}
              />
            ),
          },
          {
            key: 'referenceData',
            label: 'Reference Data',
            children: (
              <ReferenceDataTab
                columns={referenceDataColumns}
                barberCapabilityItems={barberCapabilityItems}
                safetyTriggerItems={safetyTriggerItems}
                loading={referenceDataLoading}
                barberCapabilityPagingMeta={barberCapabilityPagingMeta}
                safetyTriggerPagingMeta={safetyTriggerPagingMeta}
                barberCapabilityPage={barberCapabilityPage}
                safetyTriggerPage={safetyTriggerPage}
                onBarberCapabilityPageChange={setBarberCapabilityPage}
                onSafetyTriggerPageChange={setSafetyTriggerPage}
                onCreate={showCreateReferenceDataModal}
              />
            ),
          },
          {
            key: 'safety',
            label: 'Safety Rules',
            children: (
              <SafetyRulesTab
                columns={safetyColumns}
                data={safetyRules}
                loading={safetyRulesLoading}
                pagingMeta={safetyRulesPagingMeta}
                page={safetyPage}
                onPageChange={setSafetyPage}
                onCreate={showCreateSafetyRuleModal}
              />
            ),
          },
          {
            key: 'briefs',
            label: 'Appointment Briefs',
            children: (
              <AppointmentBriefsTab
                columns={briefColumns}
                data={appointmentBriefs}
                loading={briefsLoading}
                pagingMeta={briefsPagingMeta}
                page={briefsPage}
                onPageChange={setBriefsPage}
              />
            ),
          },
          {
            key: 'hairHistory',
            label: 'Hair History',
            children: (
              <HairHistoryTab
                columns={hairHistoryColumns}
                data={hairHistory}
                loading={hairHistoryLoading}
                pagingMeta={hairHistoryPagingMeta}
                page={hairHistoryPage}
                onPageChange={setHairHistoryPage}
              />
            ),
          },
          {
            key: 'invites',
            label: 'Admin Invites',
            children: (
              <AdminInvitesTab
                form={inviteForm}
                inviteSubmitting={inviteSubmitting}
                inviteLink={inviteLink}
                createdInvite={createdInvite}
                onCreateInvite={() => void handleCreateInvite()}
                onCopyInviteLink={() => void handleCopyInviteLink()}
              />
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
                <Space
                  direction="vertical"
                  size={12}
                  className="admin-full-width"
                >
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
                    Suggested complexity:{' '}
                    {toTitleCase(selectedServiceStarterConfig.complexity)}
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
          title={
            editingSafetyRule ? 'Update Safety Rule' : 'Create Safety Rule'
          }
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
            rules={[
              { required: true, message: 'At least one service is required.' },
            ]}
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
                {renderAppointmentStatusTag(selectedBrief.booking.status)}
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
              <Typography.Title level={5}>
                What the barber should know
              </Typography.Title>
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
            <section className="admin-brief-section">
              <Typography.Title level={5}>Save to hair history</Typography.Title>
              <Typography.Paragraph type="secondary">
                Add final visit details after the appointment so future AI
                consultations can use the confirmed hair history.
              </Typography.Paragraph>
              <Form
                form={hairHistoryFromBriefForm}
                layout="vertical"
                requiredMark={false}
              >
                <Form.Item
                  name="visitDate"
                  label="Visit date"
                  rules={[
                    { required: true, message: 'Visit date is required.' },
                  ]}
                >
                  <Input type="date" />
                </Form.Item>
                <Form.Item
                  name="productsUsed"
                  label="Products or treatments used"
                >
                  <Input.TextArea
                    rows={3}
                    maxLength={1000}
                    placeholder="Bond repair treatment, toner, styling product..."
                  />
                </Form.Item>
                <Form.Item name="barberNotes" label="Barber notes">
                  <Input.TextArea
                    rows={4}
                    maxLength={2000}
                    placeholder="What should the next barber know before recommending a service?"
                  />
                </Form.Item>
                <Button
                  type="primary"
                  loading={hairHistorySaving}
                  onClick={() => void handleSaveHairHistoryFromBrief()}
                >
                  Save to hair history
                </Button>
              </Form>
            </section>
          </Space>
        ) : null}
      </Drawer>
    </main>
  );
}
