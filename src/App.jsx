import { useState, useEffect, useCallback } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import { CheckCircle2, X } from "lucide-react";
import { request, post, roleTitle } from "./lib/api";
import { Spinner } from "./components/shared/UI";
import Brand from "./components/shared/BrandLogo";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import ScrollToTop from "./components/shared/ScrollToTop";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/public/Login";
import { Help } from "./pages/public/ProjectGuide";
import { Agenda } from "./pages/clinical/Agenda";
import DniScanner from "./pages/clinical/DniScanner";
import { Encounter } from "./pages/clinical/Encounter";
import { Signatures } from "./pages/clinical/Signatures";
import { Coverage } from "./pages/supervision/Coverage";
import { Pharmacy } from "./pages/pharmacy/Pharmacy";
import { Audit } from "./pages/admin/Audit";
import { Access } from "./pages/admin/Access";
const firstPage = (user) =>
  ({ supervision: "/cobertura", farmacia: "/farmacia", admin: "/accesos" })[
    user.role
  ] ?? "/agenda";
function EncounterRoute(props) {
  const { id } = useParams();
  return <Encounter {...props} id={id} />;
}
function SignaturesRoute(props) {
  const { id } = useParams();
  const [params] = useSearchParams();
  return (
    <Signatures
      {...props}
      documentId={id}
      encounterId={params.get("atencion") ?? undefined}
    />
  );
}
export default function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [switching, setSwitching] = useState(false),
    [toast, setToast] = useState(null);
  const notify = useCallback(
    (message, error = false) => setToast({ message, error }),
    [],
  );
  const go = useCallback(
    (path) => navigate(path.startsWith("/") ? path : "/" + path),
    [navigate],
  );
  useEffect(() => {
    let active = true;
    request("/auth/me")
      .then((r) => {
        if (active) setUser(r.user);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    const expired = () => {
      setUser(null);
      navigate("/login", { replace: true });
      notify("La sesión terminó. Vuelve a ingresar.", true);
    };
    window.addEventListener("session-expired", expired);
    return () => {
      active = false;
      window.removeEventListener("session-expired", expired);
    };
  }, [navigate, notify]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.error ? 9000 : 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  const onLogin = (u) => {
    setUser(u);
    navigate(firstPage(u), { replace: true });
  };
  async function changeProfile(id) {
    if (id === user?.id) return;
    setSwitching(true);
    try {
      const r = await post("/auth/login", {
        username: id,
        password: "Demo2026!",
      });
      onLogin(r.user);
      notify("Perfil de demostración: " + roleTitle(r.user.role) + ".");
    } catch (e) {
      notify(e.message, true);
    } finally {
      setSwitching(false);
    }
  }
  async function logout() {
    try {
      await post("/auth/logout");
      setUser(null);
      navigate("/login", { replace: true });
    } catch (e) {
      notify(e.message, true);
    }
  }
  const props = { user, go, notify };
  if (loading)
    return (
      <div className="boot">
        <Brand />
        <Spinner label="Preparando tu espacio…" />
      </div>
    );
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={firstPage(user)} replace />
            ) : (
              <Login onLogin={onLogin} />
            )
          }
        />
        <Route element={<ProtectedRoute user={user} />}>
          <Route
            element={
              <AppLayout
                user={user}
                onProfileChange={changeProfile}
                onLogout={logout}
                switching={switching}
              />
            }
          >
            <Route
              path="/"
              element={
                <Navigate to={user ? firstPage(user) : "/login"} replace />
              }
            />
            <Route
              element={
                <ProtectedRoute
                  user={user}
                  roles={["medico", "enfermeria", "admision"]}
                />
              }
            >
              <Route path="/agenda" element={<Agenda {...props} />} />
              <Route path="/dni" element={<DniScanner {...props} />} />
            </Route>
            <Route
              element={
                <ProtectedRoute user={user} roles={["medico", "enfermeria"]} />
              }
            >
              <Route
                path="/atencion/:id?"
                element={<EncounterRoute {...props} />}
              />
              <Route
                path="/firmas/:id?"
                element={<SignaturesRoute {...props} />}
              />
            </Route>
            <Route
              element={<ProtectedRoute user={user} roles={["supervision"]} />}
            >
              <Route path="/cobertura" element={<Coverage {...props} />} />
            </Route>
            <Route
              element={<ProtectedRoute user={user} roles={["farmacia"]} />}
            >
              <Route path="/farmacia" element={<Pharmacy {...props} />} />
            </Route>
            <Route
              element={
                <ProtectedRoute user={user} roles={["admin", "supervision"]} />
              }
            >
              <Route path="/auditoria" element={<Audit {...props} />} />
            </Route>
            <Route element={<ProtectedRoute user={user} roles={["admin"]} />}>
              <Route path="/accesos" element={<Access {...props} />} />
            </Route>
            <Route path="/guia" element={<Help {...props} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
      {toast && (
        <div
          className={"toast " + (toast.error ? "error" : "")}
          role={toast.error ? "alert" : "status"}
        >
          {toast.error ? <X size={19} /> : <CheckCircle2 size={19} />}
          <span>{toast.message}</span>
          <button aria-label="Cerrar aviso" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
