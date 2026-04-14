import { useState } from "react";
import { Layout } from "antd";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import HeaderNav from "./components/HeaderNav";
import Home from "./pages/HomePage";
import MyAppointments from "./pages/MyAppointments";
import UserAuthModal from "./Models/userAuth";
import MakeAppointmentModal from "./Models/makeAppointment";

const { Content, Footer } = Layout;
const AUTH_TOKEN_KEY = "booking_auth_token";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [authToken, setAuthTokenState] = useState<string | null>(() =>
    localStorage.getItem(AUTH_TOKEN_KEY),
  );
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [openAppointmentModal, setOpenAppointmentModal] = useState(false);
  const [appointmentsRefreshKey, setAppointmentsRefreshKey] = useState(0);

  const isAuthenticated = Boolean(authToken);

  const setAuthToken = (token: string | null) => {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }

    setAuthTokenState(token);
  };

  const openBookingFlow = () => {
    if (isAuthenticated) {
      setOpenAppointmentModal(true);
      return;
    }

    setOpenAuthModal(true);
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <HeaderNav
        isAuthenticated={isAuthenticated}
        onLogout={() => {
          setAuthToken(null);
          navigate("/");
        }}
        onOpenAuthModal={() => setOpenAuthModal(true)}
        onOpenAppointmentModal={() => setOpenAppointmentModal(true)}
      />

      <Content style={{ paddingTop: 64 }}>
        <Routes>
          <Route
            path="/"
            element={<Home onMakeAppointment={openBookingFlow} />}
          />
          <Route
            path="/appointments"
            element={<Home onMakeAppointment={openBookingFlow} />}
          />
        </Routes>

        <MyAppointments
          open={location.pathname === "/appointments"}
          authToken={authToken}
          refreshKey={appointmentsRefreshKey}
          onClose={() => navigate("/")}
          onMakeAppointment={openBookingFlow}
        />
      </Content>

      <UserAuthModal
        open={openAuthModal}
        onClose={() => setOpenAuthModal(false)}
        onAuthSuccess={(token) => {
          setAuthToken(token);
          setOpenAuthModal(false);
          setOpenAppointmentModal(true);
        }}
      />

      <MakeAppointmentModal
        open={openAppointmentModal}
        authToken={authToken}
        onClose={() => setOpenAppointmentModal(false)}
        onBooked={() => {
          setOpenAppointmentModal(false);
          setAppointmentsRefreshKey((current) => current + 1);
          navigate("/appointments");
        }}
      />

      <Footer style={{ textAlign: "center" }}>
        ©2025 Cooper's Barber Shop | All Rights Reserved
      </Footer>
    </Layout>
  );
}

export default App;
