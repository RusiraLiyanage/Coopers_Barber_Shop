import { useCallback, useEffect, useState } from "react";
import { Layout } from "antd";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import HeaderNav from "./components/HeaderNav";
import Home from "./pages/HomePage";
import MyAppointments from "./pages/MyAppointments";
import UserAuthModal from "./Models/userAuth";
import MakeAppointmentModal from "./Models/makeAppointment";
import { getCurrentSession, logout, toAuthSession, type AuthSession } from "./lib/api";

const { Content, Footer } = Layout;
const LEGACY_AUTH_TOKEN_KEY = "booking_auth_token";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [authSession, setAuthSessionState] = useState<AuthSession | null>(null);
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [openAppointmentModal, setOpenAppointmentModal] = useState(false);
  const [appointmentsRefreshKey, setAppointmentsRefreshKey] = useState(0);

  const isAuthenticated = Boolean(authSession?.authenticated);

  const setAuthSession = useCallback((session: AuthSession | null) => {
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
    setAuthSessionState(session);
  }, []);

  useEffect(() => {
    let isMounted = true;

    getCurrentSession()
      .then((session) => {
        if (isMounted) {
          setAuthSession(toAuthSession(session));
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuthSession(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [setAuthSession]);

  const handleLogout = () => {
    setAuthSession(null);
    navigate("/");

    void logout().catch(() => undefined);
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
        onLogout={handleLogout}
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
          authSession={authSession}
          refreshKey={appointmentsRefreshKey}
          onClose={() => navigate("/")}
          onMakeAppointment={openBookingFlow}
        />
      </Content>

      <UserAuthModal
        open={openAuthModal}
        onClose={() => setOpenAuthModal(false)}
        onAuthSuccess={(session) => {
          setAuthSession(session);
          setOpenAuthModal(false);
          setOpenAppointmentModal(true);
        }}
      />

      <MakeAppointmentModal
        open={openAppointmentModal}
        authSession={authSession}
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
