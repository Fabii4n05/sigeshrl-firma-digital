import React, { useState, useEffect, useCallback } from "react";
import {
  Activity,
  CalendarDays,
  ScanLine,
  FilePenLine,
  ShieldCheck,
  ChartNoAxesCombined,
  Pill,
  Logs,
  UsersRound,
  BookOpen,
  ArrowRight,
  ChevronDown,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  HeartPulse,
  FlaskConical,
  CheckCircle2,
  LockKeyhole,
  Eye,
  EyeOff,
} from "lucide-react";
import type { User } from "../server/types";
import { request, post, roleTitle } from "./api";
import { Spinner, ErrorBox } from "./ui";
import { Agenda } from "./pages/Agenda";
import { DniReader } from "./pages/DniReader";
import { Encounter } from "./pages/Encounter";
import { Signatures } from "./pages/Signatures";
import { Coverage, Pharmacy, Audit, Access, Help } from "./pages/OtherPages";

export type PageProps = {
  user: User;
  go: (path: string) => void;
  notify: (message: string, error?: boolean) => void;
};
const initialPage = (u: User) =>
  ({
    medico: "agenda",
    enfermeria: "agenda",
    admision: "agenda",
    supervision: "cobertura",
    farmacia: "farmacia",
    admin: "accesos",
  })[u.role];
const menu = [
  {
    id: "agenda",
    label: "Agenda de citas",
    icon: CalendarDays,
    roles: ["medico", "enfermeria", "admision"],
  },
  {
    id: "dni",
    label: "Identificar DNI",
    icon: ScanLine,
    roles: ["medico", "enfermeria", "admision"],
  },
  {
    id: "atencion",
    label: "Atención clínica",
    icon: Activity,
    roles: ["medico", "enfermeria"],
  },
  {
    id: "firmas",
    label: "Bandeja de firmas",
    icon: FilePenLine,
    roles: ["medico", "enfermeria"],
  },
  {
    id: "cobertura",
    label: "Cobertura de firma",
    icon: ChartNoAxesCombined,
    roles: ["supervision"],
  },
  {
    id: "farmacia",
    label: "Recetas y dispensación",
    icon: Pill,
    roles: ["farmacia"],
  },
  {
    id: "auditoria",
    label: "Bitácora de actividad",
    icon: Logs,
    roles: ["admin", "supervision"],
  },
  {
    id: "accesos",
    label: "Cuentas y permisos",
    icon: UsersRound,
    roles: ["admin"],
  },
];
export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [path, setPath] = useState(location.hash.slice(1)),
    [mobile, setMobile] = useState(false),
    [theme, setTheme] = useState(
      localStorage.getItem("sigeshrl-theme") ?? "light",
    );
  const [toast, setToast] = useState<{
      message: string;
      error: boolean;
    } | null>(null),
    [switching, setSwitching] = useState(false);
  const notify = useCallback(
    (message: string, error = false) => setToast({ message, error }),
    [],
  );
  const go = useCallback((route: string) => {
    location.hash = route;
    setMobile(false);
  }, []);
  useEffect(() => {
    request("/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => {})
      .finally(() => setLoading(false));
    const hash = () => {
      setPath(location.hash.slice(1));
      window.scrollTo(0, 0);
    };
    const expired = () => {
      setUser(null);
      notify("La sesión terminó. Vuelve a ingresar.", true);
    };
    window.addEventListener("hashchange", hash);
    window.addEventListener("session-expired", expired);
    return () => {
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("session-expired", expired);
    };
  }, [notify]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("sigeshrl-theme", theme);
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.error ? 9000 : 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  const onLogin = (u: User) => {
    setUser(u);
    go(initialPage(u));
  };
  async function changeProfile(id: string) {
    if (!id || id === user?.id) return;
    setSwitching(true);
    try {
      const result = await post("/auth/login", {
        username: id,
        password: "Demo2026!",
      });
      onLogin(result.user);
      notify(`Perfil de demostración: ${roleTitle(result.user.role)}.`);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setSwitching(false);
    }
  }
  async function logout() {
    try {
      await post("/auth/logout");
      setUser(null);
      location.hash = "";
    } catch (e) {
      notify((e as Error).message, true);
    }
  }
  if (loading)
    return (
      <div className="boot">
        <Brand />
        <Spinner label="Preparando tu espacio…" />
      </div>
    );
  const route = (path || (user ? initialPage(user) : ""))
    .split("?")[0]
    .split("/")[0];
  const record = path.split("?")[0].split("/")[1];
  const allowed =
    route === "guia" ||
    menu.some(
      (item) => item.id === route && item.roles.includes(user?.role ?? ""),
    );
  const props = user ? { user, go, notify } : null;
  return (
    <>
      {!user ? (
        <Login onLogin={onLogin} />
      ) : (
        <div className="app-shell">
          {mobile && (
            <button
              className="sidebar-scrim"
              aria-label="Cerrar menú"
              onClick={() => setMobile(false)}
            />
          )}
          <aside className={"sidebar " + (mobile ? "open" : "")}>
            <div className="sidebar-top">
              <Brand />
              <button
                className="icon-button mobile-only"
                aria-label="Cerrar menú"
                onClick={() => setMobile(false)}
              >
                <X size={19} />
              </button>
            </div>
            <div className="hospital-label">
              HOSPITAL REGIONAL
              <br />
              <strong>LAMBAYEQUE</strong>
              <span>Proyecto académico · PETI 02</span>
            </div>
            <div className="nav-section-label">ESPACIO DE TRABAJO</div>
            <nav aria-label="Navegación principal">
              {menu
                .filter((item) => item.roles.includes(user.role))
                .map((item) => (
                  <a
                    key={item.id}
                    className={
                      "nav-item " + (route === item.id ? "active" : "")
                    }
                    href={"#" + item.id}
                    onClick={() => setMobile(false)}
                  >
                    <item.icon size={19} />
                    <span>{item.label}</span>
                    {route === item.id && <span className="nav-dot" />}
                  </a>
                ))}
            </nav>
            <div className="sidebar-bottom">
              <div className="demo-card">
                <FlaskConical size={21} />
                <strong>Un entorno para aprender</strong>
                <p>
                  Explora el recorrido completo con perfiles y pacientes
                  ficticios.
                </p>
                <a href="#guia">
                  Ver guía de demostración
                  <ArrowRight size={14} />
                </a>
              </div>
              <a
                className={"nav-item " + (route === "guia" ? "active" : "")}
                href="#guia"
              >
                <BookOpen size={18} />
                <span>Acerca del proyecto</span>
              </a>
              <div className="sidebar-foot">
                <span className="online-dot" /> Sistema de demostración{" "}
                <small>v1.0</small>
              </div>
            </div>
          </aside>
          <div className="workspace">
            <header className="topbar">
              <div className="topbar-left">
                <button
                  className="icon-button mobile-only"
                  aria-label="Abrir menú"
                  onClick={() => setMobile(true)}
                >
                  <Menu size={22} />
                </button>
                <span className="breadcrumbs">
                  Historia clínica electrónica <span>/</span>
                  <strong>
                    {menu.find((m) => m.id === route)?.label ??
                      "Guía del proyecto"}
                  </strong>
                </span>
              </div>
              <div className="topbar-actions">
                <span className="academic-tag">
                  <FlaskConical size={13} />
                  Entorno académico
                </span>
                <button
                  className="icon-button"
                  onClick={() =>
                    setTheme((t) => (t === "light" ? "dark" : "light"))
                  }
                  aria-label={
                    theme === "light"
                      ? "Activar modo oscuro"
                      : "Activar modo claro"
                  }
                >
                  {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <span className="topbar-divider" />
                <div className="avatar small">
                  {user.name
                    .split(" ")
                    .filter((n) => !n.includes("."))
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="profile-control">
                  <label className="sr-only" htmlFor="profile-select">
                    Cambiar perfil de demostración
                  </label>
                  <select
                    id="profile-select"
                    value={user.id}
                    disabled={switching}
                    onChange={(e) => changeProfile(e.target.value)}
                  >
                    {[
                      "medico",
                      "enfermeria",
                      "admision",
                      "supervision",
                      "farmacia",
                      "admin",
                    ].map((role) => (
                      <option key={role} value={role}>
                        {roleTitle(role)} · demo
                      </option>
                    ))}
                    {user.id === "medico-otro" && (
                      <option value="medico-otro">
                        Médico de otro servicio
                      </option>
                    )}
                  </select>
                  <small>{user.name}</small>
                </div>
                <button
                  className="icon-button logout"
                  onClick={logout}
                  aria-label="Cerrar sesión"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </header>
            <div className="demo-strip">
              <ShieldCheck size={14} />
              <span>
                Datos ficticios. La lectura de DNI identifica registros de
                prueba; la firma y la dispensación son simuladas.
              </span>
            </div>
            <main id="main-content" key={route + user.id}>
              {!allowed ? (
                <ErrorBox message="Tu perfil no tiene acceso a este módulo." />
              ) : route === "agenda" ? (
                <Agenda {...props!} />
              ) : route === "dni" ? (
                <DniReader {...props!} />
              ) : route === "atencion" ? (
                <Encounter {...props!} id={record} />
              ) : route === "firmas" ? (
                <Signatures
                  {...props!}
                  documentId={record}
                  encounterId={
                    new URLSearchParams(path.split("?")[1]).get("atencion") ??
                    undefined
                  }
                />
              ) : route === "cobertura" ? (
                <Coverage {...props!} />
              ) : route === "farmacia" ? (
                <Pharmacy {...props!} />
              ) : route === "auditoria" ? (
                <Audit {...props!} />
              ) : route === "accesos" ? (
                <Access {...props!} />
              ) : (
                <Help {...props!} />
              )}
            </main>
            <footer className="workspace-footer">
              <span>
                SIGESHRL <span>·</span> Hospital Regional Lambayeque
              </span>
              <span>Prototipo académico con almacenamiento persistente</span>
            </footer>
          </div>
        </div>
      )}
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
function Brand() {
  return (
    <a href="#" className="brand" aria-label="SIGESHRL">
      <span className="brand-mark">
        <HeartPulse size={25} strokeWidth={1.8} />
      </span>
      <div>
        <strong>SIGESHRL</strong>
        <span>Salud conectada</span>
      </div>
    </a>
  );
}
function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [profile, setProfile] = useState("medico"),
    [username, setUsername] = useState("medico"),
    [password, setPassword] = useState("Demo2026!"),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await post("/auth/login", { username, password });
      onLogin(result.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const icons: Record<string, React.ElementType> = {
    medico: Activity,
    enfermeria: HeartPulse,
    admision: CalendarDays,
    supervision: ChartNoAxesCombined,
    farmacia: Pill,
    admin: UsersRound,
  };
  return (
    <div className="login-layout">
      <section className="login-story">
        <Brand />
        <div className="login-story-content">
          <span className="login-eyebrow">
            <span /> HOSPITAL REGIONAL LAMBAYEQUE
          </span>
          <h1>
            Cada atención,
            <br />
            con el respaldo
            <br />
            que necesita.
          </h1>
          <p>
            Historia clínica electrónica y firma digital.
            <br />
            Un recorrido conectado, desde la cita hasta la receta.
          </p>
          <div className="journey-graphic">
            <div>
              <CalendarDays />
              <span>Agenda</span>
            </div>
            <i />
            <div>
              <Activity />
              <span>Atención</span>
            </div>
            <i />
            <div>
              <FilePenLine />
              <span>Firma</span>
            </div>
            <i />
            <div>
              <Pill />
              <span>Farmacia</span>
            </div>
          </div>
        </div>
        <div className="login-foot">
          <FlaskConical size={16} />
          <span>Proyecto 2 del PETI · Demostración académica</span>
        </div>
        <div className="orb orb-one" />
        <div className="orb orb-two" />
      </section>
      <section className="login-form-side">
        <div className="login-form-wrap">
          <span className="login-version">
            SIGESHRL / ACCESO DEL PERSONAL <span>01</span>
          </span>
          <div className="login-title">
            <span className="lock-symbol">
              <LockKeyhole size={24} />
            </span>
            <h2>Bienvenido a tu espacio</h2>
            <p>Elige un perfil para explorar la demostración.</p>
          </div>
          <div
            className="profile-grid"
            role="group"
            aria-label="Perfil de demostración"
          >
            {[
              "medico",
              "enfermeria",
              "admision",
              "supervision",
              "farmacia",
              "admin",
            ].map((role) => {
              const Icon = icons[role];
              return (
                <button
                  key={role}
                  type="button"
                  aria-pressed={profile === role}
                  className={
                    "profile-card " + (profile === role ? "selected" : "")
                  }
                  onClick={() => {
                    setProfile(role);
                    setUsername(role);
                    setPassword("Demo2026!");
                    setError("");
                  }}
                >
                  <Icon size={20} />
                  <span>{roleTitle(role)}</span>
                  {profile === role && <CheckCircle2 size={14} />}
                </button>
              );
            })}
          </div>
          <form onSubmit={submit}>
            <label className="field">
              Usuario institucional
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                maxLength={80}
              />
            </label>
            <label className="field">
              Contraseña
              <div className="password-input">
                <input
                  autoComplete="current-password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  maxLength={128}
                />
                <button
                  type="button"
                  aria-label={
                    show ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {error && <ErrorBox message={error} />}
            <button
              type="submit"
              className="button primary login-submit"
              disabled={busy}
            >
              {busy ? "Abriendo tu espacio…" : "Ingresar a la demostración"}
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="credentials-note">
            <FlaskConical size={17} />
            <p>
              <strong>Credenciales de prueba incluidas</strong>
              <span>
                Contraseña común: <b>Demo2026!</b>. El DNI no concede permisos
                de acceso.
              </span>
            </p>
          </div>
          <p className="login-disclaimer">
            Este prototipo utiliza información ficticia. No está conectado al
            hospital ni a RENIEC y no emite firmas digitales con validez legal.
          </p>
        </div>
      </section>
    </div>
  );
}
