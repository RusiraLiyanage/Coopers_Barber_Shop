import { useCallback, useEffect, useRef, useState } from 'react';
import { Layout } from 'antd';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import HeaderNav from './components/HeaderNav';
import Home from './pages/HomePage';
import MyAppointments from './pages/MyAppointments';
import MyAccount from './pages/MyAccount';
import UserAuthModal from './Models/userAuth';
import MakeAppointmentModal from './Models/makeAppointment';
import {
  canRestoreClientAuthSession,
  getCurrentSession,
  logout,
  refreshSession,
  shouldClearStaleClientAuthSession,
  toAuthSession,
  type AppointmentRecord,
  type AuthSession,
} from './lib/api';

const { Content, Footer } = Layout;
const LEGACY_AUTH_TOKEN_KEY = 'booking_auth_token';
const SESSION_TIMEOUT_DEADLINE_STORAGE_KEY =
  'coopers_session_timeout_deadline_at';
const DEFAULT_SESSION_IDLE_TIMEOUT_SECONDS = 5 * 60;
const DEFAULT_SESSION_EXTENSION_GRACE_SECONDS = 5 * 60;
const SESSION_ACTIVITY_EVENTS = [
  'click',
  'keydown',
  'mousemove',
  'scroll',
  'touchstart',
] as const;

type SessionTimeoutFlowState = 'none' | 'extend_prompt' | 'logged_out';

function getPositiveEnvNumber(value: unknown, fallback: number): number {
  const parsedValue = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsedValue) && parsedValue > 0
    ? Math.floor(parsedValue)
    : fallback;
}

const SESSION_IDLE_TIMEOUT_MS =
  getPositiveEnvNumber(
    import.meta.env.VITE_SESSION_IDLE_TIMEOUT_SECONDS,
    DEFAULT_SESSION_IDLE_TIMEOUT_SECONDS,
  ) * 1000;

const SESSION_EXTENSION_GRACE_MS =
  getPositiveEnvNumber(
    import.meta.env.VITE_SESSION_EXTENSION_GRACE_SECONDS,
    DEFAULT_SESSION_EXTENSION_GRACE_SECONDS,
  ) * 1000;

function getStoredSessionTimeoutDeadline(): number | null {
  try {
    const storedValue = window.sessionStorage.getItem(
      SESSION_TIMEOUT_DEADLINE_STORAGE_KEY,
    );
    const parsedValue = Number(storedValue);

    return Number.isFinite(parsedValue) && parsedValue > 0
      ? parsedValue
      : null;
  } catch {
    return null;
  }
}

function storeSessionTimeoutDeadline(deadlineAt: number): void {
  try {
    window.sessionStorage.setItem(
      SESSION_TIMEOUT_DEADLINE_STORAGE_KEY,
      String(deadlineAt),
    );
  } catch {
    return;
  }
}

function clearSessionTimeoutDeadline(): void {
  try {
    window.sessionStorage.removeItem(SESSION_TIMEOUT_DEADLINE_STORAGE_KEY);
  } catch {
    return;
  }
}

function createSessionTimeoutDeadline(): number {
  const deadlineAt = Date.now() + SESSION_EXTENSION_GRACE_MS;

  storeSessionTimeoutDeadline(deadlineAt);

  return deadlineAt;
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [authSession, setAuthSessionState] = useState<AuthSession | null>(null);
  const [authSessionResolved, setAuthSessionResolved] = useState(false);
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [openAppointmentModal, setOpenAppointmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentRecord | null>(null);
  const [appointmentsRefreshKey, setAppointmentsRefreshKey] = useState(0);
  const [sessionTimeoutFlowState, setSessionTimeoutFlowState] =
    useState<SessionTimeoutFlowState>('none');
  const sessionLastActivityAtRef = useRef(Date.now());
  const sessionTimeoutLogoutInProgressRef = useRef(false);

  const isAuthenticated = Boolean(authSession?.authenticated);
  const isSessionTimeoutPromptOpen = sessionTimeoutFlowState !== 'none';
  const isNewAppointmentRoute = location.pathname === '/new-appointment';
  const isAppointmentModalOpen =
    openAppointmentModal || (isNewAppointmentRoute && isAuthenticated);

  const setAuthSession = useCallback((session: AuthSession | null) => {
    localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
    setAuthSessionState(session);
  }, []);

  const revokeTimedOutSession = useCallback(async () => {
    if (sessionTimeoutLogoutInProgressRef.current) {
      return;
    }

    sessionTimeoutLogoutInProgressRef.current = true;
    clearSessionTimeoutDeadline();
    setSessionTimeoutFlowState('logged_out');
    setAuthSession(null);
    setEditingAppointment(null);
    setOpenAppointmentModal(false);
    navigate('/');
    setOpenAuthModal(true);

    try {
      await logout();
    } finally {
      sessionTimeoutLogoutInProgressRef.current = false;
    }
  }, [navigate, setAuthSession]);

  useEffect(() => {
    let isMounted = true;
    const sessionTimeoutDeadline = getStoredSessionTimeoutDeadline();

    if (sessionTimeoutDeadline !== null) {
      setAuthSession(null);
      setAuthSessionResolved(true);
      setOpenAppointmentModal(false);
      setEditingAppointment(null);
      navigate('/');
      setOpenAuthModal(true);

      if (sessionTimeoutDeadline <= Date.now()) {
        void revokeTimedOutSession().catch(() => undefined);
      } else {
        setSessionTimeoutFlowState('extend_prompt');
      }

      return () => {
        isMounted = false;
      };
    }

    if (!canRestoreClientAuthSession()) {
      if (shouldClearStaleClientAuthSession()) {
        void logout().catch(() => undefined);
      }

      setAuthSession(null);
      setAuthSessionResolved(true);

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
      })
      .finally(() => {
        if (isMounted) {
          setAuthSessionResolved(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [navigate, revokeTimedOutSession, setAuthSession]);

  useEffect(() => {
    if (
      !authSessionResolved ||
      !isNewAppointmentRoute ||
      isAuthenticated ||
      isSessionTimeoutPromptOpen
    ) {
      return;
    }

    setOpenAuthModal(true);
  }, [
    authSessionResolved,
    isAuthenticated,
    isNewAppointmentRoute,
    isSessionTimeoutPromptOpen,
  ]);

  useEffect(() => {
    if (!isAuthenticated || isSessionTimeoutPromptOpen) {
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
      createSessionTimeoutDeadline();
      setAuthSession(null);
      setSessionTimeoutFlowState('extend_prompt'); // asking to extend the session
      setOpenAppointmentModal(false);
      setEditingAppointment(null);
      navigate('/');
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
      if (document.visibilityState === 'visible') {
        checkIdleWhenTabReturns();
      }
    };

    SESSION_ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    window.addEventListener('focus', checkIdleWhenTabReturns);
    window.addEventListener('pageshow', checkIdleWhenTabReturns);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    sessionLastActivityAtRef.current = Date.now();
    scheduleIdleCheck();

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      SESSION_ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      window.removeEventListener('focus', checkIdleWhenTabReturns);
      window.removeEventListener('pageshow', checkIdleWhenTabReturns);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, isSessionTimeoutPromptOpen, navigate, setAuthSession]);

  useEffect(() => {
    if (sessionTimeoutFlowState !== 'extend_prompt') {
      return;
    }

    const sessionTimeoutDeadline =
      getStoredSessionTimeoutDeadline() ?? createSessionTimeoutDeadline();
    const remainingMs = sessionTimeoutDeadline - Date.now();

    if (remainingMs <= 0) {
      void revokeTimedOutSession().catch(() => undefined);
      return;
    }

    const graceTimeoutId = window.setTimeout(() => {
      void revokeTimedOutSession().catch(() => undefined);
    }, remainingMs);

    return () => {
      window.clearTimeout(graceTimeoutId);
    };
  }, [sessionTimeoutFlowState, revokeTimedOutSession]);

  const handleLogout = () => {
    clearSessionTimeoutDeadline();
    setSessionTimeoutFlowState('none'); // no need to show the extend prompt
    setAuthSession(null);
    setEditingAppointment(null);
    navigate('/');

    void logout().catch(() => undefined);
  };

  const handleSessionTimeoutLogout = async () => {
    await revokeTimedOutSession();
  };

  const handleSessionTimeoutAcknowledged = () => {
    clearSessionTimeoutDeadline();
    setSessionTimeoutFlowState('none');
    setOpenAuthModal(true);
  };

  const handleExtendSession = async () => {
    const session = await refreshSession();

    sessionLastActivityAtRef.current = Date.now();
    clearSessionTimeoutDeadline();
    setAuthSession(toAuthSession(session));
    setSessionTimeoutFlowState('none');
    setOpenAuthModal(false);
  };

  const openBookingFlow = () => {
    setEditingAppointment(null);
    setOpenAppointmentModal(false);
    navigate('/new-appointment');

    if (!isAuthenticated) {
      setOpenAuthModal(true);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <HeaderNav
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        onOpenAuthModal={() => setOpenAuthModal(true)}
        onOpenMyAccount={() => navigate('/account')}
        onOpenAppointmentModal={openBookingFlow}
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
          <Route
            path="/new-appointment"
            element={<Home onMakeAppointment={openBookingFlow} />}
          />
        </Routes>

        <MyAppointments
          open={location.pathname === '/appointments'}
          authSession={authSession}
          refreshKey={appointmentsRefreshKey}
          onClose={() => navigate('/')}
          onMakeAppointment={openBookingFlow}
          onUpdateAppointment={(appointment) => {
            setEditingAppointment(appointment);
            setOpenAppointmentModal(true);
          }}
        />

        <MyAccount
          open={location.pathname === '/account'}
          authSession={authSession}
          onClose={() => navigate('/')}
        />
      </Content>

      <UserAuthModal
        open={openAuthModal}
        sessionTimeoutState={sessionTimeoutFlowState}
        onClose={() => setOpenAuthModal(false)}
        onExtendSession={handleExtendSession}
        onSessionLogout={handleSessionTimeoutLogout}
        onSessionTimeoutAcknowledged={handleSessionTimeoutAcknowledged}
        onAuthSuccess={(session) => {
          sessionLastActivityAtRef.current = Date.now();
          clearSessionTimeoutDeadline();
          setAuthSession(session);
          setSessionTimeoutFlowState('none'); // none means no need to show the extend screen
          setOpenAuthModal(false);
          setEditingAppointment(null);
        }}
      />

      <MakeAppointmentModal
        open={isAppointmentModalOpen}
        authSession={authSession}
        editingAppointment={editingAppointment}
        onClose={() => {
          setOpenAppointmentModal(false);
          setEditingAppointment(null);
          if (isNewAppointmentRoute) {
            navigate('/');
          }
        }}
        onBooked={() => {
          setOpenAppointmentModal(false);
          setEditingAppointment(null);
          setAppointmentsRefreshKey((current) => current + 1);
          navigate('/appointments');
        }}
      />

      <Footer style={{ textAlign: 'center' }}>
        ©2025 Cooper's Barber Shop | All Rights Reserved
      </Footer>
    </Layout>
  );
}

export default App;
