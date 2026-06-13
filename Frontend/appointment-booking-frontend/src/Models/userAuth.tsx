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
import { SAModalHeader } from "../components/common";
import "./userAuth.css";

interface UserAuthModalProps {
  open: boolean;
  sessionTimeoutState?: "none" | "extend_prompt" | "logged_out";
  onClose: () => void;
  onExtendSession?: () => Promise<void>;
  onSessionLogout?: () => Promise<void>;
  onSessionTimeoutAcknowledged?: () => void;
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
  sessionTimeoutState = "none",
  onClose,
  onExtendSession,
  onSessionLogout,
  onSessionTimeoutAcknowledged,
  onAuthSuccess,
}: UserAuthModalProps) {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [extendLoading, setExtendLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [sessionExtendFailed, setSessionExtendFailed] = useState(false);
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
  const isSessionTimeoutMode = sessionTimeoutState !== "none";
  const isExtendPrompt = sessionTimeoutState === "extend_prompt";
  const isLoggedOutAfterTimeout = sessionTimeoutState === "logged_out";
  const shouldShowSessionExtendFailure =
    isSessionTimeoutMode && sessionExtendFailed && authAlert !== null;

  useEffect(() => {
    if (open) {
      setAuthMode("login");
      setPasswordResetStep("request");
      setSessionExtendFailed(false);
      setAuthAlert(null);
      loginForm.resetFields();
      registerForm.resetFields();
      passwordResetForm.resetFields();
    }
  }, [open, loginForm, passwordResetForm, registerForm]);

  useEffect(() => {
    if (sessionTimeoutState !== "extend_prompt") {
      setSessionExtendFailed(false);
    }
  }, [sessionTimeoutState]);

  const handleExtendSession = async () => {
    if (!onExtendSession) {
      return;
    }

    setExtendLoading(true);
    setSessionExtendFailed(false);
    setAuthAlert(null);

    try {
      await onExtendSession();
      messageApi.success("Session extended");
    } catch (error) {
      logDevelopmentError("Extend session", error);
      setSessionExtendFailed(true);
      setAuthAlert({
        type: "error",
        message: "Session could not be extended",
        description: "Please log in again.",
      });
    } finally {
      setExtendLoading(false);
    }
  };

  const handleSessionLogout = async () => {
    if (!onSessionLogout) {
      return;
    }

    setLogoutLoading(true);
    setSessionExtendFailed(false);
    setAuthAlert(null);

    try {
      await onSessionLogout();
    } catch (error) {
      logDevelopmentError("Session logout", error);
      setAuthAlert({
        type: "error",
        message: "Logout failed",
        description: "Please try again.",
      });
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleSessionTimeoutAcknowledged = () => {
    if (!onSessionTimeoutAcknowledged) {
      return;
    }

    setSessionExtendFailed(false);
    setAuthAlert(null);
    onSessionTimeoutAcknowledged();
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
    if (shouldShowSessionExtendFailure) {
      return "";
    }

    if (isSessionTimeoutMode) {
      return "Session expired";
    }

    if (isForgotPasswordMode) {
      return "Reset password";
    }

    return isLoginMode ? "Log in" : "Create account";
  };

  const getModalSubtitle = () => {
    if (shouldShowSessionExtendFailure) {
      return "";
    }

    if (isExtendPrompt) {
      return "Do you want to extend your session or logout?";
    }

    if (isLoggedOutAfterTimeout) {
      return "Please log in again to continue.";
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
        onCancel={isSessionTimeoutMode ? undefined : onClose}
        closable={!isSessionTimeoutMode}
        maskClosable={!isSessionTimeoutMode}
        keyboard={!isSessionTimeoutMode}
        centered={isSessionTimeoutMode}
        style={isSessionTimeoutMode ? undefined : { top: 72 }}
        footer={null}
        width={560}
        styles={{
          body: {
            maxHeight: "72vh",
            overflowY: "auto",
          },
        }}
      >
        <div className="auth-modal-content">
          {shouldShowSessionExtendFailure ? null : (
            <SAModalHeader
              title={getModalTitle()}
              subtitle={getModalSubtitle()}
              level={2}
              centered
              className="auth-modal-header"
            />
          )}

          {isSessionTimeoutMode ? (
            shouldShowSessionExtendFailure ? (
              <>
                <Alert
                  type={authAlert.type}
                  showIcon
                  message={authAlert.message}
                  description={authAlert.description}
                  className="auth-modal-alert"
                />

                <div className="auth-session-actions">
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleSessionTimeoutAcknowledged}
                  >
                    OK
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Alert
                  type={isLoggedOutAfterTimeout ? "error" : "warning"}
                  showIcon
                  message={
                    isLoggedOutAfterTimeout
                      ? "Session expired"
                      : "Session inactive"
                  }
                  description={
                    isLoggedOutAfterTimeout
                      ? "Your session has ended. Please log in again."
                      : "Your session was paused because there has been no recent activity."
                  }
                  className="auth-modal-alert"
                />

                {authAlert ? (
                  <Alert
                    type={authAlert.type}
                    showIcon
                    message={authAlert.message}
                    description={authAlert.description}
                    className="auth-modal-alert"
                  />
                ) : null}

                <div className="auth-session-actions">
                  {isExtendPrompt ? (
                    <>
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
                        onClick={() => {
                          void handleSessionLogout();
                        }}
                      >
                        Logout
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="primary"
                      size="large"
                      onClick={handleSessionTimeoutAcknowledged}
                    >
                      OK
                    </Button>
                  )}
                </div>
              </>
            )
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
                  className="auth-modal-alert"
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
                  className="auth-resend-code-action"
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

              <div className="auth-forgot-password-action">
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

              <div className="auth-secondary-action">
            {isForgotPasswordMode ? (
              <>
                <Typography.Text type="secondary">
                  Remembered your password?
                </Typography.Text>
                <Typography.Link
                  onClick={() => moveToLogin(passwordResetForm.getFieldValue("email"))}
                  className="auth-secondary-action-link"
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
                  className="auth-secondary-action-link"
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
