import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';

export default function ProtectedRoute({ children, requireProfile = false }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (authLoading || (user && profileLoading)) return <div className="page-center">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (requireProfile && !profile) return <Navigate to="/intake" replace />;

  return children;
}
