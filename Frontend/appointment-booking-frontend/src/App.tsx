import { useCallback, useState } from "react";
import { Layout } from "antd";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import HeaderNav from "./components/HeaderNav";
import Home from "./pages/HomePage";
import MyAppointments from "./pages/MyAppointments";
import UserAuthModal from "./Models/userAuth";
import MakeAppointmentModal from "./Models/makeAppointment";
import { logout, type AuthSession } from "./lib/api";

const { Content, Footer } = Layout;
const AUTH_SESSION_KEY = "booking_auth_session";
const LEGACY_AUTH_TOKEN_KEY = "booking_auth_token";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAuthSession(value: unknown): value is AuthSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as Partial<AuthSession>;

  return (
    isNonEmptyString(session.accessToken) &&
    isNonEmptyString(session.refreshToken)
  );
}

function readStoredAuthSession(): AuthSession | null {
  const storedSession = localStorage.getItem(AUTH_SESSION_KEY);

  if (storedSession) {
    try {
      const parsedSession = JSON.parse(storedSession) as unknown;

      if (isAuthSession(parsedSession)) {
        return parsedSession;
      }

      localStorage.removeItem(AUTH_SESSION_KEY);
    } catch {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }
  }

  localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);

  return null;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [authSession, setAuthSessionState] = useState<AuthSession | null>(() =>
    readStoredAuthSession(),
  );
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [openAppointmentModal, setOpenAppointmentModal] = useState(false);
  const [appointmentsRefreshKey, setAppointmentsRefreshKey] = useState(0);

  const isAuthenticated = Boolean(
    authSession?.accessToken && authSession.refreshToken,
  );

  const setAuthSession = useCallback((session: AuthSession | null) => {
    if (session) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(AUTH_SESSION_KEY);
    }

    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
    setAuthSessionState(session);
  }, []);

  const handleLogout = () => {
    const currentSession = authSession;

    setAuthSession(null);
    navigate("/");

    if (currentSession?.refreshToken) {
      void logout(currentSession).catch(() => undefined);
    }
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
          onAuthSessionRefresh={setAuthSession}
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
        onAuthSessionRefresh={setAuthSession}
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
