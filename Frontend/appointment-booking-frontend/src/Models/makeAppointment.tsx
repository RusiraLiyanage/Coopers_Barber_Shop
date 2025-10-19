import { Button, DatePicker, Form, Modal, Select, message } from "antd";
const { Option } = Select;
import { useEffect, useState } from "react";

interface makeAppointmentModalProps {
  open: boolean;
  onClose: () => void;
}

type FieldType = {
  appointmentType?: string;
  appointmentDate?: string;
  appointmentTime?: string;
};

const MakeAppointmentModal: React.FC<makeAppointmentModalProps> = ({
  open,
  onClose,
}) => {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  // const [messageApi, contextHolder] = message.useMessage();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onFinish = (fieldsValue: any) => {
    // Should format date value before submit.
    const appointmentType = fieldsValue["appointmentType"];
    const appointmentDate = fieldsValue["appointmentDate"];
    const appointmentTimeSlot = fieldsValue["timeSlot"];
    const values = {
      appointmentType: appointmentType,
      appointmentDate: appointmentDate.format("YYYY-MM-DD"),
      timeSlot: appointmentTimeSlot,
    };
    setConfirmLoading(true);
    setTimeout(() => {
      onClose();
      setConfirmLoading(false);
      messageApi.success("Appointment created successfully!"); // ✅ show after close
    }, 2000);
    console.log("Received values of form: ", values);
  };

  // Dummy slot data (pretend it comes from backend)
  const dummySlots = [
    { id: 1, slot: "09:00 - 09:30", available: true },
    { id: 2, slot: "09:45 - 10:15", available: true },
    { id: 3, slot: "10:30 - 11:00", available: true },
    { id: 4, slot: "11:15 - 11:45", available: true },
  ];

  const [slots, setSlots] = useState<typeof dummySlots>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [form] = Form.useForm(); // 👈 create form instance

  useEffect(() => {
    if (open) {
      form.resetFields(); // 👈 clears values when modal opens
      setSlots([]);
      setSelectedSlot(null);
    }
  }, [open, form]);

  // Trigger slot generation when appointmentType & date selected
  const handleGenerateSlots = () => {
    setSlots(dummySlots);
    setSelectedSlot(null); // reset
  };

  return (
    <>
      {contextHolder}
      <Modal
        title=""
        open={open}
        confirmLoading={confirmLoading}
        onOk={onFinish}
        onCancel={onClose}
        style={{ top: 150 }}
        footer={[
          <Button key="cancel" onClick={onClose}>
            Cancel
          </Button>,
        ]}
        width={{
          xs: "36%", // Mobile
          sm: "36%", // Small tablets
          md: "36%", // Tablets
          lg: "36%", // Small desktop
          xl: "36%", // Large desktop
          xxl: "45%", // Extra-large screens
        }}
      >
        {/* Replace this with actual login/register forms later */}
        <center>
          <h1>New Appointment</h1>
        </center>

        <div
          style={{ display: "flex", justifyContent: "center", marginTop: 20 }}
        >
          <div style={{ textAlign: "left", paddingTop: 5 }}>
            <Form
              name="basic"
              style={{ maxWidth: 600, minWidth: 600 }}
              layout="vertical"
              form={form} // 👈 bind the form instance here
              initialValues={{ remember: true }}
              onFinish={onFinish}
              onValuesChange={(_, allValues) => {
                if (allValues.appointmentType && allValues.appointmentDate) {
                  handleGenerateSlots();
                } else {
                  setSlots([]); // reset if one is missing
                  setSelectedSlot(null);
                }
              }}
              onFinishFailed={(errorInfo) => {
                console.log("Validation Failed:", errorInfo);
                // handleOk() will NOT run here
              }}
              autoComplete="off"
            >
              <Form.Item<FieldType>
                name="appointmentType"
                label="The Appointment type"
                hasFeedback
                rules={[
                  {
                    required: true,
                    message: "Please select appointment type",
                  },
                ]}
              >
                <Select placeholder="Select appointment option" allowClear>
                  <Option value="Hair Cut">Hair Cut - 30 minutes</Option>
                  <Option value="Hair Styling">
                    Hair Styling - 45 minutes
                  </Option>
                  <Option value="Hair Coloring">
                    Hair Coloring - 90 minutes
                  </Option>
                  <Option value="Consultation">
                    Consultation - 15 minutes
                  </Option>
                  <Option value="Deep Conditioning Treatment">
                    Deep Conditioning Treatment - 60 minutes
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item<FieldType>
                name="appointmentDate"
                label="Appointment Date"
                hasFeedback
                rules={[
                  {
                    required: true,
                    message: "Please select appointment date",
                  },
                ]}
              >
                <DatePicker
                  disabled={!form.getFieldValue("appointmentType")} // 👈 disable until type selected
                />
              </Form.Item>

              <Form.Item<FieldType>
                name="appointmentTime"
                label="Available Time Slots"
                hidden={!slots.length} // hide if no slots to show
                rules={[
                  {
                    required: true,
                    message: "Please select appointment time slot",
                  },
                ]}
              >
                {/* Render slots only after type+date selected */}
                {slots.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}
                    >
                      {slots.map((slot) => (
                        <Button
                          key={slot.id}
                          disabled={!slot.available}
                          type={
                            selectedSlot === slot.slot ? "primary" : "default"
                          }
                          style={
                            selectedSlot === slot.slot
                              ? {
                                  backgroundColor: "#69b1ff",
                                  borderColor: "#69b1ff",
                                } // lighter blue
                              : {}
                          }
                          onClick={() => {
                            setSelectedSlot(slot.slot);
                            form.setFieldsValue({ appointmentTime: slot.slot }); // 👈 sync with form
                          }}
                        >
                          {slot.slot}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </Form.Item>

              <Form.Item label={null}>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "center",
                  }}
                >
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={confirmLoading}
                    disabled={!slots.length}
                  >
                    Make Appointment
                  </Button>

                  <Button
                    onClick={() => {
                      form.resetFields();
                      setSlots([]);
                      setSelectedSlot(null);
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default MakeAppointmentModal;
