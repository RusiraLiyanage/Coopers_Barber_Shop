import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import {
  getAccountProfile,
  refreshSession,
  updateAccountProfile,
  type AccountProfile,
  type AuthSession,
  type UpdateAccountPayload,
} from "../lib/api";
import { GENERIC_ERROR_MESSAGE, logDevelopmentError } from "../lib/errors";

interface MyAccountProps {
  open: boolean;
  authSession: AuthSession | null;
  onClose: () => void;
}

type AccountFormValues = {
  email: string;
  firstName: string;
  lastName: string;
  mobile: string;
  suburb: string;
};

const AU_MOBILE_PATTERN = /^(?:\+?61|0)4\d{8}$/;

function normalizeMobileNumber(mobile: string) {
  return mobile.replace(/[\s-]/g, "");
}

function toFormValues(profile: AccountProfile): AccountFormValues {
  return {
    email: profile.email,
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    mobile: profile.mobile ?? "",
    suburb: profile.suburb ?? "",
  };
}

function toUpdatePayload(values: AccountFormValues): UpdateAccountPayload {
  return {
    email: values.email.trim(),
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    mobile: normalizeMobileNumber(values.mobile),
    suburb: values.suburb.trim(),
  };
}

export default function MyAccount({
  open,
  authSession,
  onClose,
}: MyAccountProps) {
  const [form] = Form.useForm<AccountFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!authSession) {
      setProfile(null);
      setError(null);
      form.resetFields();
      return;
    }

    let isMounted = true;

    setLoading(true);
    setError(null);

    getAccountProfile()
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setProfile(response);
        form.setFieldsValue(toFormValues(response));
      })
      .catch((fetchError: unknown) => {
        if (!isMounted) {
          return;
        }

        logDevelopmentError("Load account profile", fetchError);
        setError(GENERIC_ERROR_MESSAGE);
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [authSession, form, open]);

  const handleSave = async (values: AccountFormValues) => {
    setSaving(true);
    setError(null);

    try {
      const updatedProfile = await updateAccountProfile(toUpdatePayload(values));

      await refreshSession().catch(() => undefined);
      setProfile(updatedProfile);
      form.setFieldsValue(toFormValues(updatedProfile));
      messageApi.success("Account details updated");
    } catch (saveError) {
      logDevelopmentError("Update account profile", saveError);
      setError(GENERIC_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              My Account
            </Typography.Title>
            <Typography.Text type="secondary">
              Review and update the profile details linked to your bookings.
            </Typography.Text>
          </div>
        }
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        width={720}
        styles={{
          body: {
            maxHeight: "72vh",
            overflowY: "auto",
            paddingTop: 12,
          },
        }}
      >
        {!authSession ? (
          <Alert
            type="info"
            message="Log in to view your account"
            description="Your account details are only available after logging in."
            showIcon
          />
        ) : loading ? (
          <div
            style={{ display: "flex", justifyContent: "center", padding: 48 }}
          >
            <Spin size="large" />
          </div>
        ) : (
          <>
            {error ? (
              <Alert
                type="error"
                message={error}
                showIcon
                style={{ marginBottom: 20 }}
              />
            ) : null}

            {error && !profile ? null : (
              <>
                {profile ? (
                  <div style={{ marginBottom: 20 }}>
                    <Typography.Text type="secondary">
                      Account type
                    </Typography.Text>
                    <div style={{ marginTop: 6 }}>
                      <Tag color="blue">{profile.role.toUpperCase()}</Tag>
                    </div>
                  </div>
                ) : null}

                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSave}
                  autoComplete="on"
                >
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item<AccountFormValues>
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
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item<AccountFormValues>
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
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Form.Item<AccountFormValues>
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
                    </Col>

                    <Col xs={24} md={12}>
                      <Form.Item<AccountFormValues>
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
                    </Col>
                  </Row>

                  <Form.Item<AccountFormValues>
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

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 12,
                      marginTop: 8,
                    }}
                  >
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="primary" htmlType="submit" loading={saving}>
                      Save Changes
                    </Button>
                  </div>
                </Form>
              </>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
