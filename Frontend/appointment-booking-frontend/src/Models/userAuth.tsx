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
  confirmPasswordReset,
  login,
  register,
  requestPasswordReset,
  toAuthSession,
  type AuthSession,
  type RegisterPayload,
  verifyPasswordResetCode,
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
  onSessionLogout?: () => void;
  onAuthSuccess: (session: AuthSession) => void;
}

type FieldType = {
  firstName?: string;
  lastName?: string;
  mobile?: string;
  suburb?: string;
  email?: string;
  password?: string;
  code?: string;
  confirmPassword?: string;
  remember?: boolean;
};

type AuthMode = "login" | "register" | "forgot-password";
type PasswordResetStep = "request" | "verify" | "confirm";
type AuthAlertState = {
  type: "error" | "success" | "warning";
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

function getLoginErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError && error.statusCode === 401) {
    logDevelopmentError("Login", error);
    return "Invalid email or password.";
  }

  return getGenericErrorMessage("Login", error);
}

export default function UserAuthModal({
  open,
  sessionExpired = false,
  onClose,
  onExtendSession,
  onSessionLogout,
  onAuthSuccess,
}: UserAuthModalProps) {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [extendLoading, setExtendLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [passwordResetStep, setPasswordResetStep] =
    useState<PasswordResetStep>("request");
  const [authAlert, setAuthAlert] = useState<AuthAlertState | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [loginForm] = Form.useForm<FieldType>();
  const [registerForm] = Form.useForm<FieldType>();
  const [passwordResetForm] = Form.useForm<FieldType>();
  const isLoginMode = authMode === "login";
  const isForgotPasswordMode = authMode === "forgot-password";

  useEffect(() => {
    if (open) {
      setAuthMode("login");
      setPasswordResetStep("request");
      setAuthAlert(null);
      loginForm.resetFields();
      registerForm.resetFields();
      passwordResetForm.resetFields();
    }
  }, [open, loginForm, passwordResetForm, registerForm]);

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

  const handleSessionLogout = () => {
    if (!onSessionLogout) {
      return;
    }

    setLogoutLoading(true);
    onSessionLogout();
    setLogoutLoading(false);
  };

  const moveExistingAccountToLogin = (email: string) => {
    setAuthMode("login");
    setPasswordResetStep("request");
    setAuthAlert({
      type: "error",
      message: "Account already exists",
      description: "Account already exists for this email. Please log in.",
    });
    loginForm.resetFields(["password"]);
    loginForm.setFieldsValue({ email, password: "", remember: false });
    registerForm.resetFields(["password"]);
  };

  const moveToLogin = (email?: string) => {
    setAuthMode("login");
    setPasswordResetStep("request");
    setAuthAlert(null);
    loginForm.resetFields(["password"]);
    loginForm.setFieldsValue({ email, password: "", remember: false });
  };

  const moveToForgotPassword = () => {
    const loginEmail = loginForm.getFieldValue("email");

    setAuthMode("forgot-password");
    setPasswordResetStep("request");
    setAuthAlert(null);
    passwordResetForm.resetFields();

    if (typeof loginEmail === "string" && loginEmail.trim()) {
      passwordResetForm.setFieldsValue({ email: loginEmail.trim() });
    }
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
      messageApi.error(getLoginErrorMessage(error));
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

  const handleRequestPasswordReset = async (values: FieldType) => {
    if (!values.email) {
      return;
    }

    setConfirmLoading(true);
    setAuthAlert(null);

    try {
      await requestPasswordReset({ email: values.email });
      passwordResetForm.setFieldsValue({
        email: values.email,
        code: "",
        password: "",
        confirmPassword: "",
      });
      setPasswordResetStep("verify");
      setAuthAlert({
        type: "success",
        message: "Check your email",
        description:
          "If an account exists for this email, a reset code has been sent.",
      });
    } catch (error) {
      messageApi.error(getGenericErrorMessage("Request password reset", error));
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleVerifyPasswordResetCode = async (values: FieldType) => {
    if (!values.email || !values.code) {
      return;
    }

    setConfirmLoading(true);
    setAuthAlert(null);

    try {
      await verifyPasswordResetCode({
        email: values.email,
        code: values.code,
      });
      setPasswordResetStep("confirm");
      setAuthAlert({
        type: "success",
        message: "Code verified",
        description: "Create a new password to complete the reset.",
      });
    } catch (error) {
      logDevelopmentError("Verify password reset code", error);
      setAuthAlert({
        type: "error",
        message: "Code could not be verified",
        description: "Please check the code or request a new one.",
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleConfirmPasswordReset = async (values: FieldType) => {
    if (!values.email || !values.code || !values.password) {
      return;
    }

    setConfirmLoading(true);
    setAuthAlert(null);

    try {
      await confirmPasswordReset({
        email: values.email,
        code: values.code,
        password: values.password,
      });
      messageApi.success("Password updated. Please log in.");
      moveToLogin(values.email);
      passwordResetForm.resetFields();
    } catch (error) {
      logDevelopmentError("Confirm password reset", error);
      setAuthAlert({
        type: "error",
        message: "Password could not be reset",
        description: "Please request a new code and try again.",
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  const handlePasswordReset = (values: FieldType) => {
    if (passwordResetStep === "request") {
      void handleRequestPasswordReset(values);
      return;
    }

    if (passwordResetStep === "verify") {
      void handleVerifyPasswordResetCode(values);
      return;
    }

    void handleConfirmPasswordReset(values);
  };

  const getModalTitle = () => {
    if (sessionExpired) {
      return "Session expired";
    }

    if (isForgotPasswordMode) {
      return "Reset password";
    }

    return isLoginMode ? "Log in" : "Create account";
  };

  const getModalSubtitle = () => {
    if (sessionExpired) {
      return "Do you want to extend your session or logout?";
    }

    if (!isForgotPasswordMode) {
      return isLoginMode
        ? "Enter your details to continue."
        : "Create your account to start booking appointments.";
    }

    if (passwordResetStep === "request") {
      return "Enter your account email to receive a reset code.";
    }

    if (passwordResetStep === "verify") {
      return "Enter the code sent to your email.";
    }

    return "Create a new password for your account.";
  };

  const renderPasswordResetActionLabel = () => {
    if (passwordResetStep === "request") {
      return "Send reset code";
    }

    if (passwordResetStep === "verify") {
      return "Verify code";
    }

    return "Update password";
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
              {getModalTitle()}
            </Typography.Title>
            <Typography.Text type="secondary">
              {getModalSubtitle()}
            </Typography.Text>
          </div>

          {sessionExpired ? (
            <>
              <Alert
                type="warning"
                showIcon
                message="Session inactive"
                description="Your session was paused because there has been no recent activity."
                style={{ marginBottom: 20 }}
              />

              {authAlert ? (
                <Alert
                  type={authAlert.type}
                  showIcon
                  message={authAlert.message}
                  description={authAlert.description}
                  style={{ marginBottom: 20 }}
                />
              ) : null}

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  justifyContent: "center",
                  marginTop: 24,
                }}
              >
                <Button
                  type="primary"
                  size="large"
                  loading={extendLoading}
                  onClick={handleExtendSession}
                >
                  Extend session
                </Button>
                <Button
                  size="large"
                  danger
                  loading={logoutLoading}
                  onClick={handleSessionLogout}
                >
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <>
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

              {isForgotPasswordMode ? (
            <Form
              name="Password Reset Form"
              form={passwordResetForm}
              layout="vertical"
              onFinish={handlePasswordReset}
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
                <Input
                  autoComplete="email"
                  disabled={passwordResetStep !== "request"}
                />
              </Form.Item>

              {passwordResetStep !== "request" ? (
                <Form.Item<FieldType>
                  label="Verification code"
                  name="code"
                  rules={[
                    {
                      required: true,
                      message: "Please input your verification code!",
                    },
                    {
                      len: 6,
                      message: "Verification code must be 6 digits.",
                    },
                    {
                      pattern: /^\d{6}$/,
                      message: "Verification code must be 6 digits.",
                    },
                  ]}
                >
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    disabled={passwordResetStep === "confirm"}
                  />
                </Form.Item>
              ) : null}

              {passwordResetStep === "confirm" ? (
                <>
                  <Form.Item<FieldType>
                    label="New password"
                    name="password"
                    rules={[
                      {
                        required: true,
                        message: "Please input your new password!",
                      },
                      {
                        min: 6,
                        message:
                          "Password must be at least 6 characters long!",
                      },
                    ]}
                  >
                    <Input.Password autoComplete="new-password" />
                  </Form.Item>

                  <Form.Item<FieldType>
                    label="Confirm password"
                    name="confirmPassword"
                    dependencies={["password"]}
                    rules={[
                      {
                        required: true,
                        message: "Please confirm your new password!",
                      },
                      ({ getFieldValue }) => ({
                        validator(_, value?: string) {
                          if (!value || getFieldValue("password") === value) {
                            return Promise.resolve();
                          }

                          return Promise.reject(
                            new Error("Passwords do not match."),
                          );
                        },
                      }),
                    ]}
                  >
                    <Input.Password autoComplete="new-password" />
                  </Form.Item>
                </>
              ) : null}

              <Button
                type="primary"
                htmlType="submit"
                loading={confirmLoading}
                block
              >
                {renderPasswordResetActionLabel()}
              </Button>

              {passwordResetStep !== "request" ? (
                <Button
                  type="link"
                  block
                  disabled={confirmLoading}
                  onClick={() => {
                    const email = passwordResetForm.getFieldValue("email");

                    void handleRequestPasswordReset({ email });
                  }}
                  style={{ marginTop: 8 }}
                >
                  Send a new code
                </Button>
              ) : null}
            </Form>
              ) : isLoginMode ? (
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

              <div
                style={{
                  textAlign: "right",
                  marginTop: -12,
                  marginBottom: 16,
                }}
              >
                <Typography.Link onClick={moveToForgotPassword}>
                  Forgot password?
                </Typography.Link>
              </div>

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
            {isForgotPasswordMode ? (
              <>
                <Typography.Text type="secondary">
                  Remembered your password?
                </Typography.Text>
                <Typography.Link
                  onClick={() => moveToLogin(passwordResetForm.getFieldValue("email"))}
                  style={{ marginLeft: 6 }}
                >
                  Log in
                </Typography.Link>
              </>
            ) : (
              <>
                <Typography.Text type="secondary">
                  {isLoginMode
                    ? "Don't have an account?"
                    : "Already have an account?"}
                </Typography.Text>
                <Typography.Link
                  onClick={() => {
                    setAuthAlert(null);
                    setPasswordResetStep("request");
                    setAuthMode(isLoginMode ? "register" : "login");
                  }}
                  style={{ marginLeft: 6 }}
                >
                  {isLoginMode ? "Sign up" : "Log in"}
                </Typography.Link>
              </>
            )}
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
