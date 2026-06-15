import { useCallback, useEffect, useState } from 'react';
import { Layout } from 'antd';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import AdminHeader from './components/AdminHeader';
import { SALoadingPanel } from './components/common';
import { getUserFriendlyErrorMessage } from './lib/errors';
import AcceptInvite from './pages/AcceptInvite';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import { resetStore } from './store';
import { getCurrentSessionAction, logoutAction } from './store/auth/action';
import { selectAuthLoading, selectAuthSession } from './store/auth/selector';
import { useAppDispatch, useAppSelector } from './store/hooks';
import './App.css';

const { Content } = Layout;

function App() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const authSession = useAppSelector(selectAuthSession);
  const authLoading = useAppSelector(selectAuthLoading);
  const [authResolved, setAuthResolved] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isAuthenticated = Boolean(authSession?.authenticated);

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
          setAuthError(getUserFriendlyErrorMessage(error));
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
  }, [dispatch]);

  const handleLogout = useCallback(() => {
    dispatch(resetStore());
    navigate('/');

    void dispatch(logoutAction())
      .unwrap()
      .catch(() => undefined);
  }, [dispatch, navigate]);

  if (!authResolved || authLoading) {
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
              path="*"
              element={<AdminLogin key={authError ?? 'admin-login'} />}
            />
          </Routes>
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
