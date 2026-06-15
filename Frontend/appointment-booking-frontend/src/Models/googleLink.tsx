import { Alert, Button, Form, Input, Modal, message } from 'antd';
import { useState } from 'react';
import {
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
  password?: string;
};

export default function GoogleLinkModal({
  open,
  email,
  onClose,
  onLinked,
}: GoogleLinkModalProps) {
  const [form] = Form.useForm<FieldType>();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleSubmit = async (values: FieldType) => {
    if (!values.password) {
      return;
    }

    setConfirmLoading(true);

    try {
      const response = await linkGoogleAccount(values.password);
      messageApi.success('Google connected to your account.');
      form.resetFields();
      onLinked(toAuthSession(response));
    } catch (error) {
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
              name="password"
              rules={[
                {
                  required: true,
                  message: 'Please input your password!',
                },
              ]}
            >
              <Input.Password autoComplete="current-password" />
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
    </>
  );
}
