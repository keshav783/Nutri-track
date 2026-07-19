import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useProfile } from '../lib/ProfileContext';

// requireProfile=true means: user must have completed the intake form
export default function ProtectedRoute({ children, requireProfile = false }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (authLoading || (user && profileLoading)) return <div className="page-center">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (requireProfile && !profile) return <Navigate to="/intake" replace />;

  return children;
}
