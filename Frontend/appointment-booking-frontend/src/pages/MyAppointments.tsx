import {
  Alert,
  Button,
  Card,
  Dropdown,
  Empty,
  List,
  Modal,
  Segmented,
  Spin,
  Tag,
  Tabs,
  Typography,
  message,
  type MenuProps,
} from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import {
  Calendar,
  dateFnsLocalizer,
  type EventPropGetter,
  type EventProps,
  type ToolbarProps,
  type View,
} from 'react-big-calendar';
import { format, getDay, parse, startOfWeek } from 'date-fns';
import { enAU } from 'date-fns/locale/en-AU';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  cancelAppointment,
  getAppointments,
  type AppointmentRecord,
  type AuthSession,
} from '../lib/api';
import {
  GENERIC_ERROR_MESSAGE,
  getGenericErrorMessage,
  logDevelopmentError,
} from '../lib/errors';

interface MyAppointmentsProps {
  open: boolean;
  authSession: AuthSession | null;
  refreshKey: number;
  onClose: () => void;
  onMakeAppointment: () => void;
  onUpdateAppointment: (appointment: AppointmentRecord) => void;
}

type AppointmentViewMode = 'cards' | 'calendar';
type AppointmentTabKey = 'today' | 'other';

type AppointmentCalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  staffName: string;
  status: string;
  appointment: AppointmentRecord;
};

type CalendarViewOption = {
  label: string;
  value: View;
};

const MIN_CALENDAR_HEIGHT = 680;
const CALENDAR_TOOLBAR_HEIGHT = 72;
const MONTH_VIEW_ROWS = 6;
const MONTH_ROW_BASE_HEIGHT = 100;
const MONTH_DATE_HEADER_HEIGHT = 28;
const MONTH_EVENT_CARD_HEIGHT = 82;
const MONTH_ROW_VERTICAL_PADDING = 18;
const CALENDAR_VIEW_OPTIONS: CalendarViewOption[] = [
  { label: 'Month', value: 'month' },
  { label: 'Week', value: 'week' },
  { label: 'Day', value: 'day' },
  { label: 'Agenda', value: 'agenda' },
];

const calendarLocalizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    'en-AU': enAU,
  },
});

const getCalendarEventStyle: EventPropGetter<AppointmentCalendarEvent> = (
  event,
) => ({
  className: event.status === 'booked' ? 'appointment-event-booked' : '',
  style: {
    borderRadius: 6,
    border: 0,
    fontWeight: 600,
  },
});

function formatCalendarEventTime(event: AppointmentCalendarEvent) {
  return `${format(event.start, 'h:mm a')} - ${format(event.end, 'h:mm a')}`;
}

function getCalendarEventDurationMinutes(event: AppointmentCalendarEvent) {
  return Math.max(0, (event.end.getTime() - event.start.getTime()) / 60000);
}

function getCalendarDateKey(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function getLargestDailyAppointmentCount(events: AppointmentCalendarEvent[]) {
  const appointmentCountByDate = events.reduce<Record<string, number>>(
    (counts, event) => {
      const dateKey = getCalendarDateKey(event.start);
      counts[dateKey] = (counts[dateKey] ?? 0) + 1;

      return counts;
    },
    {},
  );

  return Math.max(0, ...Object.values(appointmentCountByDate));
}

function getCalendarHeight(events: AppointmentCalendarEvent[], view: View) {
  if (view !== 'month') {
    return MIN_CALENDAR_HEIGHT;
  }

  const largestDailyAppointmentCount = getLargestDailyAppointmentCount(events);
  const rowHeight = Math.max(
    MONTH_ROW_BASE_HEIGHT,
    MONTH_DATE_HEADER_HEIGHT +
      largestDailyAppointmentCount * MONTH_EVENT_CARD_HEIGHT +
      MONTH_ROW_VERTICAL_PADDING,
  );

  return Math.max(
    MIN_CALENDAR_HEIGHT,
    CALENDAR_TOOLBAR_HEIGHT + MONTH_VIEW_ROWS * rowHeight,
  );
}

function AppointmentCalendarToolbar({
  label,
  view,
  onNavigate,
  onView,
}: ToolbarProps<AppointmentCalendarEvent>) {
  return (
    <div className="appointments-calendar-toolbar">
      <div className="appointments-calendar-toolbar-actions">
        <Button
          aria-label="Previous calendar period"
          onClick={() => onNavigate('PREV')}
        >
          Back
        </Button>
        <Button
          aria-label="Next calendar period"
          onClick={() => onNavigate('NEXT')}
        >
          Next
        </Button>
      </div>

      <Typography.Text className="appointments-calendar-toolbar-label">
        {label}
      </Typography.Text>

      <Segmented<View>
        value={view}
        onChange={onView}
        options={CALENDAR_VIEW_OPTIONS}
      />
    </div>
  );
}

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function getOrdinalSuffix(day: number) {
  if (day >= 11 && day <= 13) {
    return 'th';
  }

  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

function formatReadableDate(dateText: string) {
  const [dayText, monthText, yearText] = dateText.split('/');
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12
  ) {
    return dateText;
  }

  return `${day}${getOrdinalSuffix(day)} ${SHORT_MONTHS[month - 1]} ${year}`;
}

function formatAppointmentWindow(appointment: AppointmentRecord) {
  const [startDate, startTime] = appointment.startAt.split(', ');
  const [endDate, endTime] = appointment.endAt.split(', ');

  if (startDate && startTime && endDate && endTime && startDate === endDate) {
    return `${formatReadableDate(startDate)} | ${startTime} - ${endTime}`;
  }

  if (!startDate || !startTime || !endDate || !endTime) {
    return `${appointment.startAt} - ${appointment.endAt}`;
  }

  return `${formatReadableDate(startDate)} ${startTime} - ${formatReadableDate(
    endDate,
  )} ${endTime}`;
}

function getAppointmentDateKey(appointment: AppointmentRecord) {
  return appointment.startAt.split(', ')[0] ?? '';
}

function getTodayDateKey() {
  return new Intl.DateTimeFormat('en-AU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getAppointmentStartTime(appointment: AppointmentRecord) {
  return (
    parseAppointmentDateTime(appointment.startAt)?.getTime() ??
    Number.MAX_SAFE_INTEGER
  );
}

function parseAppointmentDateTime(value: string) {
  const [datePart = '', timePart = ''] = value.split(', ');
  const [day, month, year] = datePart.split('/').map(Number);
  const [hourText = '', minuteText = ''] = timePart.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return null;
  }

  return new Date(year, month - 1, day, hour, minute);
}

function sortAppointmentsByStartTime(appointments: AppointmentRecord[]) {
  return [...appointments].sort(
    (left, right) =>
      getAppointmentStartTime(left) - getAppointmentStartTime(right),
  );
}

function toCalendarEvents(
  appointments: AppointmentRecord[],
): AppointmentCalendarEvent[] {
  return appointments.flatMap((appointment) => {
    const startTime = parseAppointmentDateTime(appointment.startAt);
    const endTime = parseAppointmentDateTime(appointment.endAt);

    if (!startTime || !endTime) {
      return [];
    }

    return [
      {
        id: appointment.id,
        title: appointment.serviceName,
        start: startTime,
        end: endTime,
        staffName: appointment.staffName,
        status: appointment.status,
        appointment,
      },
    ];
  });
}

function getCalendarSelectedDate(appointments: AppointmentRecord[]) {
  const firstAppointment = appointments[0];

  if (!firstAppointment) {
    return new Date();
  }

  return parseAppointmentDateTime(firstAppointment.startAt) ?? new Date();
}

function AppointmentActionsDropdown({
  appointment,
  children,
  triggerMode = 'inline',
  onUpdateAppointment,
  onCancelAppointment,
}: {
  appointment: AppointmentRecord;
  children: ReactNode;
  triggerMode?: 'inline' | 'full';
  onUpdateAppointment: (appointment: AppointmentRecord) => void;
  onCancelAppointment: (appointment: AppointmentRecord) => void;
}) {
  const menu: MenuProps = {
    items: [
      { key: 'update', label: 'Update appointment' },
      { key: 'cancel', label: 'Cancel appointment', danger: true },
    ],
    onClick: ({ key, domEvent }) => {
      domEvent.stopPropagation();

      if (key === 'update') {
        onUpdateAppointment(appointment);
        return;
      }

      onCancelAppointment(appointment);
    },
  };

  return (
    <Dropdown menu={menu} trigger={['click']} placement="bottomRight">
      <span
        className={
          triggerMode === 'full'
            ? 'appointment-action-trigger appointment-action-trigger-full'
            : 'appointment-action-trigger'
        }
      >
        {children}
      </span>
    </Dropdown>
  );
}

function AppointmentsList({
  appointments,
  emptyDescription,
  emptyActionLabel,
  onMakeAppointment,
  onUpdateAppointment,
  onCancelAppointment,
}: {
  appointments: AppointmentRecord[];
  emptyDescription: string;
  emptyActionLabel: string;
  onMakeAppointment: () => void;
  onUpdateAppointment: (appointment: AppointmentRecord) => void;
  onCancelAppointment: (appointment: AppointmentRecord) => void;
}) {
  if (appointments.length === 0) {
    return (
      <Empty
        description={emptyDescription}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        <Button type="primary" size="large" onClick={onMakeAppointment}>
          {emptyActionLabel}
        </Button>
      </Empty>
    );
  }

  return (
    <List
      dataSource={appointments}
      renderItem={(appointment) => (
        <List.Item style={{ padding: '10px 0' }}>
          <Card
            style={{ width: '100%', borderRadius: 8 }}
            styles={{
              body: {
                padding: 24,
              },
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 20,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <Typography.Title
                  level={3}
                  style={{ marginTop: 0, marginBottom: 8 }}
                >
                  {appointment.serviceName}
                </Typography.Title>
                <Typography.Paragraph
                  style={{ marginBottom: 10, fontSize: 16, fontWeight: 500 }}
                >
                  {formatAppointmentWindow(appointment)}
                </Typography.Paragraph>
                <Typography.Text type="secondary" style={{ fontSize: 16 }}>
                  Staff: {appointment.staffName}
                </Typography.Text>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <Tag
                  color={appointment.status === 'booked' ? 'green' : 'default'}
                  style={{
                    alignSelf: 'flex-start',
                    fontSize: 14,
                    fontWeight: 600,
                    padding: '4px 10px',
                  }}
                >
                  {appointment.status.toUpperCase()}
                </Tag>

                <AppointmentActionsDropdown
                  appointment={appointment}
                  onUpdateAppointment={onUpdateAppointment}
                  onCancelAppointment={onCancelAppointment}
                >
                  <Button
                    aria-label={`Actions for ${appointment.serviceName}`}
                    icon={<MoreOutlined />}
                    shape="circle"
                    type="text"
                  />
                </AppointmentActionsDropdown>
              </div>
            </div>
          </Card>
        </List.Item>
      )}
    />
  );
}

function AppointmentsCalendar({
  appointments,
  emptyDescription,
  emptyActionLabel,
  calendarView,
  calendarDate,
  timeGridScrollTop,
  onCalendarViewChange,
  onCalendarDateChange,
  onTimeGridScrollTopChange,
  onMakeAppointment,
  onUpdateAppointment,
  onCancelAppointment,
}: {
  appointments: AppointmentRecord[];
  emptyDescription: string;
  emptyActionLabel: string;
  calendarView: View;
  calendarDate: Date;
  timeGridScrollTop: number;
  onCalendarViewChange: (view: View) => void;
  onCalendarDateChange: (date: Date) => void;
  onTimeGridScrollTopChange: (scrollTop: number) => void;
  onMakeAppointment: () => void;
  onUpdateAppointment: (appointment: AppointmentRecord) => void;
  onCancelAppointment: (appointment: AppointmentRecord) => void;
}) {
  const calendarContainerRef = useRef<HTMLDivElement | null>(null);
  const calendarEvents = useMemo(
    () => toCalendarEvents(appointments),
    [appointments],
  );
  const calendarHeight = useMemo(
    () => getCalendarHeight(calendarEvents, calendarView),
    [calendarEvents, calendarView],
  );
  const calendarComponents = useMemo(
    () => ({
      toolbar: AppointmentCalendarToolbar,
      event: ({ event }: EventProps<AppointmentCalendarEvent>) => {
        const isMonthView = calendarView === 'month';
        const isAgendaView = calendarView === 'agenda';
        const isWeekView = calendarView === 'week';
        const isDayView = calendarView === 'day';
        const isTimeGridView = isWeekView || isDayView;
        const isShortTimeEvent =
          isTimeGridView && getCalendarEventDurationMinutes(event) <= 30;
        const eventClassNames = [
          'appointment-calendar-event',
          `appointment-calendar-event-${calendarView}`,
        ];

        if (isShortTimeEvent) {
          eventClassNames.push('appointment-calendar-event-short');
        }

        return (
          <AppointmentActionsDropdown
            appointment={event.appointment}
            triggerMode="full"
            onUpdateAppointment={onUpdateAppointment}
            onCancelAppointment={onCancelAppointment}
          >
            <div className={eventClassNames.join(' ')}>
              <div className="appointment-calendar-event-main">
                <span className="appointment-calendar-event-time">
                  {isAgendaView || isTimeGridView
                    ? formatCalendarEventTime(event)
                    : format(event.start, 'h:mm a')}
                </span>
                <span className="appointment-calendar-event-title">
                  {event.title}
                </span>
              </div>

              {isAgendaView || isDayView ? (
                <div className="appointment-calendar-event-summary">
                  <span>Staff: {event.staffName}</span>
                  <span className="appointment-calendar-event-status">
                    {event.status.toUpperCase()}
                  </span>
                </div>
              ) : null}

              {isMonthView ? (
                <div className="appointment-calendar-event-details">
                  <span>{formatCalendarEventTime(event)}</span>
                  <span>Staff: {event.staffName}</span>
                  <span>{event.status.toUpperCase()}</span>
                </div>
              ) : null}
            </div>
          </AppointmentActionsDropdown>
        );
      },
    }),
    [calendarView, onCancelAppointment, onUpdateAppointment],
  );
  const isTimeGridView = calendarView === 'week' || calendarView === 'day';

  useLayoutEffect(() => {
    if (!isTimeGridView) {
      return undefined;
    }

    const timeGridScrollContainer =
      calendarContainerRef.current?.querySelector('.rbc-time-content');

    if (!(timeGridScrollContainer instanceof HTMLElement)) {
      return undefined;
    }

    timeGridScrollContainer.scrollTop = timeGridScrollTop;

    const handleTimeGridScroll = () => {
      onTimeGridScrollTopChange(timeGridScrollContainer.scrollTop);
    };

    timeGridScrollContainer.addEventListener('scroll', handleTimeGridScroll, {
      passive: true,
    });

    return () => {
      onTimeGridScrollTopChange(timeGridScrollContainer.scrollTop);
      timeGridScrollContainer.removeEventListener(
        'scroll',
        handleTimeGridScroll,
      );
    };
  }, [
    calendarDate,
    calendarEvents.length,
    calendarView,
    isTimeGridView,
    onTimeGridScrollTopChange,
    timeGridScrollTop,
  ]);

  if (appointments.length === 0) {
    return (
      <Empty
        description={emptyDescription}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        <Button type="primary" size="large" onClick={onMakeAppointment}>
          {emptyActionLabel}
        </Button>
      </Empty>
    );
  }

  return (
    <div
      ref={calendarContainerRef}
      className={`appointments-calendar appointments-calendar-${calendarView}`}
      style={{ minHeight: calendarHeight }}
    >
      <Calendar<AppointmentCalendarEvent>
        culture="en-AU"
        localizer={calendarLocalizer}
        events={calendarEvents}
        date={calendarDate}
        view={calendarView}
        views={['month', 'week', 'day', 'agenda']}
        popup
        showAllEvents
        selectable={false}
        startAccessor="start"
        endAccessor="end"
        titleAccessor={(event) => `${event.title}; ${event.staffName}`}
        tooltipAccessor={() => ''}
        eventPropGetter={getCalendarEventStyle}
        onNavigate={(newDate) => {
          onCalendarDateChange(newDate);
        }}
        onView={(nextView) => {
          onCalendarViewChange(nextView);
        }}
        components={calendarComponents}
        min={new Date(1970, 0, 1, 8, 0)}
        max={new Date(1970, 0, 1, 19, 0)}
        scrollToTime={new Date(1970, 0, 1, 8, 0)}
        enableAutoScroll={false}
        step={15}
        timeslots={2}
        style={{ height: calendarHeight }}
      />
    </div>
  );
}

export default function MyAppointments({
  open,
  authSession,
  refreshKey,
  onClose,
  onMakeAppointment,
  onUpdateAppointment,
}: MyAppointmentsProps) {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<AppointmentViewMode>('cards');
  const [calendarView, setCalendarView] = useState<View>('month');
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const timeGridScrollTopRef = useRef(0);
  const [activeAppointmentTab, setActiveAppointmentTab] =
    useState<AppointmentTabKey>('today');
  const [messageApi, contextHolder] = message.useMessage();
  const hasInitializedCalendarDateRef = useRef(false);
  const tabsClassName = [
    'appointments-tabs',
    viewMode === 'calendar' ? `appointments-tabs-calendar-${calendarView}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const todayDateKey = useMemo(() => getTodayDateKey(), []);
  const sortedAppointments = useMemo(
    () => sortAppointmentsByStartTime(appointments),
    [appointments],
  );
  const todaysAppointments = useMemo(
    () =>
      sortedAppointments.filter(
        (appointment) => getAppointmentDateKey(appointment) === todayDateKey,
      ),
    [sortedAppointments, todayDateKey],
  );
  const otherAppointments = useMemo(
    () =>
      sortedAppointments.filter(
        (appointment) => getAppointmentDateKey(appointment) !== todayDateKey,
      ),
    [sortedAppointments, todayDateKey],
  );
  const activeTabAppointments =
    activeAppointmentTab === 'today' ? todaysAppointments : otherAppointments;

  useEffect(() => {
    if (!open) {
      hasInitializedCalendarDateRef.current = false;
      return;
    }

    if (!authSession) {
      setAppointments([]);
      setError(null);
      return;
    }

    // always the default view will be card view.
    setViewMode('cards');
    // always the default view within the calendar would be month view
    setCalendarView('month');

    setLoading(true);
    setError(null);

    getAppointments()
      .then((response) => {
        setAppointments(response);
      })
      .catch((fetchError: unknown) => {
        logDevelopmentError('Load appointments', fetchError);
        setError(GENERIC_ERROR_MESSAGE);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authSession, open, refreshKey]);

  useEffect(() => {
    if (
      !open ||
      viewMode !== 'calendar' ||
      hasInitializedCalendarDateRef.current ||
      activeTabAppointments.length === 0
    ) {
      return;
    }

    setCalendarDate(getCalendarSelectedDate(activeTabAppointments));
    hasInitializedCalendarDateRef.current = true;
  }, [activeTabAppointments, open, viewMode]);

  const handleTimeGridScrollTopChange = useCallback((scrollTop: number) => {
    timeGridScrollTopRef.current = scrollTop;
  }, []);

  const handleCancelAppointment = (appointment: AppointmentRecord) => {
    Modal.confirm({
      title: 'Cancel appointment?',
      content: `${appointment.serviceName} at ${formatAppointmentWindow(
        appointment,
      )} will be cancelled.`,
      okText: 'Cancel appointment',
      okButtonProps: { danger: true },
      cancelText: 'Keep appointment',
      async onOk() {
        try {
          await cancelAppointment(appointment.id);
          setAppointments((currentAppointments) =>
            currentAppointments.filter(
              (currentAppointment) => currentAppointment.id !== appointment.id,
            ),
          );
          messageApi.success('Appointment cancelled successfully');
        } catch (cancelError) {
          messageApi.error(
            getGenericErrorMessage('Cancel appointment', cancelError),
          );
          throw cancelError;
        }
      },
    });
  };

  const renderAppointmentsContent = (
    appointmentGroup: AppointmentRecord[],
    emptyDescription: string,
    emptyActionLabel: string,
  ) => {
    if (viewMode === 'calendar') {
      return (
        <AppointmentsCalendar
          appointments={appointmentGroup}
          emptyDescription={emptyDescription}
          emptyActionLabel={emptyActionLabel}
          calendarView={calendarView}
          calendarDate={calendarDate}
          timeGridScrollTop={timeGridScrollTopRef.current}
          onCalendarViewChange={setCalendarView}
          onCalendarDateChange={setCalendarDate}
          onTimeGridScrollTopChange={handleTimeGridScrollTopChange}
          onMakeAppointment={onMakeAppointment}
          onUpdateAppointment={onUpdateAppointment}
          onCancelAppointment={handleCancelAppointment}
        />
      );
    }

    return (
      <AppointmentsList
        appointments={appointmentGroup}
        emptyDescription={emptyDescription}
        emptyActionLabel={emptyActionLabel}
        onMakeAppointment={onMakeAppointment}
        onUpdateAppointment={onUpdateAppointment}
        onCancelAppointment={handleCancelAppointment}
      />
    );
  };

  return (
    <Modal
      title={
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            My Appointments
          </Typography.Title>
          <Typography.Text type="secondary">
            Upcoming bookings linked to your current account.
          </Typography.Text>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={viewMode === 'calendar' ? 1080 : 920}
      styles={{
        body: {
          height: '70vh',
          overflowY: 'hidden',
          paddingTop: 12,
        },
      }}
    >
      {contextHolder}
      {!authSession ? (
        <Alert
          type="info"
          message="Log in to view your appointments"
          description="This overlay only shows bookings for the currently logged-in customer."
          showIcon
        />
      ) : loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert type="error" message={error} showIcon />
      ) : (
        <Tabs
          className={tabsClassName}
          activeKey={activeAppointmentTab}
          onChange={(nextActiveKey) => {
            setActiveAppointmentTab(nextActiveKey as AppointmentTabKey);
          }}
          tabBarExtraContent={
            <Segmented<AppointmentViewMode>
              className="appointments-view-switch"
              value={viewMode}
              onChange={setViewMode}
              options={[
                { label: 'Cards', value: 'cards' },
                { label: 'Calendar', value: 'calendar' },
              ]}
            />
          }
          items={[
            {
              key: 'today',
              label: (
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  Today ({todaysAppointments.length})
                </span>
              ),
              children: renderAppointmentsContent(
                todaysAppointments,
                'No appointments scheduled for today.',
                'Book an Appointment',
              ),
            },
            {
              key: 'other',
              label: (
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  Other Appointments ({otherAppointments.length})
                </span>
              ),
              children: renderAppointmentsContent(
                otherAppointments,
                'No other appointments found for this account yet.',
                'Book Your First Appointment',
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
}
