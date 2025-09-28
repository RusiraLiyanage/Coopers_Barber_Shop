// src/components/HeaderNav.tsx
import { Layout, Menu, Dropdown, Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useState } from "react";
import UserAuthModal from "../Models/userAuth";
import MakeAppointmentModal from "../Models/makeAppointment";
const { Header } = Layout;

export default function HeaderNav() {
  const [authModalOpen, setAuthModalOpen] = useState(false); // 👈 state for modal
  const [createAppointmentModalOpen, setCreateAppointmentModalOpen] =
    useState(false); // 👈 state for modal
  const [isAuthenticated] = useState(true); // toggle manually for now
  const [selectedKey, setSelectedKey] = useState<string | undefined>(undefined);

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === "login_register") {
      setAuthModalOpen(true); // 👈 open modal
    } else if (e.key === "logout") {
      console.log("Logout clicked");
      // TODO: hook up logout logic
    }
  };

  const handleNavClick = (e: { key: string }) => {
    setSelectedKey(e.key);
    if (e.key === "create") {
      if (!isAuthenticated) {
        setAuthModalOpen(true); // show login modal instead of navigating
      } else {
        setCreateAppointmentModalOpen(true);
        // TODO: use navigate("/user-id/make-an-appointment")
      }
    } else if (e.key === "appointments") {
      console.log("Navigate to /user-id/my-appointments");
      // TODO: use navigate("/user-id/my-appointments")
    }
  };

  // clear highlight when modals close
  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setSelectedKey(undefined);
  };

  const closeAppointmentModal = () => {
    setCreateAppointmentModalOpen(false);
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
    { key: "create", label: "Create Appointment" },
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
          height: 64, // 👈 consistent with AntD default
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
          selectedKeys={selectedKey ? [selectedKey] : []} // 👈 when undefined → []
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

      <UserAuthModal open={authModalOpen} onClose={() => closeAuthModal()} />

      <MakeAppointmentModal
        open={createAppointmentModalOpen}
        onClose={() => closeAppointmentModal()}
      />
    </>
  );
}
