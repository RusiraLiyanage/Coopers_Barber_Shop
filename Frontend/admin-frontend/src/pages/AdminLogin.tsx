import { useState } from 'react';
import { Alert, Button, Checkbox, Form, Input, Typography } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getUserFriendlyErrorMessage } from '../lib/errors';
import { loginAdminAction } from '../store/auth/action';
import { useAppDispatch } from '../store/hooks';
import './AdminLogin.css';

type AdminLoginFormValues = {
  email: string;
  password: string;
  remember?: boolean;
};

export default function AdminLogin() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: AdminLoginFormValues) => {
    setSubmitting(true);
    setError(null);

    try {
      await dispatch(
        loginAdminAction({
          email: values.email,
          password: values.password,
          remember: values.remember === true,
        }),
      ).unwrap();
      navigate('/');
    } catch (loginError) {
      setError(getUserFriendlyErrorMessage(loginError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card">
        <Typography.Title level={2}>Admin Console</Typography.Title>
        <Typography.Text type="secondary">
          Sign in with an administrator account.
        </Typography.Text>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        <Form<AdminLoginFormValues>
          layout="vertical"
          className="admin-auth-form"
          initialValues={{ remember: false }}
          onFinish={(values) => void handleSubmit(values)}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email is required.' },
              { type: 'email', message: 'Enter a valid email address.' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="admin@coopers.local" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Password is required.' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter your password"
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>Remember this device</Checkbox>
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={submitting}
          >
            Sign in
          </Button>
        </Form>
      </section>
    </main>
  );
}
