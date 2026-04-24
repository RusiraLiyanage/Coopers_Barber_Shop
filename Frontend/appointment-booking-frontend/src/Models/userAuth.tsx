import { Button, Checkbox, Form, Input, Modal, Tabs, message } from "antd";
import { useEffect, useState } from "react";
import { login, register } from "../lib/api";

interface UserAuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthSuccess: (token: string) => void;
}

type FieldType = {
  email?: string;
  password?: string;
  remember?: boolean;
};

export default function UserAuthModal({
  open,
  onClose,
  onAuthSuccess,
}: UserAuthModalProps) {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [loginForm] = Form.useForm<FieldType>();
  const [registerForm] = Form.useForm<FieldType>();

  useEffect(() => {
    if (open) {
      loginForm.resetFields();
      registerForm.resetFields();
    }
  }, [open, loginForm, registerForm]);

  const handleLogin = async (values: FieldType) => {
    if (!values.email || !values.password) {
      return;
    }

    setConfirmLoading(true);

    try {
      const response = await login(values.email, values.password);
      messageApi.success({
        content: "Successful Login!",
        style: {
          outlineColor: "#E6F7FF",
          color: "#0050b3",
          borderRadius: 8,
          paddingBottom: 5,
        },
      });
      onAuthSuccess(response.access_token);
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Login failed",
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleRegister = async (values: FieldType) => {
    if (!values.email || !values.password) {
      return;
    }

    setConfirmLoading(true);

    try {
      const response = await register(values.email, values.password);
      messageApi.success("Successfully Registered!");
      onAuthSuccess(response.access_token);
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "Registration failed",
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title=""
        open={open}
        confirmLoading={confirmLoading}
        onCancel={onClose}
        style={{ top: 150 }}
        footer={[
          <Button key="cancel" onClick={onClose}>
            Cancel
          </Button>,
        ]}
        width={{
          xs: "36%",
          sm: "36%",
          md: "36%",
          lg: "36%",
          xl: "36%",
          xxl: "37%",
        }}
      >
        <center>
          <h1>Sign in or Sign up to continue</h1>
        </center>

        <div
          style={{ display: "flex", justifyContent: "center", marginTop: 20 }}
        >
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
                      name="Login Form"
                      form={loginForm}
                      labelCol={{ span: 8 }}
                      wrapperCol={{ span: 16 }}
                      style={{ maxWidth: 600 }}
                      initialValues={{ remember: true }}
                      onFinish={handleLogin}
                      autoComplete="off"
                    >
                      <Form.Item<FieldType>
                        label="Email"
                        name="email"
                        rules={[
                          {
                            required: true,
                            message: "Please input your email!",
                          },
                          {
                            type: "email",
                            message: "Please input a valid email!",
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
                      name="Register Form"
                      form={registerForm}
                      labelCol={{ span: 8 }}
                      wrapperCol={{ span: 16 }}
                      style={{ maxWidth: 600 }}
                      initialValues={{ remember: true }}
                      onFinish={handleRegister}
                      autoComplete="off"
                    >
                      <Form.Item<FieldType>
                        label="Email"
                        name="email"
                        rules={[
                          {
                            required: true,
                            message: "Please input your email!",
                          },
                          {
                            type: "email",
                            message: "Please input a valid email!",
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
                          {
                            min: 6,
                            message:
                              "Password must be at least 6 characters long!",
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
    </>
  );
}
