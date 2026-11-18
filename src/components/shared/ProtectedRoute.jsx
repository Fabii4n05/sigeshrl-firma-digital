import { Navigate, Outlet } from "react-router";
import { ErrorBox } from "./UI";
export default function ProtectedRoute({ user, roles }) {
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role))
    return <ErrorBox message="Tu perfil no tiene acceso a este módulo." />;
  return <Outlet />;
}
