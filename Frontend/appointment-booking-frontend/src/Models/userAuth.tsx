import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import {
  ApiRequestError,
  login,
  register,
  toAuthSession,
  type AuthSession,
  type RegisterPayload,
} from "../lib/api";
import {
  getGenericErrorMessage,
  getRawErrorMessage,
  logDevelopmentError,
} from "../lib/errors";

interface UserAuthModalProps {
  open: boolean;
  sessionExpired?: boolean;
  onClose: () => void;
  onExtendSession?: () => Promise<void>;
  onAuthSuccess: (session: AuthSession) => void;
}

type FieldType = {
  firstName?: string;
  lastName?: string;
  mobile?: string;
  suburb?: string;
  email?: string;
  password?: string;
  remember?: boolean;
};

type AuthMode = "login" | "register";
type AuthAlertState = {
  type: "error" | "warning";
  message: string;
  description: string;
};

const AU_MOBILE_PATTERN = /^(?:\+?61|0)4\d{8}$/;

function normalizeMobileNumber(mobile: string) {
  return mobile.replace(/[\s-]/g, "");
}

function isExistingAccountError(error: unknown, messageText: string) {
  const normalizedMessage = messageText.toLowerCase();

  return (
    (error instanceof ApiRequestError && error.statusCode === 409) ||
    normalizedMessage.includes("email already in use") ||
    normalizedMessage.includes("already registered")
  );
}

export default function UserAuthModal({
  open,
  sessionExpired = false,
  onClose,
  onExtendSession,
  onAuthSuccess,
}: UserAuthModalProps) {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [extendLoading, setExtendLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authAlert, setAuthAlert] = useState<AuthAlertState | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [loginForm] = Form.useForm<FieldType>();
  const [registerForm] = Form.useForm<FieldType>();
  const isLoginMode = authMode === "login";

  useEffect(() => {
    if (open) {
      setAuthMode("login");
      setAuthAlert(null);
      loginForm.resetFields();
      registerForm.resetFields();
    }
  }, [open, loginForm, registerForm]);

  const handleExtendSession = async () => {
    if (!onExtendSession) {
      return;
    }

    setExtendLoading(true);
    setAuthAlert(null);

    try {
      await onExtendSession();
      messageApi.success("Session extended");
    } catch (error) {
      logDevelopmentError("Extend session", error);
      setAuthAlert({
        type: "error",
        message: "Session could not be extended",
        description: "Please log in again.",
      });
    } finally {
      setExtendLoading(false);
    }
  };

  const moveExistingAccountToLogin = (email: string) => {
    setAuthMode("login");
    setAuthAlert({
      type: "error",
      message: "Account already exists",
      description: "Account already exists for this email. Please log in.",
    });
    loginForm.resetFields(["password"]);
    loginForm.setFieldsValue({ email, password: "", remember: false });
    registerForm.resetFields(["password"]);
  };

  const handleLogin = async (values: FieldType) => {
    if (!values.email || !values.password) {
      return;
    }

    setConfirmLoading(true);
    setAuthAlert(null);

    try {
      const response = await login(
        values.email,
        values.password,
        values.remember === true,
      );
      messageApi.success({
        content: "Successful Login!",
        style: {
          outlineColor: "#E6F7FF",
          color: "#0050b3",
          borderRadius: 8,
          paddingBottom: 5,
        },
      });
      onAuthSuccess(toAuthSession(response));
    } catch (error) {
      messageApi.error(getGenericErrorMessage("Login", error));
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleRegister = async (values: FieldType) => {
    const { firstName, lastName, mobile, suburb, email, password } = values;

    if (!firstName || !lastName || !mobile || !suburb || !email || !password) {
      return;
    }

    const normalizedMobile = normalizeMobileNumber(mobile);

    setConfirmLoading(true);
    setAuthAlert(null);

    try {
      const response = await register({
        firstName,
        lastName,
        mobile: normalizedMobile,
        suburb,
        email,
        password,
        remember: values.remember === true,
      } satisfies RegisterPayload);
      messageApi.success("Successfully Registered!");
      onAuthSuccess(toAuthSession(response));
    } catch (error) {
      const errorMessage = getRawErrorMessage(error, "Registration failed");

      if (isExistingAccountError(error, errorMessage)) {
        moveExistingAccountToLogin(email);
        return;
      }

      messageApi.error(getGenericErrorMessage("Register", error));
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
        onCancel={sessionExpired ? undefined : onClose}
        closable={!sessionExpired}
        maskClosable={!sessionExpired}
        keyboard={!sessionExpired}
        style={{ top: 72 }}
        footer={null}
        width={560}
        styles={{
          body: {
            maxHeight: "72vh",
            overflowY: "auto",
          },
        }}
      >
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <Typography.Title level={2} style={{ marginBottom: 4 }}>
              {isLoginMode ? "Log in" : "Create account"}
            </Typography.Title>
            <Typography.Text type="secondary">
              {isLoginMode
                ? "Enter your details to continue."
                : "Create your account to start booking appointments."}
            </Typography.Text>
          </div>

          {sessionExpired ? (
            <Alert
              type="warning"
              showIcon
              message="Session expired"
              description="Your session has expired due to inactivity. Do you want to extend it?"
              action={
                <Button
                  size="small"
                  type="primary"
                  loading={extendLoading}
                  onClick={handleExtendSession}
                >
                  Extend session
                </Button>
              }
              style={{ marginBottom: 20 }}
            />
          ) : null}

          {authAlert ? (
            <Alert
              type={authAlert.type}
              showIcon
              closable
              message={authAlert.message}
              description={authAlert.description}
              onClose={() => setAuthAlert(null)}
              style={{ marginBottom: 20 }}
            />
          ) : null}

          {isLoginMode ? (
            <Form
              name="Login Form"
              form={loginForm}
              layout="vertical"
              initialValues={{ remember: false }}
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
                <Input autoComplete="email" />
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
                <Input.Password autoComplete="current-password" />
              </Form.Item>

              <Form.Item<FieldType> name="remember" valuePropName="checked">
                <Checkbox>Remember me</Checkbox>
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={confirmLoading}
                block
              >
                Log in
              </Button>
            </Form>
          ) : (
            <Form
              name="Register Form"
              form={registerForm}
              layout="vertical"
              initialValues={{ remember: false }}
              onFinish={handleRegister}
              autoComplete="off"
            >
              <Form.Item<FieldType>
                label="First Name"
                name="firstName"
                rules={[
                  {
                    required: true,
                    message: "Please input your first name!",
                  },
                ]}
              >
                <Input autoComplete="given-name" />
              </Form.Item>

              <Form.Item<FieldType>
                label="Last Name"
                name="lastName"
                rules={[
                  {
                    required: true,
                    message: "Please input your last name!",
                  },
                ]}
              >
                <Input autoComplete="family-name" />
              </Form.Item>

              <Form.Item<FieldType>
                label="Mobile"
                name="mobile"
                rules={[
                  {
                    required: true,
                    message: "Please input your mobile number!",
                  },
                  {
                    validator: (_, value?: string) => {
                      if (!value) {
                        return Promise.resolve();
                      }

                      return AU_MOBILE_PATTERN.test(
                        normalizeMobileNumber(value),
                      )
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error(
                              "Please input a valid Australian mobile number.",
                            ),
                          );
                    },
                  },
                ]}
              >
                <Input autoComplete="tel" />
              </Form.Item>

              <Form.Item<FieldType>
                label="Suburb"
                name="suburb"
                rules={[
                  {
                    required: true,
                    message: "Please input your suburb!",
                  },
                ]}
              >
                <Input autoComplete="address-level2" />
              </Form.Item>

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
                <Input autoComplete="email" />
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
                    message: "Password must be at least 6 characters long!",
                  },
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>

              <Form.Item<FieldType> name="remember" valuePropName="checked">
                <Checkbox>Remember me</Checkbox>
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                loading={confirmLoading}
                block
              >
                Sign up
              </Button>
            </Form>
          )}

          <div style={{ textAlign: "center", marginTop: 20 }}>
            <Typography.Text type="secondary">
              {isLoginMode
                ? "Don't have an account?"
                : "Already have an account?"}
            </Typography.Text>
            <Typography.Link
              onClick={() => {
                setAuthAlert(null);
                setAuthMode(isLoginMode ? "register" : "login");
              }}
              style={{ marginLeft: 6 }}
            >
              {isLoginMode ? "Sign up" : "Log in"}
            </Typography.Link>
          </div>
        </div>
      </Modal>
    </>
  );
}
