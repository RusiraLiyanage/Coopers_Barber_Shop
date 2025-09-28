import { Button, DatePicker, Form, Modal, Select } from "antd";
const { Option } = Select;
import { useState } from "react";

interface makeAppointmentModalProps {
  open: boolean;
  onClose: () => void;
}

type FieldType = {
  appointmentType?: string;
  appointmentDate?: string;
  timeSlot?: string;
};

const config = {
  rules: [
    { type: "object" as const, required: true, message: "Please select time!" },
  ],
};

const MakeAppointmentModal: React.FC<makeAppointmentModalProps> = ({
  open,
  onClose,
}) => {
  const [confirmLoading, setConfirmLoading] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onFinish = (fieldsValue: any) => {
    // Should format date value before submit.
    const appointmentType = fieldsValue["appointmentType"];
    const appointmentDate = fieldsValue["appointmentDate"];
    const values = {
      appointmentType: appointmentType,
      appointmentDate: appointmentDate.format("YYYY-MM-DD"),
    };
    setConfirmLoading(true);
    setTimeout(() => {
      onClose();
      setConfirmLoading(false);
    }, 2000);
    console.log("Received values of form: ", values);
  };

  return (
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

      <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
        <div style={{ textAlign: "left", paddingTop: 5 }}>
          <Form
            name="basic"
            style={{ maxWidth: 600, minWidth: 600 }}
            layout="vertical"
            initialValues={{ remember: true }}
            onFinish={onFinish}
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
                <Option value="Hair Cut">Hair Cut</Option>
                <Option value="Hair Styling">Hair Styling</Option>
                <Option value="Hair Coloring">Hair Coloring</Option>
                <Option value="Consultation">Consultation</Option>
                <Option value="Deep Conditioning Treatment">
                  Deep Conditioning Treatment
                </Option>
              </Select>
            </Form.Item>

            <Form.Item<FieldType>
              name="appointmentDate"
              label="DatePicker"
              {...config}
            >
              <DatePicker />
            </Form.Item>

            <Form.Item label={null}>
              <Button type="primary" htmlType="submit" loading={confirmLoading}>
                Make Appointment
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </Modal>
  );
};

export default MakeAppointmentModal;
