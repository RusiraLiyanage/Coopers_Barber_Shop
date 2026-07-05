import { Avatar, Dropdown, Menu } from 'antd';
import { Header } from 'antd/es/layout/layout';
import { UserOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import './HeaderNav.css';

interface HeaderNavProps {
  isAuthenticated: boolean;
  onLogout: () => void;
  onOpenAuthModal: () => void;
  onOpenMyAccount: () => void;
  onOpenMyAppointments: () => void;
  onOpenAppointmentModal: () => void;
}

export default function HeaderNav({
  isAuthenticated,
  onLogout,
  onOpenAuthModal,
  onOpenMyAccount,
  onOpenMyAppointments,
  onOpenAppointmentModal,
}: HeaderNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === 'login_register') onOpenAuthModal();
    else if (e.key === 'account') onOpenMyAccount();
    else if (e.key === 'logout') onLogout();
  };

  const handleNavClick = (e: { key: string }) => {
    if (e.key === 'create') {
      onOpenAppointmentModal();
    }

    if (e.key === 'appointments') {
      onOpenMyAppointments();
    }
  };

  const profileMenu = {
    items: isAuthenticated
      ? [
          { key: 'account', label: 'My Account' },
          { key: 'logout', label: 'Logout' },
        ]
      : [{ key: 'login_register', label: 'Login/Register' }],
    onClick: handleMenuClick,
  };

  const navItems = [
    ...(isAuthenticated
      ? [{ key: 'appointments', label: 'My Appointments' }]
      : []),
    { key: 'create', label: 'New Appointment' },
  ];

  return (
    <>
      <Header className="app-header">
        <div className="app-header-brand" onClick={() => navigate('/')}>
          Cooper's Barber Shop
        </div>

        <Menu
          mode="horizontal"
          items={navItems}
          onClick={handleNavClick}
          selectedKeys={
            location.pathname === '/appointments'
              ? ['appointments']
              : location.pathname === '/new-appointment'
                ? ['create']
                : []
          }
          className="app-header-menu"
        />

        <Dropdown menu={profileMenu} placement="bottomRight">
          <Avatar
            size="large"
            icon={<UserOutlined />}
            className="app-header-avatar"
          />
        </Dropdown>
      </Header>
    </>
  );
}
