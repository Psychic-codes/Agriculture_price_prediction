import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, role }: { children: React.ReactNode; role: 'farmer' | 'government' }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  if (user?.role !== role) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};
