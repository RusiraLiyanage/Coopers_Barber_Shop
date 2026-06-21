import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Space,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd/es/form';
import { CopyOutlined } from '@ant-design/icons';

import { SACard } from '../../../components/common';
import type { AdminInviteResponse } from '../../../lib/api';
import type { InviteFormValues } from '../types';

type AdminInvitesTabProps = {
  form: FormInstance<InviteFormValues>;
  inviteSubmitting: boolean;
  inviteLink: string | null;
  createdInvite: AdminInviteResponse | null;
  onCreateInvite: () => void;
  onCopyInviteLink: () => void;
};

export function AdminInvitesTab({
  form,
  inviteSubmitting,
  inviteLink,
  createdInvite,
  onCreateInvite,
  onCopyInviteLink,
}: AdminInvitesTabProps) {
  return (
    <div className="admin-table-section">
      <Alert
        type="info"
        showIcon
        className="admin-section-guide"
        message="Why admin invites matter"
        description="Use invites to onboard trusted admins without sharing the main admin password. Invite acceptance creates an admin account that can manage AI setup data."
      />
      <div className="admin-section-toolbar">
        <Typography.Title level={4}>Invite administrators</Typography.Title>
      </div>
      <SACard bodyPadding={24}>
        <Form<InviteFormValues>
          form={form}
          layout="vertical"
          initialValues={{ expiresInDays: 7 }}
          onFinish={() => onCreateInvite()}
        >
          <div className="admin-form-grid">
            <Form.Item
              name="email"
              label="Admin email"
              rules={[
                { required: true, message: 'Email is required.' },
                { type: 'email', message: 'Enter a valid email.' },
              ]}
            >
              <Input placeholder="admin@coopers.local" />
            </Form.Item>
            <Form.Item
              name="expiresInDays"
              label="Expires in days"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} max={30} className="admin-full-width" />
            </Form.Item>
          </div>
          <Button type="primary" htmlType="submit" loading={inviteSubmitting}>
            Create invite
          </Button>
        </Form>

        {inviteLink ? (
          <Alert
            className="admin-invite-result"
            type="success"
            showIcon
            message={`Invite created for ${createdInvite?.email}`}
            description={
              <Space direction="vertical" className="admin-full-width">
                <Typography.Text copyable>{inviteLink}</Typography.Text>
                <Button icon={<CopyOutlined />} onClick={onCopyInviteLink}>
                  Copy invite link
                </Button>
              </Space>
            }
          />
        ) : null}
      </SACard>
    </div>
  );
}
