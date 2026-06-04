import {
  Alert,
  Button,
  Card,
  Empty,
  List,
  Modal,
  Spin,
  Tag,
  Tabs,
  Typography,
} from "antd";
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
  const [datePart = "", timePart = ""] = appointment.startAt.split(", ");
  const [day, month, year] = datePart.split("/").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  return new Date(year, month - 1, day, hour, minute).getTime();
}

function sortAppointmentsByStartTime(appointments: AppointmentRecord[]) {
  return [...appointments].sort(
    (left, right) =>
      getAppointmentStartTime(left) - getAppointmentStartTime(right),
  );
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
      width={920}
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
              children: (
                <AppointmentsList
                  appointments={todaysAppointments}
                  emptyDescription="No appointments scheduled for today."
                  emptyActionLabel="Book an Appointment"
                  onMakeAppointment={onMakeAppointment}
                />
              ),
            },
            {
              key: "other",
              label: (
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  Other Appointments ({otherAppointments.length})
                </span>
              ),
              children: (
                <AppointmentsList
                  appointments={otherAppointments}
                  emptyDescription="No other appointments found for this account yet."
                  emptyActionLabel="Book Your First Appointment"
                  onMakeAppointment={onMakeAppointment}
                />
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
}
