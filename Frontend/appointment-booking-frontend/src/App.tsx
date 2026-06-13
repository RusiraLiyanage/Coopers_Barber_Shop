import { useCallback, useEffect, useState } from 'react';
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
  isSessionIdleExpiredError,
  SESSION_IDLE_EXPIRED_EVENT,
  shouldClearStaleClientAuthSession,
  toAuthSession,
  type AppointmentRecord,
  type AuthSession,
} from './lib/api';
import { resetStore } from './store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import {
  extendSessionAction,
  getCurrentSessionAction,
  logoutAction,
} from './store/auth/action';
import { selectAuthSession } from './store/auth/selector';
import { setAuthSession as setAuthSessionStore } from './store/auth/slice';
import './App.css';

const { Content, Footer } = Layout;
const LEGACY_AUTH_TOKEN_KEY = 'booking_auth_token';

type SessionTimeoutFlowState = 'none' | 'extend_prompt' | 'logged_out';

function App() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const authSession = useAppSelector(selectAuthSession);
  const [authSessionResolved, setAuthSessionResolved] = useState(false);
  const [openAuthModal, setOpenAuthModal] = useState(false);
  const [openAppointmentModal, setOpenAppointmentModal] = useState(false);
  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentRecord | null>(null);
  const [appointmentsRefreshKey, setAppointmentsRefreshKey] = useState(0);
  const [sessionTimeoutFlowState, setSessionTimeoutFlowState] =
    useState<SessionTimeoutFlowState>('none');

  const isAuthenticated = Boolean(authSession?.authenticated);
  const isSessionTimeoutPromptOpen = sessionTimeoutFlowState !== 'none';
  const isNewAppointmentRoute = location.pathname === '/new-appointment';
  const isAppointmentModalOpen =
    openAppointmentModal || (isNewAppointmentRoute && isAuthenticated);

  const setAuthSession = useCallback(
    (session: AuthSession | null) => {
      localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
      dispatch(setAuthSessionStore(session));
    },
    [dispatch],
  );

  const showSessionExtensionPrompt = useCallback(() => {
    setAuthSession(null);
    setEditingAppointment(null);
    setOpenAppointmentModal(false);
    navigate('/');
    setOpenAuthModal(true);
    setSessionTimeoutFlowState('extend_prompt');
  }, [navigate, setAuthSession]);

  useEffect(() => {
    let isMounted = true;

    if (!canRestoreClientAuthSession()) {
      if (shouldClearStaleClientAuthSession()) {
        void dispatch(logoutAction())
          .unwrap()
          .catch(() => undefined);
      }

      setAuthSession(null);
      setAuthSessionResolved(true);

      return () => {
        isMounted = false;
      };
    }

    dispatch(getCurrentSessionAction())
      .unwrap()
      .then((session) => {
        if (isMounted) {
          setAuthSession(toAuthSession(session));
        }
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        if (isSessionIdleExpiredError(error)) {
          showSessionExtensionPrompt();
          return;
        }

        setAuthSession(null);
      })
      .finally(() => {
        if (isMounted) {
          setAuthSessionResolved(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [dispatch, setAuthSession, showSessionExtensionPrompt]);

  useEffect(() => {
    const handleSessionIdleExpired = () => {
      showSessionExtensionPrompt();
    };

    window.addEventListener(
      SESSION_IDLE_EXPIRED_EVENT,
      handleSessionIdleExpired,
    );

    return () => {
      window.removeEventListener(
        SESSION_IDLE_EXPIRED_EVENT,
        handleSessionIdleExpired,
      );
    };
  }, [showSessionExtensionPrompt]);

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

  const handleLogout = () => {
    setSessionTimeoutFlowState('none'); // no need to show the extend prompt
    setAuthSession(null);
    setEditingAppointment(null);
    dispatch(resetStore());
    navigate('/');

    void dispatch(logoutAction())
      .unwrap()
      .catch(() => undefined);
  };

  const handleSessionTimeoutLogout = async () => {
    setSessionTimeoutFlowState('logged_out');
    setAuthSession(null);
    setEditingAppointment(null);
    setOpenAppointmentModal(false);
    dispatch(resetStore());
    navigate('/');
    setOpenAuthModal(true);

    await dispatch(logoutAction())
      .unwrap()
      .catch(() => undefined);
  };

  const handleSessionTimeoutAcknowledged = () => {
    setSessionTimeoutFlowState('none');
    setOpenAuthModal(true);
  };

  const handleExtendSession = async () => {
    const session = await dispatch(extendSessionAction()).unwrap();

    setAuthSession(toAuthSession(session));
    setSessionTimeoutFlowState('none');
    setOpenAuthModal(false);
  };

  const runProtectedAction = useCallback(
    async (action: () => void): Promise<void> => {
      if (isSessionTimeoutPromptOpen) {
        return;
      }

      if (!isAuthenticated) {
        setOpenAuthModal(true);
        return;
      }

      try {
        const session = await dispatch(getCurrentSessionAction()).unwrap();

        setAuthSession(toAuthSession(session));
        action();
      } catch (error: unknown) {
        if (isSessionIdleExpiredError(error)) {
          showSessionExtensionPrompt();
          return;
        }

        setAuthSession(null);
        setEditingAppointment(null);
        setOpenAppointmentModal(false);
        navigate('/');
        setOpenAuthModal(true);
      }
    },
    [
      isAuthenticated,
      isSessionTimeoutPromptOpen,
      dispatch,
      navigate,
      setAuthSession,
      showSessionExtensionPrompt,
    ],
  );

  const openBookingFlow = () => {
    setEditingAppointment(null);
    setOpenAppointmentModal(false);

    if (!isAuthenticated) {
      setOpenAuthModal(true);
      return;
    }

    void runProtectedAction(() => {
      navigate('/new-appointment');
    });
  };

  const openMyAppointmentsFlow = () => {
    void runProtectedAction(() => {
      navigate('/appointments');
    });
  };

  const openMyAccountFlow = () => {
    void runProtectedAction(() => {
      navigate('/account');
    });
  };

  const openUpdateAppointmentFlow = (appointment: AppointmentRecord) => {
    void runProtectedAction(() => {
      setEditingAppointment(appointment);
      setOpenAppointmentModal(true);
    });
  };

  return (
    <Layout className="app-shell">
      <HeaderNav
        isAuthenticated={isAuthenticated}
        onLogout={handleLogout}
        onOpenAuthModal={() => setOpenAuthModal(true)}
        onOpenMyAccount={openMyAccountFlow}
        onOpenMyAppointments={openMyAppointmentsFlow}
        onOpenAppointmentModal={openBookingFlow}
      />

      <Content className="app-content">
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
          onUpdateAppointment={openUpdateAppointmentFlow}
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

      <Footer className="app-footer">
        ©2025 Cooper's Barber Shop | All Rights Reserved
      </Footer>
    </Layout>
  );
}

export default App;
