import { useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Typography,
  message,
} from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  ACTIVE_ACCOUNT_SESSION_EXISTS_CODE,
  ApiRequestError,
} from '../lib/api';
import { getUserFriendlyErrorMessage } from '../lib/errors';
import { loginAdminAction } from '../store/auth/action';
import { useAppDispatch } from '../store/hooks';
import './AdminLogin.css';

type AdminLoginFormValues = {
  email: string;
  password: string;
  remember?: boolean;
};

type AdminLoginProps = {
  initialError?: string | null;
};

function getAdminLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.statusCode === 401) {
    return 'Invalid email or password.';
  }

  return getUserFriendlyErrorMessage(error);
}

export default function AdminLogin({ initialError = null }: AdminLoginProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const [error, setError] = useState<string | null>(initialError);
  const [submitting, setSubmitting] = useState(false);
  const [sessionConflictValues, setSessionConflictValues] =
    useState<AdminLoginFormValues | null>(null);

  const handleSubmit = async (
    values: AdminLoginFormValues,
    endExistingSessions = false,
  ) => {
    setSubmitting(true);
    setError(null);

    try {
      await dispatch(
        loginAdminAction({
          email: values.email,
          password: values.password,
          remember: values.remember === true,
          endExistingSessions,
        }),
      ).unwrap();
      setSessionConflictValues(null);
      navigate('/');
    } catch (loginError) {
      if (
        loginError instanceof ApiRequestError &&
        loginError.code === ACTIVE_ACCOUNT_SESSION_EXISTS_CODE
      ) {
        setSessionConflictValues(values);
        return;
      }

      const nextError = getAdminLoginErrorMessage(loginError);

      setError(nextError);
      messageApi.error(nextError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="admin-auth-page">
      {contextHolder}
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
            <Checkbox>Remember me</Checkbox>
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
      <Modal
        title="Active session found"
        open={sessionConflictValues !== null}
        okText="End previous session"
        cancelText="Keep previous session"
        confirmLoading={submitting}
        onOk={() => {
          if (sessionConflictValues) {
            void handleSubmit(sessionConflictValues, true);
          }
        }}
        onCancel={() => {
          setSessionConflictValues(null);
          setSubmitting(false);
        }}
        centered
      >
        <p>This account already has an active session.</p>
        <p>
          Continuing will end the previous session for this account before
          signing in here.
        </p>
        <p>Do you want to continue?</p>
      </Modal>
    </main>
  );
}
