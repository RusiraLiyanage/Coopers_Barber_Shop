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
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { format } from 'date-fns';
import { SACard, SAModalHeader, SAStatusTag } from '../components/common';
import { createAdminInvite } from '../lib/api';
import { getUserFriendlyErrorMessage } from '../lib/errors';
import {
  createBarberAction,
  getBarbersAction,
  updateBarberAction,
} from '../store/barbers/action';
import {
  selectBarbers,
  selectBarbersLoading,
  selectBarbersSaving,
} from '../store/barbers/selector';
import { getAppointmentBriefsAction } from '../store/briefs/action';
import {
  selectAppointmentBriefs,
  selectAppointmentBriefsLoading,
} from '../store/briefs/selector';
import { getHairHistoryAction } from '../store/hairHistory/action';
import {
  selectHairHistory,
  selectHairHistoryLoading,
} from '../store/hairHistory/selector';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  createSafetyRuleAction,
  getSafetyRulesAction,
  updateSafetyRuleAction,
} from '../store/safetyRules/action';
import {
  selectSafetyRules,
  selectSafetyRulesLoading,
  selectSafetyRulesSaving,
} from '../store/safetyRules/selector';
import {
  getServiceConfigsAction,
  updateServiceConfigAction,
} from '../store/serviceConfigs/action';
import {
  selectServiceConfigs,
  selectServiceConfigsLoading,
  selectServiceConfigsSaving,
} from '../store/serviceConfigs/selector';
import type {
  AppointmentBriefRecord,
  AdminInviteResponse,
  BarberRecord,
  CreateBarberPayload,
  CreateSafetyRulePayload,
  HairHistoryRecord,
  SafetyRuleRecord,
  ServiceAiConfigRecord,
  ServiceComplexity,
  StaffRole,
} from '../lib/api';
import './AdminDashboard.css';

type AdminTabKey =
  | 'overview'
  | 'barbers'
  | 'services'
  | 'safety'
  | 'briefs'
  | 'hairHistory'
  | 'invites';

type BarberFormValues = {
  displayName: string;
  email?: string;
  role: StaffRole;
  timezone: string;
  bufferAfterMinutes: number;
  skills: string[];
  rating: number;
  available: boolean;
  active: boolean;
};

type ServiceConfigFormValues = {
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

const STAFF_ROLE_OPTIONS = [
  { label: 'Junior', value: 'junior' },
  { label: 'Senior', value: 'senior' },
  { label: 'Owner', value: 'owner' },
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

function toTitleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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

function createBarberPayload(
  values: BarberFormValues,
): CreateBarberPayload {
  return {
    displayName: values.displayName.trim(),
    email: compactOptionalString(values.email),
    role: values.role,
    timezone: values.timezone.trim(),
    bufferAfterMinutes: values.bufferAfterMinutes,
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
  const [barberModalOpen, setBarberModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
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
  const [selectedBrief, setSelectedBrief] =
    useState<AppointmentBriefRecord | null>(null);

  const barbers = useAppSelector(selectBarbers);
  const serviceConfigs = useAppSelector(selectServiceConfigs);
  const safetyRules = useAppSelector(selectSafetyRules);
  const appointmentBriefs = useAppSelector(selectAppointmentBriefs);
  const hairHistory = useAppSelector(selectHairHistory);
  const barbersLoading = useAppSelector(selectBarbersLoading);
  const serviceConfigsLoading = useAppSelector(selectServiceConfigsLoading);
  const safetyRulesLoading = useAppSelector(selectSafetyRulesLoading);
  const briefsLoading = useAppSelector(selectAppointmentBriefsLoading);
  const hairHistoryLoading = useAppSelector(selectHairHistoryLoading);
  const barbersSaving = useAppSelector(selectBarbersSaving);
  const serviceConfigsSaving = useAppSelector(selectServiceConfigsSaving);
  const safetyRulesSaving = useAppSelector(selectSafetyRulesSaving);

  const serviceOptions = useMemo(
    () =>
      serviceConfigs.map((service) => ({
        label: service.name,
        value: service.id,
      })),
    [serviceConfigs],
  );

  const serviceNameById = useMemo(
    () =>
      new Map(
        serviceConfigs.map((service) => [service.id, service.name] as const),
      ),
    [serviceConfigs],
  );

  const loadAdminData = useCallback(async () => {
    try {
      await Promise.all([
        dispatch(getBarbersAction()).unwrap(),
        dispatch(getServiceConfigsAction()).unwrap(),
        dispatch(getSafetyRulesAction()).unwrap(),
        dispatch(getAppointmentBriefsAction()).unwrap(),
        dispatch(getHairHistoryAction()).unwrap(),
      ]);
    } catch (error) {
      messageApi.error(getUserFriendlyErrorMessage(error));
    }
  }, [dispatch, messageApi]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const overviewStats = useMemo(
    () => [
      {
        label: 'Active barbers',
        value: barbers.filter((barber) => barber.active).length,
      },
      {
        label: 'Service configs',
        value: serviceConfigs.length,
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
      barbers,
      hairHistory.length,
      safetyRules,
      serviceConfigs.length,
    ],
  );

  const servicesMissingSkills = useMemo(
    () =>
      serviceConfigs.filter(
        (service) => compactStringArray(service.requiredSkills).length === 0,
      ),
    [serviceConfigs],
  );

  const barbersMissingSkills = useMemo(
    () =>
      barbers.filter(
        (barber) => compactStringArray(barber.skills).length === 0,
      ),
    [barbers],
  );

  const showCreateBarberModal = () => {
    setEditingBarber(null);
    barberForm.setFieldsValue({
      displayName: '',
      email: '',
      role: 'junior',
      timezone: 'Australia/Sydney',
      bufferAfterMinutes: 15,
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
      role: barber.role,
      timezone: barber.timezone,
      bufferAfterMinutes: barber.bufferAfterMinutes,
      skills: barber.skills,
      rating: barber.rating,
      available: barber.available,
      active: barber.active,
    });
    setBarberModalOpen(true);
  };

  const showServiceModal = (service: ServiceAiConfigRecord) => {
    setEditingService(service);
    serviceConfigForm.setFieldsValue({
      requiredSkills: service.requiredSkills,
      safetyTriggers: service.safetyTriggers,
      complexity: service.complexity,
      isActive: service.isActive,
    });
    setServiceModalOpen(true);
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

      messageApi.success('Barber profile saved.');
      setBarberModalOpen(false);
    } catch (error) {
      messageApi.error(getUserFriendlyErrorMessage(error));
    }
  };

  const handleSaveServiceConfig = async () => {
    if (!editingService) {
      return;
    }

    const values = await serviceConfigForm.validateFields();

    try {
      await dispatch(
        updateServiceConfigAction({
          id: editingService.id,
          payload: {
            requiredSkills: compactStringArray(values.requiredSkills),
            safetyTriggers: compactStringArray(values.safetyTriggers),
            complexity: values.complexity,
            isActive: values.isActive,
          },
        }),
      ).unwrap();

      messageApi.success('Service AI config saved.');
      setServiceModalOpen(false);
    } catch (error) {
      messageApi.error(getUserFriendlyErrorMessage(error));
    }
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

      messageApi.success('Safety rule saved.');
      setSafetyModalOpen(false);
    } catch (error) {
      messageApi.error(getUserFriendlyErrorMessage(error));
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
      messageApi.error(getUserFriendlyErrorMessage(error));
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
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: StaffRole) => <Tag>{toTitleCase(role)}</Tag>,
    },
    {
      title: 'Skills',
      dataIndex: 'skills',
      key: 'skills',
      render: (skills: string[]) => renderTags(skills),
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      width: 100,
      render: (rating: number) => rating.toFixed(1),
    },
    {
      title: 'Buffer',
      dataIndex: 'bufferAfterMinutes',
      key: 'bufferAfterMinutes',
      width: 110,
      render: (minutes: number) => `${minutes} min`,
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
      width: 120,
      render: (_, barber) => (
        <Button
          icon={<EditOutlined />}
          onClick={() => showEditBarberModal(barber)}
        >
          Edit
        </Button>
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
      render: (skills: string[]) => renderTags(skills),
    },
    {
      title: 'Safety triggers',
      dataIndex: 'safetyTriggers',
      key: 'safetyTriggers',
      render: (triggers: string[]) => renderTags(triggers),
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
          Edit
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
      render: (_, brief) =>
        brief.barber?.displayName ??
        brief.booking.staff?.displayName ??
        'Unassigned',
    },
    {
      title: 'Safety',
      dataIndex: 'safetyNotes',
      key: 'safetyNotes',
      width: 180,
      render: (safetyNotes: string | null) =>
        safetyNotes ? <Tag color="gold">Review</Tag> : <Tag>Clear</Tag>,
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
                      message="Services missing required skills"
                      description={servicesMissingSkills
                        .map((service) => service.name)
                        .join(', ')}
                    />
                  ) : null}
                  {barbersMissingSkills.length > 0 ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="Barbers missing skills"
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
                  dataSource={barbers}
                  loading={barbersLoading}
                  scroll={{ x: 980 }}
                  pagination={{ pageSize: 8 }}
                />
              </div>
            ),
          },
          {
            key: 'services',
            label: 'Service AI Config',
            children: (
              <div className="admin-table-section">
                <div className="admin-section-toolbar">
                  <Typography.Title level={4}>
                    Service matching rules
                  </Typography.Title>
                </div>
                <Table
                  rowKey="id"
                  columns={serviceColumns}
                  dataSource={serviceConfigs}
                  loading={serviceConfigsLoading}
                  scroll={{ x: 1040 }}
                  pagination={{ pageSize: 8 }}
                />
              </div>
            ),
          },
          {
            key: 'safety',
            label: 'Safety Rules',
            children: (
              <div className="admin-table-section">
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
                  pagination={{ pageSize: 8 }}
                />
              </div>
            ),
          },
          {
            key: 'briefs',
            label: 'Appointment Briefs',
            children: (
              <div className="admin-table-section">
                <div className="admin-section-toolbar">
                  <Typography.Title level={4}>
                    Generated appointment briefs
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
                    pagination={{ pageSize: 8 }}
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
                    pagination={{ pageSize: 8 }}
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
          >
            <Input />
          </Form.Item>
          <div className="admin-form-grid">
            <Form.Item name="email" label="Email">
              <Input />
            </Form.Item>
            <Form.Item name="role" label="Role" rules={[{ required: true }]}>
              <Select options={STAFF_ROLE_OPTIONS} />
            </Form.Item>
          </div>
          <div className="admin-form-grid">
            <Form.Item
              name="timezone"
              label="Timezone"
              rules={[{ required: true, message: 'Timezone is required.' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="bufferAfterMinutes"
              label="Buffer after minutes"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} max={120} className="admin-full-width" />
            </Form.Item>
          </div>
          <Form.Item name="skills" label="Skills">
            <Select mode="tags" tokenSeparators={[',']} />
          </Form.Item>
          <div className="admin-form-grid">
            <Form.Item name="rating" label="Rating" rules={[{ required: true }]}>
              <InputNumber min={0} max={5} step={0.1} className="admin-full-width" />
            </Form.Item>
            <div className="admin-switch-row">
              <Form.Item name="available" label="Available" valuePropName="checked">
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
          title={editingService?.name ?? 'Service AI Config'}
          subtitle="Inputs used for future consultation and matching logic."
          className="admin-modal-header"
        />
        <Form form={serviceConfigForm} layout="vertical" requiredMark>
          <Form.Item name="requiredSkills" label="Required skills">
            <Select mode="tags" tokenSeparators={[',']} />
          </Form.Item>
          <Form.Item name="safetyTriggers" label="Safety triggers">
            <Select mode="tags" tokenSeparators={[',']} />
          </Form.Item>
          <div className="admin-form-grid">
            <Form.Item
              name="complexity"
              label="Complexity"
              rules={[{ required: true }]}
            >
              <Select options={COMPLEXITY_OPTIONS} />
            </Form.Item>
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
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
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="serviceIds"
            label="Services"
            rules={[{ required: true, message: 'At least one service is required.' }]}
          >
            <Select mode="multiple" options={serviceOptions} />
          </Form.Item>
          <Form.Item
            name="message"
            label="Message"
            rules={[{ required: true, message: 'Message is required.' }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <div className="admin-form-grid">
            <Form.Item
              name="severity"
              label="Severity"
              rules={[{ required: true }]}
            >
              <Select options={SEVERITY_OPTIONS} />
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
        title="Appointment brief"
        width={560}
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
                {selectedBrief.barber?.displayName ??
                  selectedBrief.booking.staff.displayName}
              </Descriptions.Item>
            </Descriptions>
            <Alert
              type={selectedBrief.safetyNotes ? 'warning' : 'success'}
              showIcon
              message={selectedBrief.safetyNotes ?? 'No safety notes'}
            />
            <div>
              <Typography.Title level={5}>Client summary</Typography.Title>
              <Typography.Paragraph>
                {selectedBrief.clientSummary}
              </Typography.Paragraph>
            </div>
            <div>
              <Typography.Title level={5}>Hair state</Typography.Title>
              {renderTags(selectedBrief.hairState)}
            </div>
            <div>
              <Typography.Title level={5}>Desired look</Typography.Title>
              <Typography.Paragraph>
                {selectedBrief.desiredLook ?? 'Not provided'}
              </Typography.Paragraph>
            </div>
          </Space>
        ) : null}
      </Drawer>
    </main>
  );
}
