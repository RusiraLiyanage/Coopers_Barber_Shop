import {
  Alert,
  Button,
  Card,
  Empty,
  List,
  Modal,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { getAppointments, type AppointmentRecord } from "../lib/api";

interface MyAppointmentsProps {
  open: boolean;
  authToken: string | null;
  refreshKey: number;
  onClose: () => void;
  onMakeAppointment: () => void;
}

function formatAppointmentWindow(appointment: AppointmentRecord) {
  const [startDate, startTime] = appointment.startAt.split(", ");
  const [endDate, endTime] = appointment.endAt.split(", ");

  if (startDate && endDate && startDate === endDate) {
    return `${startDate} | ${startTime} - ${endTime}`;
  }

  return `${appointment.startAt} - ${appointment.endAt}`;
}

export default function MyAppointments({
  open,
  authToken,
  refreshKey,
  onClose,
  onMakeAppointment,
}: MyAppointmentsProps) {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!authToken) {
      setAppointments([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    getAppointments(authToken)
      .then((response) => {
        setAppointments(response);
      })
      .catch((fetchError) => {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load appointments",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [authToken, open, refreshKey]);

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
      {!authToken ? (
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
      ) : appointments.length === 0 ? (
        <Empty
          description="No appointments found for this account yet."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={onMakeAppointment}>
            Book Your First Appointment
          </Button>
        </Empty>
      ) : (
        <List
          dataSource={appointments}
          renderItem={(appointment) => (
            <List.Item>
              <Card style={{ width: "100%", borderRadius: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <Typography.Title level={4} style={{ marginTop: 0 }}>
                      {appointment.service.name}
                    </Typography.Title>
                    <Typography.Paragraph style={{ marginBottom: 8 }}>
                      {formatAppointmentWindow(appointment)}
                    </Typography.Paragraph>
                    <Typography.Text type="secondary">
                      Staff: {appointment.staff.displayName}
                    </Typography.Text>
                  </div>

                  <Tag
                    color={appointment.status === "booked" ? "green" : "default"}
                    style={{ alignSelf: "flex-start" }}
                  >
                    {appointment.status.toUpperCase()}
                  </Tag>
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}
    </Modal>
  );
}
