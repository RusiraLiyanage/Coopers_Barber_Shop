import { Alert, Button, Col, Form, Input, Modal, Row, message } from 'antd';
import { useEffect, useState } from 'react';
import {
  isSessionIdleExpiredError,
  type AccountProfile,
  type AuthSession,
  type UpdateAccountPayload,
} from '../lib/api';
import { GENERIC_ERROR_MESSAGE, logDevelopmentError } from '../lib/errors';
import {
  SALoadingPanel,
  SAModalHeader,
  SAStatusTag,
} from '../components/common';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  getAccountProfileAction,
  updateAccountProfileAction,
} from '../store/account/action';
import {
  selectAccountLoading,
  selectAccountProfile,
  selectAccountSaving,
} from '../store/account/selector';
import { clearAccountProfile } from '../store/account/slice';
import { refreshSessionAction } from '../store/auth/action';
import './MyAccount.css';

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
  return mobile.replace(/[\s-]/g, '');
}

function toFormValues(profile: AccountProfile): AccountFormValues {
  return {
    email: profile.email,
    firstName: profile.firstName ?? '',
    lastName: profile.lastName ?? '',
    mobile: profile.mobile ?? '',
    suburb: profile.suburb ?? '',
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
  const dispatch = useAppDispatch();
  const [form] = Form.useForm<AccountFormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const profile = useAppSelector(selectAccountProfile);
  const loading = useAppSelector(selectAccountLoading);
  const saving = useAppSelector(selectAccountSaving);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!authSession) {
      dispatch(clearAccountProfile());
      setError(null);
      form.resetFields();
      return;
    }

    let isMounted = true;

    setError(null);

    dispatch(getAccountProfileAction())
      .unwrap()
      .then((response) => {
        if (!isMounted) {
          return;
        }

        form.setFieldsValue(toFormValues(response));
      })
      .catch((fetchError: unknown) => {
        if (!isMounted) {
          return;
        }

        if (isSessionIdleExpiredError(fetchError)) {
          return;
        }

        logDevelopmentError('Load account profile', fetchError);
        setError(GENERIC_ERROR_MESSAGE);
      });

    return () => {
      isMounted = false;
    };
  }, [authSession, dispatch, form, open]);

  const handleSave = async (values: AccountFormValues) => {
    setError(null);

    try {
      const updatedProfile = await dispatch(
        updateAccountProfileAction(toUpdatePayload(values)),
      ).unwrap();

      await dispatch(refreshSessionAction())
        .unwrap()
        .catch(() => undefined);
      form.setFieldsValue(toFormValues(updatedProfile));
      messageApi.success('Account details updated');
    } catch (saveError) {
      if (isSessionIdleExpiredError(saveError)) {
        return;
      }

      logDevelopmentError('Update account profile', saveError);
      setError(GENERIC_ERROR_MESSAGE);
    }
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={
          <SAModalHeader
            title="My Account"
            subtitle="Review and update the profile details linked to your bookings."
          />
        }
        open={open}
        onCancel={onClose}
        footer={null}
        centered
        width={720}
        styles={{
          body: {
            maxHeight: '72vh',
            overflowY: 'auto',
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
          <SALoadingPanel />
        ) : (
          <>
            {error ? (
              <Alert
                type="error"
                message={error}
                showIcon
                className="account-error-alert"
              />
            ) : null}

            {error && !profile ? null : (
              <>
                {profile ? (
                  <div className="account-type-section">
                    <span>Account type</span>
                    <div className="account-type-tag-row">
                      <SAStatusTag color="blue">
                        {profile.role.toUpperCase()}
                      </SAStatusTag>
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
                            message: 'Please input your first name!',
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
                            message: 'Please input your last name!',
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
                            message: 'Please input your mobile number!',
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
                                      'Please input a valid Australian mobile number.',
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
                            message: 'Please input your suburb!',
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
                        message: 'Please input your email!',
                      },
                      {
                        type: 'email',
                        message: 'Please input a valid email!',
                      },
                    ]}
                  >
                    <Input autoComplete="email" />
                  </Form.Item>

                  <div className="account-form-actions">
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
