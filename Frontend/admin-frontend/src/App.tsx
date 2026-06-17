import { useCallback, useEffect, useState } from 'react';
import { Layout } from 'antd';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import AdminHeader from './components/AdminHeader';
import AdminSessionTimeoutModal from './components/AdminSessionTimeoutModal';
import { SALoadingPanel } from './components/common';
import {
  ApiRequestError,
  SESSION_EXPIRED_EVENT,
  SESSION_IDLE_EXPIRED_EVENT,
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
import { selectAuthLoading, selectAuthSession } from './store/auth/selector';
import { useAppDispatch, useAppSelector } from './store/hooks';
import './App.css';

const { Content } = Layout;
type SessionTimeoutFlowState = 'none' | 'extend_prompt';

function isExpectedSignedOutError(error: unknown): boolean {
  if (error instanceof Error && error.message === 'Authentication failed') {
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
  const authLoading = useAppSelector(selectAuthLoading);
  const [authResolved, setAuthResolved] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [sessionTimeoutFlowState, setSessionTimeoutFlowState] =
    useState<SessionTimeoutFlowState>('none');
  const [extendLoading, setExtendLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const isAuthenticated = Boolean(authSession?.authenticated);
  const isSessionTimeoutPromptOpen = sessionTimeoutFlowState === 'extend_prompt';

  const showSessionExtensionPrompt = useCallback(() => {
    dispatch(resetStore());
    setAuthError(null);
    setSessionTimeoutFlowState('extend_prompt');
    setAuthResolved(true);
    navigate('/login', { replace: true });
  }, [dispatch, navigate]);

  const showSessionExpiredNotice = useCallback(() => {
    dispatch(resetStore());
    setAuthError(ADMIN_SESSION_EXPIRED_MESSAGE);
    setSessionTimeoutFlowState('none');
    setAuthResolved(true);
    navigate('/login', { replace: true });
  }, [dispatch, navigate]);

  useEffect(() => {
    let isMounted = true;

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
      navigate('/', { replace: true });
    } catch {
      showSessionExpiredNotice();
    } finally {
      setExtendLoading(false);
    }
  }, [dispatch, navigate, showSessionExpiredNotice]);

  const handleSessionTimeoutLogout = useCallback(async () => {
    setLogoutLoading(true);
    setSessionTimeoutFlowState('none');
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

  if (!authResolved || (authLoading && !isSessionTimeoutPromptOpen)) {
    return (
      <Layout className="admin-app-shell">
        <AdminHeader isAuthenticated={false} onLogout={handleLogout} />
        <Content className="admin-app-content">
          <SALoadingPanel />
        </Content>
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
          <AdminSessionTimeoutModal
            open={isSessionTimeoutPromptOpen}
            extendLoading={extendLoading}
            logoutLoading={logoutLoading}
            onExtend={handleExtendSession}
            onLogout={handleSessionTimeoutLogout}
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="admin-app-shell">
      <AdminHeader isAuthenticated={isAuthenticated} onLogout={handleLogout} />
      <Content className="admin-app-content">
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/accept-invite" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Content>
    </Layout>
  );
}

export default App;
