import { Avatar, Dropdown, Menu } from "antd";
import { Header } from "antd/es/layout/layout";
import { useState } from "react";
import { UserOutlined } from "@ant-design/icons";
import UserAuthModal from "../Models/userAuth";
import MakeAppointmentModal from "../Models/makeAppointment";

interface HeaderNavProps {
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  openAuthModal: boolean;
  setOpenAuthModal: (val: boolean) => void;
  openAppointmentModal: boolean;
  setOpenAppointmentModal: (val: boolean) => void;
}

export default function HeaderNav({
  isAuthenticated,
  setIsAuthenticated,
  openAuthModal,
  setOpenAuthModal,
  openAppointmentModal,
  setOpenAppointmentModal,
}: HeaderNavProps) {
  const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined);

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === "login_register") setOpenAuthModal(true);
    else if (e.key === "logout") setIsAuthenticated(false);
  };

  const handleNavClick = (e: { key: string }) => {
    setSelectedKey(e.key);
    if (e.key === "create") {
      if (!isAuthenticated) setOpenAuthModal(true);
      else setOpenAppointmentModal(true);
    }
  };

  const closeAuthModal = () => {
    setOpenAuthModal(false);
    setSelectedKey(undefined);
  };

  const closeAppointmentModal = () => {
    setOpenAppointmentModal(false);
    setSelectedKey(undefined);
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
        <div style={{ fontSize: "23px", fontWeight: "bold" }}>
          Cooper's BarberShop
        </div>

        <Menu
          mode="horizontal"
          items={navItems}
          onClick={handleNavClick}
          selectedKeys={selectedKey ? [selectedKey] : []}
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

      <UserAuthModal
        open={openAuthModal}
        onClose={closeAuthModal}
        onAuthSuccess={() => {
          closeAuthModal();
          setIsAuthenticated(true);
          setOpenAppointmentModal(true);
        }}
      />

      <MakeAppointmentModal
        open={openAppointmentModal}
        onClose={closeAppointmentModal}
      />
    </>
  );
}
