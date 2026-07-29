import { useMemo, useState } from 'react';
import { Alert, Button, Form, Input, Result, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import { acceptAdminInvite } from '../lib/api';
import { getUserFriendlyErrorMessage } from '../lib/errors';
import './AdminLogin.css';

type AcceptInviteFormValues = {
  firstName?: string;
  lastName?: string;
  mobile?: string;
  suburb?: string;
  password: string;
  confirmPassword: string;
};

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams]);
  const [error, setError] = useState<string | null>(null);
  const [acceptedEmail, setAcceptedEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: AcceptInviteFormValues) => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await acceptAdminInvite({
        token,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        mobile: values.mobile,
        suburb: values.suburb,
      });

      setAcceptedEmail(response.email);
    } catch (inviteError) {
      setError(getUserFriendlyErrorMessage(inviteError));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <main className="admin-auth-page">
        <Result
          status="warning"
          title="Invite token missing"
          subTitle="Open the invite link sent by an administrator."
          extra={<Link to="/login">Back to login</Link>}
        />
      </main>
    );
  }

  if (acceptedEmail) {
    return (
      <main className="admin-auth-page">
        <Result
          status="success"
          title="Admin account created Updated"
          subTitle={`You can now sign in as ${acceptedEmail}.`}
          extra={<Link to="/login">Go to login</Link>}
        />
      </main>
    );
  }

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card admin-auth-card-wide">
        <Typography.Title level={2}>Accept Admin Invite</Typography.Title>
        <Typography.Text type="secondary">
          Create your administrator account password.
        </Typography.Text>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        <Form<AcceptInviteFormValues>
          layout="vertical"
          className="admin-auth-form"
          onFinish={(values) => void handleSubmit(values)}
        >
          <div className="admin-auth-form-grid">
            <Form.Item name="firstName" label="First name">
              <Input prefix={<UserOutlined />} />
            </Form.Item>
            <Form.Item name="lastName" label="Last name">
              <Input prefix={<UserOutlined />} />
            </Form.Item>
          </div>
          <div className="admin-auth-form-grid">
            <Form.Item name="mobile" label="Mobile">
              <Input />
            </Form.Item>
            <Form.Item name="suburb" label="Suburb">
              <Input />
            </Form.Item>
          </div>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Password is required.' },
              { min: 8, message: 'Use at least 8 characters.' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Confirm your password.' },
              ({ getFieldValue }) => ({
                validator(_, value: string | undefined) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }

                  return Promise.reject(new Error('Passwords do not match.'));
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={submitting}
          >
            Create admin account
          </Button>
        </Form>
      </section>
    </main>
  );
}
