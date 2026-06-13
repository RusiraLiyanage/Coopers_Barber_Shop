import {
  Alert,
  Button,
  Dropdown,
  Empty,
  List,
  Modal,
  Segmented,
  Tabs,
  Typography,
  message,
  type MenuProps,
} from 'antd';
import { ExclamationCircleFilled, MoreOutlined } from '@ant-design/icons';
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
  isSessionIdleExpiredError,
  type AppointmentRecord,
  type AuthSession,
} from '../lib/api';
import {
  GENERIC_ERROR_MESSAGE,
  getGenericErrorMessage,
  logDevelopmentError,
} from '../lib/errors';
import {
  SACard,
  SALoadingPanel,
  SAModalHeader,
  SAStatusTag,
} from '../components/common';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  cancelAppointmentAction,
  getAppointmentsAction,
} from '../store/appointments/action';
import {
  selectAppointmentCancelling,
  selectAppointments,
  selectAppointmentsLoading,
} from '../store/appointments/selector';
import { clearAppointments } from '../store/appointments/slice';
import './MyAppointments.css';

interface MyAppointmentsProps {
  open: boolean;
  authSession: AuthSession | null;
  refreshKey: number;
  onClose: () => void;
  onMakeAppointment: () => void;
  onUpdateAppointment: (appointment: AppointmentRecord) => void;
}

type AppointmentViewMode = 'cards' | 'calendar';
type AppointmentTabKey = 'today' | 'scheduled' | 'cancelled';
type AppointmentStatusCategory =
  | 'scheduled'
  | 'cancelledClient'
  | 'cancelledBarber';

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

function getAppointmentsModalWidth(
  viewMode: AppointmentViewMode,
  calendarView: View,
) {
  if (viewMode !== 'calendar') {
    return 920;
  }

  if (calendarView === 'week') {
    return 'min(94vw, 1280px)';
  }

  if (calendarView === 'day') {
    return 'min(88vw, 1120px)';
  }

  return 1080;
}

const calendarLocalizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    'en-AU': enAU,
  },
});

function getAppointmentStatusCategory(
  status: string,
): AppointmentStatusCategory {
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

function isScheduledAppointment(appointment: AppointmentRecord) {
  return getAppointmentStatusCategory(appointment.status) === 'scheduled';
}

function getAppointmentStatusLabel(status: string) {
  switch (getAppointmentStatusCategory(status)) {
    case 'cancelledClient':
      return 'Cancelled by client';
    case 'cancelledBarber':
      return 'Cancelled by barber';
    default:
      return 'Scheduled';
  }
}

function getAppointmentTagColor(status: string) {
  switch (getAppointmentStatusCategory(status)) {
    case 'cancelledClient':
      return 'red';
    case 'cancelledBarber':
      return 'gold';
    default:
      return 'green';
  }
}

const getCalendarEventStyle: EventPropGetter<AppointmentCalendarEvent> = (
  event,
) => ({
  className: `appointment-event-${getAppointmentStatusCategory(event.status)}`,
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

function formatDisplayTime(timeText: string) {
  const [hourText = '', minuteText = ''] = timeText.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return timeText;
  }

  const displayHour = hour % 12 || 12;
  const period = hour >= 12 ? 'PM' : 'AM';

  return `${displayHour}:${minuteText.padStart(2, '0')} ${period}`;
}

function formatAppointmentWindow(appointment: AppointmentRecord) {
  const [startDate, startTime] = appointment.startAt.split(', ');
  const [endDate, endTime] = appointment.endAt.split(', ');

  if (startDate && startTime && endDate && endTime && startDate === endDate) {
    return `${formatReadableDate(startDate)} | ${formatDisplayTime(
      startTime,
    )} - ${formatDisplayTime(endTime)}`;
  }

  if (!startDate || !startTime || !endDate || !endTime) {
    return `${appointment.startAt} - ${appointment.endAt}`;
  }

  return `${formatReadableDate(startDate)} ${formatDisplayTime(
    startTime,
  )} - ${formatReadableDate(endDate)} ${formatDisplayTime(endTime)}`;
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
      renderItem={(appointment) => {
        const isScheduled = isScheduledAppointment(appointment);

        return (
          <List.Item className="appointments-list-item">
            <SACard radius={8} bodyPadding={24}>
              <div className="appointments-list-card-content">
                <div>
                  <Typography.Title
                    level={3}
                    className="appointments-list-card-title"
                  >
                    {appointment.serviceName}
                  </Typography.Title>
                  <Typography.Paragraph className="appointments-list-card-time">
                    {formatAppointmentWindow(appointment)}
                  </Typography.Paragraph>
                  <Typography.Text
                    type="secondary"
                    className="appointments-list-card-staff"
                  >
                    Staff: {appointment.staffName}
                  </Typography.Text>
                </div>

                <div className="appointments-list-card-actions">
                  <SAStatusTag
                    color={getAppointmentTagColor(appointment.status)}
                    size="large"
                  >
                    {getAppointmentStatusLabel(appointment.status)}
                  </SAStatusTag>

                  {isScheduled ? (
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
                  ) : null}
                </div>
              </div>
            </SACard>
          </List.Item>
        );
      }}
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

        const shouldShowTime = !isAgendaView;
        const eventContent = (
          <div className={eventClassNames.join(' ')}>
            <div className="appointment-calendar-event-main">
              {shouldShowTime ? (
                <span className="appointment-calendar-event-time">
                  {isTimeGridView
                    ? formatCalendarEventTime(event)
                    : format(event.start, 'h:mm a')}
                </span>
              ) : null}
              <span className="appointment-calendar-event-title">
                {event.title}
              </span>
            </div>

            {isAgendaView || isTimeGridView ? (
              <div className="appointment-calendar-event-summary">
                <span>Staff: {event.staffName}</span>
                {isAgendaView ? (
                  <span className="appointment-calendar-event-status">
                    {getAppointmentStatusLabel(event.status)}
                  </span>
                ) : null}
              </div>
            ) : null}

            {isMonthView ? (
              <div className="appointment-calendar-event-details">
                <span>{formatCalendarEventTime(event)}</span>
                <span>Staff: {event.staffName}</span>
              </div>
            ) : null}
          </div>
        );

        if (!isScheduledAppointment(event.appointment)) {
          return eventContent;
        }

        return (
          <AppointmentActionsDropdown
            appointment={event.appointment}
            triggerMode="full"
            onUpdateAppointment={onUpdateAppointment}
            onCancelAppointment={onCancelAppointment}
          >
            {eventContent}
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
        dayLayoutAlgorithm="no-overlap"
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
  const dispatch = useAppDispatch();
  const appointments = useAppSelector(selectAppointments);
  const loading = useAppSelector(selectAppointmentsLoading);
  const isCancellingAppointment = useAppSelector(selectAppointmentCancelling);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<AppointmentViewMode>('cards');
  const [calendarView, setCalendarView] = useState<View>('month');
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const timeGridScrollTopRef = useRef(0);
  const [activeAppointmentTab, setActiveAppointmentTab] =
    useState<AppointmentTabKey>('today');
  const [appointmentPendingCancellation, setAppointmentPendingCancellation] =
    useState<AppointmentRecord | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const hasInitializedCalendarDateRef = useRef(false);
  const calendarPanelClassName = [
    'appointments-calendar-panel',
    `appointments-calendar-panel-${calendarView}`,
  ].join(' ');
  const todayDateKey = useMemo(() => getTodayDateKey(), []);
  const sortedAppointments = useMemo(
    () => sortAppointmentsByStartTime(appointments),
    [appointments],
  );
  const scheduledAppointments = useMemo(
    () => sortedAppointments.filter(isScheduledAppointment),
    [sortedAppointments],
  );
  const todaysAppointments = useMemo(
    () =>
      scheduledAppointments.filter(
        (appointment) => getAppointmentDateKey(appointment) === todayDateKey,
      ),
    [scheduledAppointments, todayDateKey],
  );
  const scheduledOtherAppointments = useMemo(
    () =>
      scheduledAppointments.filter(
        (appointment) => getAppointmentDateKey(appointment) !== todayDateKey,
      ),
    [scheduledAppointments, todayDateKey],
  );
  const cancelledAppointments = useMemo(
    () =>
      sortedAppointments.filter(
        (appointment) => !isScheduledAppointment(appointment),
      ),
    [sortedAppointments],
  );

  useEffect(() => {
    if (!open) {
      hasInitializedCalendarDateRef.current = false;
      setViewMode('cards');
      setCalendarView('month');
      setActiveAppointmentTab('today');
      timeGridScrollTopRef.current = 0;
      return;
    }

    if (!authSession) {
      dispatch(clearAppointments());
      setError(null);
      return;
    }

    setError(null);

    dispatch(getAppointmentsAction())
      .unwrap()
      .catch((fetchError: unknown) => {
        if (isSessionIdleExpiredError(fetchError)) {
          return;
        }

        logDevelopmentError('Load appointments', fetchError);
        setError(GENERIC_ERROR_MESSAGE);
      });
  }, [authSession, dispatch, open, refreshKey]);

  useEffect(() => {
    if (
      !open ||
      viewMode !== 'calendar' ||
      hasInitializedCalendarDateRef.current ||
      sortedAppointments.length === 0
    ) {
      return;
    }

    setCalendarDate(getCalendarSelectedDate(sortedAppointments));
    hasInitializedCalendarDateRef.current = true;
  }, [open, sortedAppointments, viewMode]);

  const handleTimeGridScrollTopChange = useCallback((scrollTop: number) => {
    timeGridScrollTopRef.current = scrollTop;
  }, []);

  const handleCalendarViewChange = useCallback((nextView: View) => {
    setCalendarView(nextView);

    if (nextView === 'week' || nextView === 'day') {
      setCalendarDate(new Date());
      timeGridScrollTopRef.current = 0;
    }
  }, []);

  const renderViewSwitch = () => (
    <Segmented<AppointmentViewMode>
      className="appointments-view-switch"
      value={viewMode}
      onChange={setViewMode}
      options={[
        { label: 'Cards', value: 'cards' },
        { label: 'Calendar', value: 'calendar' },
      ]}
    />
  );

  const renderCalendarLegend = () => (
    <div className="appointments-calendar-legend" aria-label="Calendar legend">
      <span className="appointments-calendar-legend-item">
        <span className="appointments-calendar-legend-dot appointments-calendar-legend-dot-scheduled" />
        Scheduled
      </span>
      <span className="appointments-calendar-legend-item">
        <span className="appointments-calendar-legend-dot appointments-calendar-legend-dot-client" />
        Cancelled by client
      </span>
      <span className="appointments-calendar-legend-item">
        <span className="appointments-calendar-legend-dot appointments-calendar-legend-dot-barber" />
        Cancelled by barber
      </span>
    </div>
  );

  const handleCancelAppointment = (appointment: AppointmentRecord) => {
    setAppointmentPendingCancellation(appointment);
  };

  const handleCancelConfirmationClose = () => {
    if (isCancellingAppointment) {
      return;
    }

    setAppointmentPendingCancellation(null);
  };

  const handleCancelConfirmationOk = async () => {
    if (!appointmentPendingCancellation) {
      return;
    }

    try {
      await dispatch(
        cancelAppointmentAction(appointmentPendingCancellation.id),
      ).unwrap();
      setAppointmentPendingCancellation(null);
      messageApi.success('Appointment cancelled successfully');
    } catch (cancelError) {
      if (isSessionIdleExpiredError(cancelError)) {
        return;
      }

      messageApi.error(
        getGenericErrorMessage('Cancel appointment', cancelError),
      );
    }
  };

  const renderAppointmentsContent = (
    appointmentGroup: AppointmentRecord[],
    emptyDescription: string,
    emptyActionLabel: string,
  ) => {
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

  const renderCalendarContent = () => (
    <AppointmentsCalendar
      appointments={sortedAppointments}
      emptyDescription="No appointments found for this account yet."
      emptyActionLabel="Book an Appointment"
      calendarView={calendarView}
      calendarDate={calendarDate}
      timeGridScrollTop={timeGridScrollTopRef.current}
      onCalendarViewChange={handleCalendarViewChange}
      onCalendarDateChange={setCalendarDate}
      onTimeGridScrollTopChange={handleTimeGridScrollTopChange}
      onMakeAppointment={onMakeAppointment}
      onUpdateAppointment={onUpdateAppointment}
      onCancelAppointment={handleCancelAppointment}
    />
  );

  return (
    <Modal
      title={
        <SAModalHeader
          title="My Appointments"
          subtitle="Upcoming bookings linked to your current account."
        />
      }
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={getAppointmentsModalWidth(viewMode, calendarView)}
      styles={{
        body: {
          height: '70vh',
          overflowY: 'hidden',
          paddingTop: 12,
        },
      }}
    >
      {contextHolder}
      <Modal
        title={
          <span className="cancel-appointment-confirmation-title">
            <ExclamationCircleFilled />
            Are you sure you want to cancel this appointment?
          </span>
        }
        open={appointmentPendingCancellation !== null}
        onOk={handleCancelConfirmationOk}
        onCancel={handleCancelConfirmationClose}
        okText="Yes, cancel appointment"
        okButtonProps={{ danger: true, loading: isCancellingAppointment }}
        cancelText="No, keep appointment"
        confirmLoading={isCancellingAppointment}
        centered
        zIndex={3000}
      >
        {appointmentPendingCancellation ? (
          <Typography.Text>
            {appointmentPendingCancellation.serviceName} at{' '}
            {formatAppointmentWindow(appointmentPendingCancellation)} will be
            marked as cancelled and kept in your appointment history.
          </Typography.Text>
        ) : null}
      </Modal>
      {!authSession ? (
        <Alert
          type="info"
          message="Log in to view your appointments"
          description="This overlay only shows bookings for the currently logged-in customer."
          showIcon
        />
      ) : loading ? (
        <SALoadingPanel />
      ) : error ? (
        <Alert type="error" message={error} showIcon />
      ) : viewMode === 'calendar' ? (
        <div className={calendarPanelClassName}>
          <div className="appointments-calendar-view-header">
            {renderCalendarLegend()}
            {renderViewSwitch()}
          </div>

          <div className="appointments-calendar-panel-content">
            {renderCalendarContent()}
          </div>
        </div>
      ) : (
        <Tabs
          className="appointments-tabs"
          activeKey={activeAppointmentTab}
          onChange={(nextActiveKey) => {
            setActiveAppointmentTab(nextActiveKey as AppointmentTabKey);
          }}
          tabBarExtraContent={renderViewSwitch()}
          items={[
            {
              key: 'today',
              label: (
                <span className="appointments-tab-label">
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
              key: 'scheduled',
              label: (
                <span className="appointments-tab-label">
                  Scheduled ({scheduledOtherAppointments.length})
                </span>
              ),
              children: renderAppointmentsContent(
                scheduledOtherAppointments,
                'No scheduled appointments found for this account yet.',
                'Book Your First Appointment',
              ),
            },
            {
              key: 'cancelled',
              label: (
                <span className="appointments-tab-label">
                  Cancelled ({cancelledAppointments.length})
                </span>
              ),
              children: renderAppointmentsContent(
                cancelledAppointments,
                'No cancelled appointments found for this account yet.',
                'Book an Appointment',
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
}
