import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ProfileProvider, useProfile } from './ProfileContext';
import ProtectedRoute from './ProtectedRoute';
import Auth from './Auth';
import IntakeForm from './IntakeForm';
import Dashboard from './Dashboard';

function NavBar() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  if (!user) return null;

  return (
    <nav className="navbar">
      <Link to="/dashboard" className="brand-small">NutriTrack</Link>
      <div className="nav-links">
        {profile && <Link to="/intake">Edit profile</Link>}
        <button className="btn-link" onClick={() => signOut()}>Sign out</button>
      </div>
    </nav>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <Auth />} />
      <Route
        path="/intake"
        element={
          <ProtectedRoute>
            <IntakeForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requireProfile>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProfileProvider>
          <NavBar />
          <AppRoutes />
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
