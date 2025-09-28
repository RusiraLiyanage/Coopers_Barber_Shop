import { Button, Checkbox, Form, Input, Modal, Tabs } from "antd";
import { useState } from "react";

interface UserAuthModalProps {
  open: boolean;
  onClose: () => void;
}

type FieldType = {
  username?: string;
  password?: string;
  remember?: string;
};

const UserAuthModal: React.FC<UserAuthModalProps> = ({ open, onClose }) => {
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleOk = () => {
    setConfirmLoading(true);
    setTimeout(() => {
      onClose();
      setConfirmLoading(false);
    }, 2000);
  };

  return (
    <Modal
      title=""
      open={open}
      confirmLoading={confirmLoading}
      onOk={handleOk}
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
        xxl: "37%", // Extra-large screens
      }}
    >
      {/* Replace this with actual login/register forms later */}
      <center>
        <h1>Sign in or Sign up to continue</h1>
      </center>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
        <Tabs
          defaultActiveKey="1"
          centered
          style={{ width: "100%", maxWidth: 400 }}
          items={[
            {
              key: "1",
              label: "Login",
              children: (
                <div style={{ textAlign: "left", paddingTop: 5 }}>
                  <Form
                    name="basic"
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                    style={{ maxWidth: 600 }}
                    initialValues={{ remember: true }}
                    onFinish={(values) => {
                      console.log("Success:", values);
                      handleOk(); // ✅ only runs if validation passes
                    }}
                    onFinishFailed={(errorInfo) => {
                      console.log("Validation Failed:", errorInfo);
                      // handleOk() will NOT run here
                    }}
                    autoComplete="off"
                  >
                    <Form.Item<FieldType>
                      label="Username"
                      name="username"
                      rules={[
                        {
                          required: true,
                          message: "Please input your username!",
                        },
                      ]}
                    >
                      <Input />
                    </Form.Item>

                    <Form.Item<FieldType>
                      label="Password"
                      name="password"
                      rules={[
                        {
                          required: true,
                          message: "Please input your password!",
                        },
                      ]}
                    >
                      <Input.Password />
                    </Form.Item>

                    <Form.Item<FieldType>
                      name="remember"
                      valuePropName="checked"
                      label={null}
                    >
                      <Checkbox>Remember me</Checkbox>
                    </Form.Item>

                    <Form.Item label={null}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={confirmLoading}
                      >
                        Login
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              ),
            },
            {
              key: "2",
              label: "Register",
              children: (
                <div style={{ textAlign: "left", paddingTop: 5 }}>
                  <Form
                    name="basic"
                    labelCol={{ span: 8 }}
                    wrapperCol={{ span: 16 }}
                    style={{ maxWidth: 600 }}
                    initialValues={{ remember: true }}
                    onFinish={(values) => {
                      console.log("Success:", values);
                      handleOk(); // ✅ only runs if validation passes
                    }}
                    onFinishFailed={(errorInfo) => {
                      console.log("Validation Failed:", errorInfo);
                      // handleOk() will NOT run here
                    }}
                    autoComplete="off"
                  >
                    <Form.Item<FieldType>
                      label="Username"
                      name="username"
                      rules={[
                        {
                          required: true,
                          message: "Please input your username!",
                        },
                      ]}
                    >
                      <Input />
                    </Form.Item>

                    <Form.Item<FieldType>
                      label="Password"
                      name="password"
                      rules={[
                        {
                          required: true,
                          message: "Please input your password!",
                        },
                      ]}
                    >
                      <Input.Password />
                    </Form.Item>

                    <Form.Item<FieldType>
                      name="remember"
                      valuePropName="checked"
                      label={null}
                    >
                      <Checkbox>Remember me</Checkbox>
                    </Form.Item>

                    <Form.Item label={null}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={confirmLoading}
                      >
                        Sign Up
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
};

export default UserAuthModal;
