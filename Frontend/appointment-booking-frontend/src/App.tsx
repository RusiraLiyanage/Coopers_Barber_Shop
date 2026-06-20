import { useCallback, useEffect, useState } from 'react';
import { Layout, Modal } from 'antd';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import HeaderNav from './components/HeaderNav';
import Home from './pages/HomePage';
import MyAppointments from './pages/MyAppointments';
import MyAccount from './pages/MyAccount';
import UserAuthModal from './Models/userAuth';
import GoogleLinkModal from './Models/googleLink';
import MakeAppointmentModal from './Models/makeAppointment';
import {
  clearClientAuthSession,
  clearGoogleLinkPromptFromUrl,
  completeGoogleSessionSwitch,
  canRestoreClientAuthSession,
  isSessionExpiredError,
  isSessionIdleExpiredError,
  logoutPreviousClientSession,
  readGoogleLinkPrompt,
  readGoogleSessionSwitchPrompt,
  SESSION_EXPIRED_EVENT,
  SESSION_IDLE_EXPIRED_EVENT,
  shouldClearStaleClientAuthSession,
  toAuthSession,
  type AppointmentRecord,
  type AuthSession,
  type GoogleLinkPrompt,
  type GoogleSessionSwitchPrompt,
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
const SESSION_RESTORE_ROUTES = new Set([
  '/appointments',
  '/account',
  '/new-appointment',
]);

type SessionTimeoutFlowState = 'none' | 'extend_prompt' | 'expired_notice';

function shouldRestoreSessionForRoute(pathname: string): boolean {
  return SESSION_RESTORE_ROUTES.has(pathname);
}

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
  const [googleLinkPrompt, setGoogleLinkPrompt] =
    useState<GoogleLinkPrompt | null>(() => readGoogleLinkPrompt());
  const [googleSessionSwitchPrompt, setGoogleSessionSwitchPrompt] =
    useState<GoogleSessionSwitchPrompt | null>(() =>
      readGoogleSessionSwitchPrompt(),
    );
  const [authSwitchPromptOpen, setAuthSwitchPromptOpen] = useState(false);
  const [authSwitchLoading, setAuthSwitchLoading] = useState(false);

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

  const showSessionExpiredNotice = useCallback(() => {
    setAuthSession(null);
    setEditingAppointment(null);
    setOpenAppointmentModal(false);
    navigate('/');
    setOpenAuthModal(true);
    setSessionTimeoutFlowState('expired_notice');
  }, [navigate, setAuthSession]);

  useEffect(() => {
    let isMounted = true;
    const shouldRestoreSession =
      canRestoreClientAuthSession() ||
      shouldRestoreSessionForRoute(location.pathname);

    if (!shouldRestoreSession) {
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

        if (isSessionExpiredError(error)) {
          showSessionExpiredNotice();
          return;
        }

        setAuthSession(null);
        clearClientAuthSession();
      })
      .finally(() => {
        if (isMounted) {
          setAuthSessionResolved(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    dispatch,
    location.pathname,
    setAuthSession,
    showSessionExpiredNotice,
    showSessionExtensionPrompt,
  ]);

  useEffect(() => {
    if (
      !authSessionResolved ||
      !openAuthModal ||
      !isAuthenticated ||
      isSessionTimeoutPromptOpen
    ) {
      return;
    }

    setOpenAuthModal(false);
    setAuthSwitchPromptOpen(true);
  }, [
    authSessionResolved,
    isAuthenticated,
    isSessionTimeoutPromptOpen,
    openAuthModal,
  ]);

  useEffect(() => {
    // Strip the link markers from the URL once captured so a refresh or share
    // doesn't re-trigger the prompt; the httpOnly link ticket cookie still
    // drives the actual linking request.
    if (googleLinkPrompt || googleSessionSwitchPrompt) {
      clearGoogleLinkPromptFromUrl();
    }
  }, [googleLinkPrompt, googleSessionSwitchPrompt]);

  useEffect(() => {
    const handleSessionIdleExpired = () => {
      showSessionExtensionPrompt();
    };
    const handleSessionExpired = () => {
      showSessionExpiredNotice();
    };

    window.addEventListener(
      SESSION_IDLE_EXPIRED_EVENT,
      handleSessionIdleExpired,
    );
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(
        SESSION_IDLE_EXPIRED_EVENT,
        handleSessionIdleExpired,
      );
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [showSessionExpiredNotice, showSessionExtensionPrompt]);

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

  const requestAuthModal = () => {
    if (isAuthenticated) {
      setAuthSwitchPromptOpen(true);
      return;
    }

    setOpenAuthModal(true);
  };

  const requestSessionSwitchFromAuthModal = () => {
    setOpenAuthModal(false);
    setAuthSwitchPromptOpen(true);
  };

  const handleCancelAuthSwitch = () => {
    setAuthSwitchPromptOpen(false);
  };

  const handleContinueAuthSwitch = async () => {
    setAuthSwitchLoading(true);
    setSessionTimeoutFlowState('none');

    try {
      await logoutPreviousClientSession();
    } catch {
      // Local state is already cleared; allow the user to continue signing in.
    } finally {
      setAuthSession(null);
      setEditingAppointment(null);
      setOpenAppointmentModal(false);
      dispatch(resetStore());
      navigate('/');
      setAuthSwitchLoading(false);
      setAuthSwitchPromptOpen(false);
      setOpenAuthModal(true);
    }
  };

  const handleGoogleSessionSwitchCancel = () => {
    setGoogleSessionSwitchPrompt(null);
    navigate('/');
  };

  const handleGoogleSessionSwitchConfirm = async () => {
    setAuthSwitchLoading(true);

    try {
      const response = await completeGoogleSessionSwitch();
      setAuthSession(toAuthSession(response));
      setGoogleSessionSwitchPrompt(null);
      setOpenAuthModal(false);
      setSessionTimeoutFlowState('none');
      navigate('/');
    } finally {
      setAuthSwitchLoading(false);
    }
  };

  const handleSessionTimeoutLogout = async () => {
    setSessionTimeoutFlowState('none');
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

        if (isSessionExpiredError(error)) {
          showSessionExpiredNotice();
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
      showSessionExpiredNotice,
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
        onOpenAuthModal={requestAuthModal}
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
        hasActiveSession={isAuthenticated}
        onRequestSessionSwitch={requestSessionSwitchFromAuthModal}
        onAuthSuccess={(session) => {
          setAuthSession(session);
          setSessionTimeoutFlowState('none'); // none means no need to show the extend screen
          setOpenAuthModal(false);
          setEditingAppointment(null);
        }}
      />

      <GoogleLinkModal
        open={Boolean(googleLinkPrompt)}
        email={googleLinkPrompt?.email ?? ''}
        onClose={() => setGoogleLinkPrompt(null)}
        onLinked={(session) => {
          setAuthSession(session);
          setSessionTimeoutFlowState('none');
          setOpenAuthModal(false);
          setGoogleLinkPrompt(null);
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

      <Modal
        title="Active session found"
        open={googleSessionSwitchPrompt !== null}
        okText="End previous session"
        cancelText="Keep previous session"
        confirmLoading={authSwitchLoading}
        onOk={() => {
          void handleGoogleSessionSwitchConfirm();
        }}
        onCancel={handleGoogleSessionSwitchCancel}
        centered
      >
        <p>
          {googleSessionSwitchPrompt?.email
            ? `${googleSessionSwitchPrompt.email} already has an active session.`
            : 'This Google account already has an active session.'}
        </p>
        <p>
          Continuing will end the previous session for this account before
          signing in with Google here.
        </p>
        <p>Do you want to continue?</p>
      </Modal>

      <Modal
        title="Already signed in"
        open={authSwitchPromptOpen}
        okText="End previous session"
        cancelText="Keep current session"
        confirmLoading={authSwitchLoading}
        onOk={() => {
          void handleContinueAuthSwitch();
        }}
        onCancel={handleCancelAuthSwitch}
        centered
      >
        <p>You are already signed in to this account.</p>
        <p>
          Continuing will end the previous session on this browser before you
          sign in again.
        </p>
        <p>Do you want to continue?</p>
      </Modal>

      <Footer className="app-footer">
        ©2025 Cooper's Barber Shop | All Rights Reserved
      </Footer>
    </Layout>
  );
}

export default App;
