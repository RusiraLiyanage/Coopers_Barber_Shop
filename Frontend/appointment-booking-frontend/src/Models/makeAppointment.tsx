import {
  Button,
  DatePicker,
  Form,
  Modal,
  Select,
  Spin,
  Typography,
  message,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import dayjs, { type Dayjs } from "dayjs";
import {
  createAppointment,
  getAvailability,
  getServices,
  updateAppointment,
  type AppointmentRecord,
  type AuthSession,
  type ServiceOption,
} from "../lib/api";
import { getGenericErrorMessage } from "../lib/errors";

interface MakeAppointmentModalProps {
  open: boolean;
  authSession: AuthSession | null;
  editingAppointment?: AppointmentRecord | null;
  onClose: () => void;
  onBooked: () => void;
}

type AppointmentFormValues = {
  serviceId?: string;
  appointmentDate?: Dayjs;
  appointmentTime?: string;
};

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

  return dayjs(new Date(year, month - 1, day, hour, minute));
}

function getAppointmentSlot(appointment: AppointmentRecord) {
  const startAt = parseAppointmentDateTime(appointment.startAt);
  const endAt = parseAppointmentDateTime(appointment.endAt);

  if (!startAt || !endAt) {
    return "";
  }

  return `${startAt.format("HH:mm")}-${endAt.format("HH:mm")}`;
}

export default function MakeAppointmentModal({
  open,
  authSession,
  editingAppointment,
  onClose,
  onBooked,
}: MakeAppointmentModalProps) {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [form] = Form.useForm<AppointmentFormValues>();
  const selectedServiceId = Form.useWatch("serviceId", form);
  const selectedAppointmentDate = Form.useWatch("appointmentDate", form);
  const isEditMode = Boolean(editingAppointment);
  const showNoAvailabilityMessage =
    Boolean(selectedServiceId && selectedAppointmentDate) &&
    !slotsLoading &&
    slots.length === 0;

  const loadAvailabilityFor = useCallback(
    async (
      serviceId: string,
      appointmentDate: Dayjs,
      preferredSlot?: string,
    ) => {
      setSlotsLoading(true);
      setSelectedSlot(preferredSlot ?? null);

      try {
        const response = await getAvailability(
          serviceId,
          appointmentDate.format("YYYY-MM-DD"),
          editingAppointment?.id,
        );
        const nextSlots =
          preferredSlot && !response.includes(preferredSlot)
            ? [preferredSlot, ...response]
            : response;

        setSlots(nextSlots);
      } catch (error) {
        setSlots([]);
        messageApi.error(
          getGenericErrorMessage("Load appointment availability", error),
        );
      } finally {
        setSlotsLoading(false);
      }
    },
    [editingAppointment?.id, messageApi],
  );

  useEffect(() => {
    if (!open || !authSession) {
      return;
    }

    form.resetFields();
    setSlots([]);
    setSelectedSlot(null);
    setServicesLoading(true);

    getServices()
      .then((response) => {
        setServices(response.filter((service) => service.isActive));

        if (!editingAppointment) {
          return;
        }

        const appointmentDate = parseAppointmentDateTime(
          editingAppointment.startAt,
        );
        const appointmentSlot = getAppointmentSlot(editingAppointment);

        if (!appointmentDate || !appointmentSlot) {
          messageApi.error("Unable to load appointment details for update");
          return;
        }

        form.setFieldsValue({
          serviceId: editingAppointment.serviceId,
          appointmentDate,
          appointmentTime: appointmentSlot,
        });
        setSelectedSlot(appointmentSlot);
        void loadAvailabilityFor(
          editingAppointment.serviceId,
          appointmentDate,
          appointmentSlot,
        );
      })
      .catch((error: unknown) => {
        messageApi.error(
          getGenericErrorMessage("Load appointment services", error),
        );
      })
      .finally(() => {
        setServicesLoading(false);
      });
  }, [
    authSession,
    editingAppointment,
    form,
    loadAvailabilityFor,
    messageApi,
    open,
  ]);

  const loadAvailability = async () => {
    if (!authSession) {
      messageApi.error("Please log in to book an appointment");
      return;
    }

    const serviceId = form.getFieldValue("serviceId");
    const appointmentDate = form.getFieldValue("appointmentDate");

    if (!serviceId || !appointmentDate) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    setSlotsLoading(true);
    setSelectedSlot(null);

    await loadAvailabilityFor(serviceId, appointmentDate);
  };

  const handleSubmit = async (values: AppointmentFormValues) => {
    if (
      !authSession ||
      !values.serviceId ||
      !values.appointmentDate ||
      !values.appointmentTime
    ) {
      messageApi.error("Please log in and complete the form");
      return;
    }

    setConfirmLoading(true);

    try {
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, {
          slot: values.appointmentTime,
        });
        messageApi.success("Appointment updated successfully");
      } else {
        await createAppointment({
          serviceId: values.serviceId,
          date: values.appointmentDate.format("YYYY-MM-DD"),
          slot: values.appointmentTime,
        });
        messageApi.success("Appointment created successfully");
      }

      form.resetFields();
      setSlots([]);
      setSelectedSlot(null);
      onBooked();
    } catch (error) {
      messageApi.error(
        getGenericErrorMessage(
          editingAppointment ? "Update appointment" : "Create appointment",
          error,
        ),
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={
          <Typography.Title level={3} style={{ margin: 0 }}>
            {isEditMode ? "Update Appointment" : "New Appointment"}
          </Typography.Title>
        }
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        width={660}
        styles={{
          body: {
            paddingTop: 16,
          },
        }}
      >
        <Spin spinning={servicesLoading}>
          <Form<AppointmentFormValues>
            layout="vertical"
            form={form}
            onFinish={handleSubmit}
            onValuesChange={(changedValues) => {
              if (
                "serviceId" in changedValues ||
                "appointmentDate" in changedValues
              ) {
                form.setFieldValue("appointmentTime", undefined);
                loadAvailability();
              }
            }}
            autoComplete="off"
            style={{ fontSize: 16 }}
          >
            <Form.Item
              name="serviceId"
              label={
                <span style={{ fontSize: 16, fontWeight: 600 }}>Service</span>
              }
              rules={[
                {
                  required: true,
                  message: "Please select a service",
                },
              ]}
            >
              <Select
                size="large"
                placeholder="Select a service"
                disabled={isEditMode}
                options={services.map((service) => ({
                  value: service.id,
                  label: `${service.name} - ${service.durationMinutes} mins`,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="appointmentDate"
              label={
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  Appointment Date
                </span>
              }
              rules={[
                {
                  required: true,
                  message: "Please select an appointment date",
                },
              ]}
            >
              <DatePicker
                size="large"
                style={{ width: "100%" }}
                disabled={isEditMode || !form.getFieldValue("serviceId")}
                disabledDate={(current) => {
                  if (!current) {
                    return false;
                  }

                  const day = current.day();
                  const today = new Date();
                  const startOfToday = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate(),
                  );

                  return (
                    day === 0 ||
                    day === 6 ||
                    current.toDate() < startOfToday
                  );
                }}
              />
            </Form.Item>

            <Form.Item
              name="appointmentTime"
              label={
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  Available Time Slots
                </span>
              }
              rules={[
                {
                  required: true,
                  message: "Please select a time slot",
                },
              ]}
            >
              {slotsLoading ? (
                <Spin />
              ) : showNoAvailabilityMessage ? (
                <div style={{ color: "#8c8c8c", fontSize: 16 }}>
                  No appointments available for the selected service and date.
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {slots.map((slot) => (
                    <Button
                      key={slot}
                      type={selectedSlot === slot ? "primary" : "default"}
                      size="large"
                      style={{
                        minWidth: 96,
                        height: 44,
                        fontSize: 16,
                        fontWeight: 600,
                      }}
                      onClick={() => {
                        setSelectedSlot(slot);
                        form.setFieldValue("appointmentTime", slot);
                      }}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              )}
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "flex-end",
                }}
              >
                <Button size="large" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={confirmLoading}
                  disabled={!slots.length}
                  size="large"
                >
                  {isEditMode ? "Update Appointment" : "Book Appointment"}
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </>
  );
}
