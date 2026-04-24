import { Avatar, Dropdown, Menu } from "antd";
import { Header } from "antd/es/layout/layout";
import { UserOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";

interface HeaderNavProps {
  isAuthenticated: boolean;
  onLogout: () => void;
  onOpenAuthModal: () => void;
  onOpenAppointmentModal: () => void;
}

export default function HeaderNav({
  isAuthenticated,
  onLogout,
  onOpenAuthModal,
  onOpenAppointmentModal,
}: HeaderNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === "login_register") onOpenAuthModal();
    else if (e.key === "logout") onLogout();
  };

  const handleNavClick = (e: { key: string }) => {
    if (e.key === "create") {
      if (!isAuthenticated) onOpenAuthModal();
      else onOpenAppointmentModal();
    }

    if (e.key === "appointments") {
      navigate("/appointments");
    }
  };

  const profileMenu = {
    items: isAuthenticated
      ? [{ key: "logout", label: "Logout" }]
      : [{ key: "login_register", label: "Login/Register" }],
    onClick: handleMenuClick,
  };

  const navItems = [
    ...(isAuthenticated
      ? [{ key: "appointments", label: "My Appointments" }]
      : []),
    { key: "create", label: "New Appointment" },
  ];

  return (
    <>
      <Header
        style={{
          position: "fixed",
          top: 0,
          width: "100%",
          zIndex: 1000,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#fff",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          height: 64,
          paddingBottom: 10,
        }}
      >
        <div
          style={{ fontSize: "23px", fontWeight: "bold", cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
          Cooper's BarberShop
        </div>

        <Menu
          mode="horizontal"
          items={navItems}
          onClick={handleNavClick}
          selectedKeys={
            location.pathname === "/appointments" ? ["appointments"] : []
          }
          style={{
            flex: 1,
            justifyContent: "right",
            background: "transparent",
            borderBottom: "none",
            fontWeight: "bold",
          }}
        />

        <Dropdown menu={profileMenu} placement="bottomRight">
          <Avatar
            size="large"
            icon={<UserOutlined />}
            style={{ cursor: "pointer" }}
          />
        </Dropdown>
      </Header>
    </>
  );
}
