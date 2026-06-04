import {
  Alert,
  Button,
  Card,
  Empty,
  List,
  Modal,
  Segmented,
  Spin,
  Tag,
  Tabs,
  Typography,
} from "antd";
import {
  Calendar,
  dateFnsLocalizer,
  type EventPropGetter,
  type EventProps,
  type ToolbarProps,
  type View,
} from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { enAU } from "date-fns/locale/en-AU";
import { useEffect, useMemo, useState } from "react";
import {
  getAppointments,
  type AppointmentRecord,
  type AuthSession,
} from "../lib/api";
import { GENERIC_ERROR_MESSAGE, logDevelopmentError } from "../lib/errors";

interface MyAppointmentsProps {
  open: boolean;
  authSession: AuthSession | null;
  refreshKey: number;
  onClose: () => void;
  onMakeAppointment: () => void;
}

type AppointmentViewMode = "cards" | "calendar";

type AppointmentCalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  staffName: string;
  status: string;
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
const MONTH_EVENT_CARD_HEIGHT = 30;
const MONTH_SELECTED_EVENT_EXTRA_HEIGHT = 64;
const MONTH_ROW_VERTICAL_PADDING = 18;
const CALENDAR_VIEW_OPTIONS: CalendarViewOption[] = [
  { label: "Month", value: "month" },
  { label: "Week", value: "week" },
  { label: "Day", value: "day" },
  { label: "Agenda", value: "agenda" },
];

const calendarLocalizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: {
    "en-AU": enAU,
  },
});

const getCalendarEventStyle: EventPropGetter<AppointmentCalendarEvent> = (
  event,
) => ({
  className: event.status === "booked" ? "appointment-event-booked" : "",
  style: {
    borderRadius: 6,
    border: 0,
    fontWeight: 600,
  },
});

function formatCalendarEventTime(event: AppointmentCalendarEvent) {
  return `${format(event.start, "h:mm a")} - ${format(event.end, "h:mm a")}`;
}

function getCalendarEventDurationMinutes(event: AppointmentCalendarEvent) {
  return Math.max(0, (event.end.getTime() - event.start.getTime()) / 60000);
}

function getCalendarDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
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

function getCalendarHeight(
  events: AppointmentCalendarEvent[],
  selectedEvent: AppointmentCalendarEvent | null,
) {
  const largestDailyAppointmentCount = getLargestDailyAppointmentCount(events);
  const expandedEventHeight = selectedEvent
    ? MONTH_SELECTED_EVENT_EXTRA_HEIGHT
    : 0;
  const rowHeight = Math.max(
    MONTH_ROW_BASE_HEIGHT,
    MONTH_DATE_HEADER_HEIGHT +
      largestDailyAppointmentCount * MONTH_EVENT_CARD_HEIGHT +
      expandedEventHeight +
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
          onClick={() => onNavigate("PREV")}
        >
          Back
        </Button>
        <Button
          aria-label="Next calendar period"
          onClick={() => onNavigate("NEXT")}
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
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getOrdinalSuffix(day: number) {
  if (day >= 11 && day <= 13) {
    return "th";
  }

  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatReadableDate(dateText: string) {
  const [dayText, monthText, yearText] = dateText.split("/");
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
  const [startDate, startTime] = appointment.startAt.split(", ");
  const [endDate, endTime] = appointment.endAt.split(", ");

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
  return appointment.startAt.split(", ")[0] ?? "";
}

function getTodayDateKey() {
  return new Intl.DateTimeFormat("en-AU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getAppointmentStartTime(appointment: AppointmentRecord) {
  return (
    parseAppointmentDateTime(appointment.startAt)?.getTime() ??
    Number.MAX_SAFE_INTEGER
  );
}

function parseAppointmentDateTime(value: string) {
  const [datePart = "", timePart = ""] = value.split(", ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hourText = "", minuteText = ""] = timePart.split(":");
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

function AppointmentsList({
  appointments,
  emptyDescription,
  emptyActionLabel,
  onMakeAppointment,
}: {
  appointments: AppointmentRecord[];
  emptyDescription: string;
  emptyActionLabel: string;
  onMakeAppointment: () => void;
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
        <List.Item style={{ padding: "10px 0" }}>
          <Card
            style={{ width: "100%", borderRadius: 8 }}
            styles={{
              body: {
                padding: 24,
              },
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 20,
                flexWrap: "wrap",
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

              <Tag
                color={appointment.status === "booked" ? "green" : "default"}
                style={{
                  alignSelf: "flex-start",
                  fontSize: 14,
                  fontWeight: 600,
                  padding: "4px 10px",
                }}
              >
                {appointment.status.toUpperCase()}
              </Tag>
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
  onMakeAppointment,
}: {
  appointments: AppointmentRecord[];
  emptyDescription: string;
  emptyActionLabel: string;
  onMakeAppointment: () => void;
}) {
  const calendarEvents = useMemo(
    () => toCalendarEvents(appointments),
    [appointments],
  );
  const selectedDate = useMemo(
    () => getCalendarSelectedDate(appointments),
    [appointments],
  );
  const [selectedEvent, setSelectedEvent] =
    useState<AppointmentCalendarEvent | null>(null);
  const [calendarDate, setCalendarDate] = useState(selectedDate);
  const [calendarView, setCalendarView] = useState<View>("month");
  const calendarHeight = useMemo(
    () => getCalendarHeight(calendarEvents, selectedEvent),
    [calendarEvents, selectedEvent],
  );
  const calendarComponents = useMemo(
    () => ({
      toolbar: AppointmentCalendarToolbar,
      event: ({ event }: EventProps<AppointmentCalendarEvent>) => {
        const isSelected = selectedEvent?.id === event.id;
        const isAgendaView = calendarView === "agenda";
        const isWeekView = calendarView === "week";
        const isDayView = calendarView === "day";
        const isTimeGridView = isWeekView || isDayView;
        const isShortTimeEvent =
          isTimeGridView && getCalendarEventDurationMinutes(event) <= 30;
        const eventClassNames = [
          "appointment-calendar-event",
          `appointment-calendar-event-${calendarView}`,
        ];

        if (isSelected) {
          eventClassNames.push("appointment-calendar-event-selected");
        }

        if (isShortTimeEvent) {
          eventClassNames.push("appointment-calendar-event-short");
        }

        return (
          <div className={eventClassNames.join(" ")}>
            <div className="appointment-calendar-event-main">
              <span className="appointment-calendar-event-time">
                {isShortTimeEvent
                  ? format(event.start, "h:mm a")
                  : isAgendaView || isTimeGridView
                    ? formatCalendarEventTime(event)
                    : format(event.start, "h:mm a")}
              </span>
              <span className="appointment-calendar-event-title">
                {event.title}
              </span>
            </div>

            {(isAgendaView || isDayView) && !isShortTimeEvent ? (
              <div className="appointment-calendar-event-summary">
                <span>Staff: {event.staffName}</span>
                <span className="appointment-calendar-event-status">
                  {event.status.toUpperCase()}
                </span>
              </div>
            ) : null}

            {isSelected && !isAgendaView && !isTimeGridView ? (
              <div className="appointment-calendar-event-details">
                <span>{formatCalendarEventTime(event)}</span>
                <span>Staff: {event.staffName}</span>
                <span>{event.status.toUpperCase()}</span>
              </div>
            ) : null}
          </div>
        );
      },
    }),
    [calendarView, selectedEvent?.id],
  );

  useEffect(() => {
    setSelectedEvent(null);
    setCalendarDate(selectedDate);
  }, [appointments, selectedDate]);

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
      className={`appointments-calendar appointments-calendar-${calendarView}`}
      style={{ minHeight: calendarHeight }}
    >
      <Calendar<AppointmentCalendarEvent>
        culture="en-AU"
        localizer={calendarLocalizer}
        events={calendarEvents}
        date={calendarDate}
        view={calendarView}
        views={["month", "week", "day", "agenda"]}
        popup
        showAllEvents
        selectable={false}
        startAccessor="start"
        endAccessor="end"
        titleAccessor={(event) => `${event.title}; ${event.staffName}`}
        tooltipAccessor={() => ""}
        eventPropGetter={getCalendarEventStyle}
        onNavigate={(newDate) => {
          setCalendarDate(newDate);
          setSelectedEvent(null);
        }}
        onView={(nextView) => {
          setCalendarView(nextView);
          setSelectedEvent(null);
        }}
        onSelectEvent={(event) => {
          setSelectedEvent((currentEvent) =>
            currentEvent?.id === event.id ? null : event,
          );
        }}
        selected={selectedEvent}
        components={calendarComponents}
        min={new Date(1970, 0, 1, 8, 0)}
        max={new Date(1970, 0, 1, 19, 0)}
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
}: MyAppointmentsProps) {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<AppointmentViewMode>("cards");
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

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!authSession) {
      setAppointments([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    getAppointments()
      .then((response) => {
        setAppointments(response);
      })
      .catch((fetchError: unknown) => {
        logDevelopmentError("Load appointments", fetchError);
        setError(GENERIC_ERROR_MESSAGE);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authSession, open, refreshKey]);

  const renderAppointmentsContent = (
    appointmentGroup: AppointmentRecord[],
    emptyDescription: string,
    emptyActionLabel: string,
  ) => {
    if (viewMode === "calendar") {
      return (
        <AppointmentsCalendar
          appointments={appointmentGroup}
          emptyDescription={emptyDescription}
          emptyActionLabel={emptyActionLabel}
          onMakeAppointment={onMakeAppointment}
        />
      );
    }

    return (
      <AppointmentsList
        appointments={appointmentGroup}
        emptyDescription={emptyDescription}
        emptyActionLabel={emptyActionLabel}
        onMakeAppointment={onMakeAppointment}
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
      width={viewMode === "calendar" ? 1080 : 920}
      styles={{
        body: {
          maxHeight: "70vh",
          overflowY: "auto",
          paddingTop: 12,
        },
      }}
    >
      {!authSession ? (
        <Alert
          type="info"
          message="Log in to view your appointments"
          description="This overlay only shows bookings for the currently logged-in customer."
          showIcon
        />
      ) : loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert type="error" message={error} showIcon />
      ) : (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 12,
            }}
          >
            <Segmented<AppointmentViewMode>
              value={viewMode}
              onChange={setViewMode}
              options={[
                { label: "Cards", value: "cards" },
                { label: "Calendar", value: "calendar" },
              ]}
            />
          </div>

          <Tabs
            defaultActiveKey="today"
            items={[
              {
                key: "today",
                label: (
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    Today ({todaysAppointments.length})
                  </span>
                ),
                children: renderAppointmentsContent(
                  todaysAppointments,
                  "No appointments scheduled for today.",
                  "Book an Appointment",
                ),
              },
              {
                key: "other",
                label: (
                  <span style={{ fontSize: 16, fontWeight: 600 }}>
                    Other Appointments ({otherAppointments.length})
                  </span>
                ),
                children: renderAppointmentsContent(
                  otherAppointments,
                  "No other appointments found for this account yet.",
                  "Book Your First Appointment",
                ),
              },
            ]}
          />
        </>
      )}
    </Modal>
  );
}
