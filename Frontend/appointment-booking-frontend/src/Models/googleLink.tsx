import { Alert, Button, Form, Input, Modal, message } from 'antd';
import { useState } from 'react';
import {
  ACTIVE_ACCOUNT_SESSION_EXISTS_CODE,
  ApiRequestError,
  linkGoogleAccount,
  toAuthSession,
  type AuthSession,
} from '../lib/api';
import { getGenericErrorMessage, logDevelopmentError } from '../lib/errors';
import { SAModalHeader } from '../components/common';
import './userAuth.css';

interface GoogleLinkModalProps {
  open: boolean;
  email: string;
  onClose: () => void;
  onLinked: (session: AuthSession) => void;
}

type FieldType = {
  googleLinkPassword?: string;
};

export default function GoogleLinkModal({
  open,
  email,
  onClose,
  onLinked,
}: GoogleLinkModalProps) {
  const [form] = Form.useForm<FieldType>();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [sessionConflictPassword, setSessionConflictPassword] =
    useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const handleSubmit = async (
    values: FieldType,
    endExistingSessions = false,
  ) => {
    if (!values.googleLinkPassword) {
      return;
    }

    setConfirmLoading(true);

    try {
      const response = await linkGoogleAccount(values.googleLinkPassword, {
        endExistingSessions,
      });
      messageApi.success('Google connected to your account.');
      setSessionConflictPassword(null);
      form.resetFields();
      onLinked(toAuthSession(response));
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        error.code === ACTIVE_ACCOUNT_SESSION_EXISTS_CODE
      ) {
        setSessionConflictPassword(values.googleLinkPassword);
        return;
      }

      if (error instanceof ApiRequestError && error.statusCode === 401) {
        logDevelopmentError('Link Google', error);
        messageApi.error('Incorrect password. Please try again.');
        return;
      }

      messageApi.error(getGenericErrorMessage('Link Google', error));
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
        footer={null}
        width={460}
        style={{ top: 96 }}
      >
        <div className="auth-modal-content">
          <SAModalHeader
            title="Connect Google"
            subtitle="An account already exists for this email. Confirm your password to connect Google."
            level={2}
            centered
            className="auth-modal-header"
          />

          {email ? (
            <Alert
              type="info"
              showIcon
              message={email}
              className="auth-modal-alert"
            />
          ) : null}

          <Form
            name="Google Link Form"
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
          >
            <Form.Item<FieldType>
              label="Password"
              name="googleLinkPassword"
              rules={[
                {
                  required: true,
                  message: 'Please input your password!',
                },
              ]}
            >
              <Input.Password autoComplete="off" />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              loading={confirmLoading}
              block
            >
              Connect Google
            </Button>
          </Form>
        </div>
      </Modal>
      <Modal
        title="Active session found"
        open={sessionConflictPassword !== null}
        okText="End previous session"
        cancelButtonProps={{ style: { display: 'none' } }}
        confirmLoading={confirmLoading}
        closable={false}
        keyboard={false}
        maskClosable={false}
        onOk={() => {
          if (sessionConflictPassword) {
            void handleSubmit(
              { googleLinkPassword: sessionConflictPassword },
              true,
            );
          }
        }}
        onCancel={() => {
          setSessionConflictPassword(null);
          setConfirmLoading(false);
        }}
        centered
      >
        <p>This account already has an active session.</p>
        <p>
          Continuing will end the previous session for this account before
          signing in with Google here.
        </p>
        <p>Do you want to continue?</p>
      </Modal>
    </>
  );
}
