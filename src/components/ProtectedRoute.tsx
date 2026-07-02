import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import type { Rol } from "../types/database";

interface Props {
  roles?: Rol[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ roles, children }: Props) {
  const { perfil, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin h-10 w-10 border-4 border-green border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!perfil) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(perfil.rol)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
