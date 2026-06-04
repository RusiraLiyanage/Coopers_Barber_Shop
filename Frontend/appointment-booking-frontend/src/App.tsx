import { useCallback, useEffect, useRef, useState } from "react";
import { Layout } from "antd";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import HeaderNav from "./components/HeaderNav";
import Home from "./pages/HomePage";
import MyAppointments from "./pages/MyAppointments";
import MyAccount from "./pages/MyAccount";
import UserAuthModal from "./Models/userAuth";
import MakeAppointmentModal from "./Models/makeAppointment";
import {
  canRestoreClientAuthSession,
  getCurrentSession,
  logout,
  refreshSession,
  shouldClearStaleClientAuthSession,
  toAuthSession,
  type AuthSession,
} from "./lib/api";

const { Content, Footer } = Layout;
const LEGACY_AUTH_TOKEN_KEY = "booking_auth_token";
const SESSION_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const SESSION_ACTIVITY_EVENTS = [
  "click",
  "keydown",
  "mousemove",
  "scroll",
  "touchstart",
] as const;

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [authSession, setAuthSessionState] = useState<AuthSession | null>(null);
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [openAppointmentModal, setOpenAppointmentModal] = useState(false);
  const [appointmentsRefreshKey, setAppointmentsRefreshKey] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);
  const sessionLastActivityAtRef = useRef(Date.now());

  const isAuthenticated = Boolean(authSession?.authenticated);

  const setAuthSession = useCallback((session: AuthSession | null) => {
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
    setAuthSessionState(session);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!canRestoreClientAuthSession()) {
      if (shouldClearStaleClientAuthSession()) {
        void logout().catch(() => undefined);
      }

      setAuthSession(null);

      return () => {
        isMounted = false;
      };
    }

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

  useEffect(() => {
    if (!isAuthenticated || sessionExpired) {
      return;
    }

    let timeoutId: number | undefined;
    let hasExpired = false;

    const expireSession = () => {
      if (hasExpired) {
        return;
      }

      hasExpired = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      setAuthSession(null);
      setSessionExpired(true);
      setOpenAppointmentModal(false);
      navigate("/");
      setOpenAuthModal(true);
    };

    const scheduleIdleCheck = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }

      const idleForMs = Date.now() - sessionLastActivityAtRef.current;
      const remainingMs = SESSION_IDLE_TIMEOUT_MS - idleForMs;

      if (remainingMs <= 0) {
        expireSession();
        return;
      }

      timeoutId = window.setTimeout(expireSession, remainingMs);
    };

    const recordActivity = () => {
      sessionLastActivityAtRef.current = Date.now();
      scheduleIdleCheck();
    };

    const checkIdleWhenTabReturns = () => {
      scheduleIdleCheck();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkIdleWhenTabReturns();
      }
    };

    SESSION_ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    window.addEventListener("focus", checkIdleWhenTabReturns);
    window.addEventListener("pageshow", checkIdleWhenTabReturns);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    sessionLastActivityAtRef.current = Date.now();
    scheduleIdleCheck();

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      SESSION_ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      window.removeEventListener("focus", checkIdleWhenTabReturns);
      window.removeEventListener("pageshow", checkIdleWhenTabReturns);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, navigate, sessionExpired, setAuthSession]);

  const handleLogout = () => {
    setSessionExpired(false);
    setAuthSession(null);
    navigate("/");

    void logout().catch(() => undefined);
  };

  const handleExtendSession = async () => {
    const session = await refreshSession();

    sessionLastActivityAtRef.current = Date.now();
    setAuthSession(toAuthSession(session));
    setSessionExpired(false);
    setOpenAuthModal(false);
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
        onOpenMyAccount={() => navigate("/account")}
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
          <Route
            path="/account"
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

        <MyAccount
          open={location.pathname === "/account"}
          authSession={authSession}
          onClose={() => navigate("/")}
        />
      </Content>

      <UserAuthModal
        open={openAuthModal}
        sessionExpired={sessionExpired}
        onClose={() => setOpenAuthModal(false)}
        onExtendSession={handleExtendSession}
        onAuthSuccess={(session) => {
          sessionLastActivityAtRef.current = Date.now();
          setAuthSession(session);
          setSessionExpired(false);
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
