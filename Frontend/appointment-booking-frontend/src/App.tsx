// src/App.tsx
import { useState } from "react";
import { Layout } from "antd";
import HeaderNav from "./components/HeaderNav";
import Home from "./pages/HomePage";

const { Content, Footer } = Layout;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [openAppointmentModal, setOpenAppointmentModal] = useState(false);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <HeaderNav
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        openAuthModal={openAuthModal}
        setOpenAuthModal={setOpenAuthModal}
        openAppointmentModal={openAppointmentModal}
        setOpenAppointmentModal={setOpenAppointmentModal}
      />

      <Content>
        <Home
          onMakeAppointment={() => {
            if (isAuthenticated) setOpenAppointmentModal(true);
            else setOpenAuthModal(true);
          }}
        />
      </Content>

      <Footer style={{ textAlign: "center" }}>
        ©2025 Cooper's Barber Shop | All Rights Reserved
      </Footer>
    </Layout>
  );
}

export default App;
