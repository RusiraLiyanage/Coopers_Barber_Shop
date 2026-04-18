import {
  Button,
  DatePicker,
  Form,
  Modal,
  Select,
  Spin,
  message,
} from "antd";
import { useEffect, useState } from "react";
import {
  createAppointment,
  getAvailability,
  getServices,
  type ServiceOption,
} from "../lib/api";

interface MakeAppointmentModalProps {
  open: boolean;
  authToken: string | null;
  onClose: () => void;
  onBooked: () => void;
}

type AppointmentFormValues = {
  serviceId?: string;
  appointmentDate?: { format: (pattern: string) => string; day: () => number };
  appointmentTime?: string;
};

export default function MakeAppointmentModal({
  open,
  authToken,
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
  const showNoAvailabilityMessage =
    Boolean(selectedServiceId && selectedAppointmentDate) &&
    !slotsLoading &&
    slots.length === 0;

  useEffect(() => {
    if (!open || !authToken) {
      return;
    }

    form.resetFields();
    setSlots([]);
    setSelectedSlot(null);
    setServicesLoading(true);

    getServices()
      .then((response) => {
        setServices(response.filter((service) => service.isActive));
      })
      .catch((error) => {
        messageApi.error(
          error instanceof Error ? error.message : "Failed to load services",
        );
      })
      .finally(() => {
        setServicesLoading(false);
      });
  }, [authToken, form, messageApi, open]);

  const loadAvailability = async () => {
    if (!authToken) {
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

    try {
      const response = await getAvailability(
        authToken,
        serviceId,
        appointmentDate.format("YYYY-MM-DD"),
      );
      setSlots(response);
    } catch (error) {
      setSlots([]);
      messageApi.error(
        error instanceof Error
          ? error.message
          : "Failed to load appointment slots",
      );
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleSubmit = async (values: AppointmentFormValues) => {
    if (!authToken || !values.serviceId || !values.appointmentDate) {
      messageApi.error("Please log in and complete the form");
      return;
    }

    setConfirmLoading(true);

    try {
      await createAppointment(authToken, {
        serviceId: values.serviceId,
        date: values.appointmentDate.format("YYYY-MM-DD"),
        slot: values.appointmentTime || "",
      });
      messageApi.success("Appointment created successfully");
      form.resetFields();
      setSlots([]);
      setSelectedSlot(null);
      onBooked();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Failed to create appointment",
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title="New Appointment"
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        width={560}
      >
        <Spin spinning={servicesLoading}>
          <Form<AppointmentFormValues>
            layout="vertical"
            form={form}
            onFinish={handleSubmit}
            onValuesChange={(changedValues) => {
              if ("serviceId" in changedValues || "appointmentDate" in changedValues) {
                form.setFieldValue("appointmentTime", undefined);
                loadAvailability();
              }
            }}
            autoComplete="off"
          >
            <Form.Item
              name="serviceId"
              label="Service"
              rules={[
                {
                  required: true,
                  message: "Please select a service",
                },
              ]}
            >
              <Select
                placeholder="Select a service"
                options={services.map((service) => ({
                  value: service.id,
                  label: `${service.name} - ${service.durationMinutes} mins`,
                }))}
              />
            </Form.Item>

            <Form.Item
              name="appointmentDate"
              label="Appointment Date"
              rules={[
                {
                  required: true,
                  message: "Please select an appointment date",
                },
              ]}
            >
              <DatePicker
                style={{ width: "100%" }}
                disabled={!form.getFieldValue("serviceId")}
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
              label="Available Time Slots"
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
                <div style={{ color: "#8c8c8c" }}>
                  No appointments available for the selected service and date.
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {slots.map((slot) => (
                    <Button
                      key={slot}
                      type={selectedSlot === slot ? "primary" : "default"}
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
                <Button onClick={onClose}>Cancel</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={confirmLoading}
                  disabled={!slots.length}
                >
                  Book Appointment
                </Button>
              </div>
            </Form.Item>
          </Form>
        </Spin>
      </Modal>
    </>
  );
}
