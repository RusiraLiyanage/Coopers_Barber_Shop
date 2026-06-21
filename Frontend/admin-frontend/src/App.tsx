import { useCallback, useEffect, useState } from 'react';
import { Layout } from 'antd';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import AdminHeader from './components/AdminHeader';
import AdminSessionTimeoutModal from './components/AdminSessionTimeoutModal';
import { SALoadingPanel } from './components/common';
import {
  ApiRequestError,
  canRestoreAdminAuthSession,
  clearAdminAuthSession,
  clearAdminSessionTimeoutTracking,
  getAdminSessionTimeoutDeadlines,
  SESSION_EXPIRED_EVENT,
  SESSION_IDLE_EXPIRED_EVENT,
  shouldClearStaleAdminAuthSession,
  shouldShowAdminLoginAfterExpiry,
  isSessionExpiredError,
  isSessionIdleExpiredError,
} from './lib/api';
import {
  ADMIN_SESSION_EXPIRED_MESSAGE,
  getUserFriendlyErrorMessage,
} from './lib/errors';
import AcceptInvite from './pages/AcceptInvite';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import { resetStore } from './store';
import {
  extendAdminSessionAction,
  getCurrentSessionAction,
  logoutAction,
} from './store/auth/action';
import { selectAuthSession } from './store/auth/selector';
import { useAppDispatch, useAppSelector } from './store/hooks';
import './App.css';

const { Content } = Layout;
type SessionTimeoutFlowState = 'none' | 'extend_prompt';

function isExpectedSignedOutError(error: unknown): boolean {
  if (error instanceof Error && error.message === 'Authentication failed') {
    return true;
  }

  if (error instanceof Error && error.message === 'Admin access required.') {
    return true;
  }

  return (
    error instanceof ApiRequestError &&
    (error.statusCode === 401 || error.statusCode === 403)
  );
}

function App() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const authSession = useAppSelector(selectAuthSession);
  const [authResolved, setAuthResolved] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionTimeoutFlowState, setSessionTimeoutFlowState] =
    useState<SessionTimeoutFlowState>('none');
  const [extendLoading, setExtendLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const isAuthenticated = Boolean(authSession?.authenticated);
  const isSessionTimeoutPromptOpen = sessionTimeoutFlowState === 'extend_prompt';

  const showSessionExtensionPrompt = useCallback(() => {
    setAuthError(null);
    setSessionTimeoutFlowState('extend_prompt');
    setAuthResolved(true);
  }, []);

  const showSessionExpiredNotice = useCallback(() => {
    clearAdminAuthSession();
    dispatch(resetStore());
    setAuthError(ADMIN_SESSION_EXPIRED_MESSAGE);
    setSessionTimeoutFlowState('none');
    setAuthResolved(true);
    navigate('/login', { replace: true });
  }, [dispatch, navigate]);

  useEffect(() => {
    if (!authResolved) {
      return;
    }

    if (
      !isAuthenticated &&
      !isSessionTimeoutPromptOpen &&
      !canRestoreAdminAuthSession()
    ) {
      return;
    }

    const deadlines = getAdminSessionTimeoutDeadlines();

    if (!deadlines) {
      return;
    }

    const now = Date.now();

    if (now >= deadlines.graceExpiresAt) {
      showSessionExpiredNotice();
      return;
    }

    if (now >= deadlines.promptAt) {
      showSessionExtensionPrompt();

      const graceTimerId = window.setTimeout(() => {
        showSessionExpiredNotice();
      }, Math.max(deadlines.graceExpiresAt - now, 0));

      return () => {
        window.clearTimeout(graceTimerId);
      };
    }

    const promptTimerId = window.setTimeout(() => {
      showSessionExtensionPrompt();
    }, deadlines.promptAt - now);
    const graceTimerId = window.setTimeout(() => {
      showSessionExpiredNotice();
    }, deadlines.graceExpiresAt - now);

    return () => {
      window.clearTimeout(promptTimerId);
      window.clearTimeout(graceTimerId);
    };
  }, [
    authResolved,
    isAuthenticated,
    isSessionTimeoutPromptOpen,
    showSessionExpiredNotice,
    showSessionExtensionPrompt,
  ]);

  useEffect(() => {
    let isMounted = true;

    if (shouldShowAdminLoginAfterExpiry()) {
      showSessionExpiredNotice();

      return () => {
        isMounted = false;
      };
    }

    const deadlines = getAdminSessionTimeoutDeadlines();

    if (deadlines && Date.now() >= deadlines.promptAt) {
      if (Date.now() >= deadlines.graceExpiresAt) {
        showSessionExpiredNotice();
      } else {
        showSessionExtensionPrompt();
      }

      return () => {
        isMounted = false;
      };
    }

    if (!canRestoreAdminAuthSession()) {
      if (shouldClearStaleAdminAuthSession()) {
        void dispatch(logoutAction())
          .unwrap()
          .catch(() => undefined);
      }

      dispatch(resetStore());
      setAuthResolved(true);

      return () => {
        isMounted = false;
      };
    }

    dispatch(getCurrentSessionAction())
      .unwrap()
      .then(() => {
        if (isMounted) {
          setAuthError(null);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          if (isSessionIdleExpiredError(error)) {
            showSessionExtensionPrompt();
            return;
          }

          if (isSessionExpiredError(error)) {
            showSessionExpiredNotice();
            return;
          }

          setAuthError(
            isExpectedSignedOutError(error)
              ? null
              : getUserFriendlyErrorMessage(error),
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setAuthResolved(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [dispatch, showSessionExpiredNotice, showSessionExtensionPrompt]);

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

  const handleLogout = useCallback(() => {
    setSessionTimeoutFlowState('none');
    clearAdminAuthSession();
    dispatch(resetStore());
    navigate('/');

    void dispatch(logoutAction())
      .unwrap()
      .catch(() => undefined);
  }, [dispatch, navigate]);

  const handleExtendSession = useCallback(async () => {
    setExtendLoading(true);

    try {
      await dispatch(extendAdminSessionAction()).unwrap();
      setAuthError(null);
      setSessionTimeoutFlowState('none');
    } catch {
      showSessionExpiredNotice();
    } finally {
      setExtendLoading(false);
    }
  }, [dispatch, showSessionExpiredNotice]);

  const handleSessionTimeoutLogout = useCallback(async () => {
    setLogoutLoading(true);
    setSessionTimeoutFlowState('none');
    clearAdminSessionTimeoutTracking();
    dispatch(resetStore());
    setAuthError(ADMIN_SESSION_EXPIRED_MESSAGE);
    navigate('/login', { replace: true });

    try {
      await dispatch(logoutAction()).unwrap();
    } catch {
      return;
    } finally {
      setLogoutLoading(false);
    }
  }, [dispatch, navigate]);

  const sessionTimeoutModal = (
    <AdminSessionTimeoutModal
      open={isSessionTimeoutPromptOpen}
      extendLoading={extendLoading}
      logoutLoading={logoutLoading}
      onExtend={handleExtendSession}
      onLogout={handleSessionTimeoutLogout}
    />
  );

  if (!authResolved) {
    return (
      <Layout className="admin-app-shell">
        <AdminHeader isAuthenticated={false} onLogout={handleLogout} />
        <Content className="admin-app-content">
          <SALoadingPanel />
        </Content>
        {sessionTimeoutModal}
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return (
      <Layout className="admin-app-shell">
        <AdminHeader isAuthenticated={false} onLogout={handleLogout} />
        <Content className="admin-app-content">
          <Routes>
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route
              path="/login"
              element={
                <AdminLogin
                  key={authError ?? 'admin-login'}
                  initialError={authError}
                />
              }
            />
            <Route
              path="*"
              element={
                <AdminLogin
                  key={authError ?? 'admin-login'}
                  initialError={authError}
                />
              }
            />
          </Routes>
        </Content>
        {sessionTimeoutModal}
      </Layout>
    );
  }

  return (
    <Layout className="admin-app-shell">
      <AdminHeader isAuthenticated={isAuthenticated} onLogout={handleLogout} />
      <Content className="admin-app-content">
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/login" element={<AdminDashboard />} />
          <Route path="/accept-invite" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Content>
      {sessionTimeoutModal}
    </Layout>
  );
}

export default App;
