import { Avatar, Button, Menu } from 'antd';
import { Header } from 'antd/es/layout/layout';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import './AdminHeader.css';

interface AdminHeaderProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

export default function AdminHeader({
  isAuthenticated,
  onLogout,
}: AdminHeaderProps) {
  return (
    <Header className="admin-header">
      <div className="admin-header-brand">Cooper's Admin</div>
      <Menu
        mode="horizontal"
        selectedKeys={['dashboard']}
        items={[{ key: 'dashboard', label: 'AI Operations' }]}
        className="admin-header-menu"
      />
      <div className="admin-header-actions">
        {isAuthenticated ? (
          <Button icon={<LogoutOutlined />} onClick={onLogout}>
            Logout
          </Button>
        ) : null}
        <Avatar size="large" icon={<UserOutlined />} />
      </div>
    </Header>
  );
}
