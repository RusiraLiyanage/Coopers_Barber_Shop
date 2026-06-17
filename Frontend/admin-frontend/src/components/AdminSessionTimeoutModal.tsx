import { Alert, Button, Modal, Space } from 'antd';
import { SAModalHeader } from './common';
import './AdminSessionTimeoutModal.css';

export type AdminSessionTimeoutState = 'none' | 'extend_prompt';

type AdminSessionTimeoutModalProps = {
  open: boolean;
  extendLoading: boolean;
  logoutLoading: boolean;
  onExtend: () => Promise<void>;
  onLogout: () => Promise<void>;
};

export default function AdminSessionTimeoutModal({
  open,
  extendLoading,
  logoutLoading,
  onExtend,
  onLogout,
}: AdminSessionTimeoutModalProps) {
  return (
    <Modal
      title=""
      open={open}
      footer={null}
      closable={false}
      maskClosable={false}
      keyboard={false}
      centered
      width={520}
    >
      <div className="auth-modal-content">
        <SAModalHeader
          title="Session expired"
          subtitle="Do you want to extend your session or logout?"
          level={2}
          centered
          className="auth-modal-header"
        />

        <Alert
          type="warning"
          showIcon
          message="Session inactive"
          description="Your session was paused because there has been no recent activity."
          className="auth-modal-alert"
        />

        <div className="auth-session-actions">
          <Space>
            <Button
              type="primary"
              size="large"
              loading={extendLoading}
              onClick={() => {
                void onExtend();
              }}
            >
              Extend session
            </Button>
            <Button
              size="large"
              danger
              loading={logoutLoading}
              onClick={() => {
                void onLogout();
              }}
            >
              Logout
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  );
}
