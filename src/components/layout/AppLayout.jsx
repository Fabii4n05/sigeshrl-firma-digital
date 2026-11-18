import { useState, useEffect } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router";
import {
  CalendarDays,
  ScanLine,
  Activity,
  FilePenLine,
  ChartNoAxesCombined,
  Pill,
  Logs,
  UsersRound,
  BookOpen,
  FlaskConical,
  ArrowRight,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  Smartphone,
} from "lucide-react";
import Brand from "../shared/BrandLogo";
import { roleTitle } from "../../lib/api";
const menu = [
  {
    path: "/agenda",
    label: "Agenda de citas",
    icon: CalendarDays,
    roles: ["medico", "enfermeria", "admision"],
  },
  {
    path: "/dni",
    label: "Escáner de DNI",
    icon: ScanLine,
    roles: ["medico", "enfermeria", "admision"],
  },
  {
    path: "/atencion",
    label: "Atención clínica",
    icon: Activity,
    roles: ["medico", "enfermeria"],
  },
  {
    path: "/firmas",
    label: "Documentos y firma",
    icon: FilePenLine,
    roles: ["medico", "enfermeria"],
  },
  {
    path: "/cobertura",
    label: "Cobertura de firma",
    icon: ChartNoAxesCombined,
    roles: ["supervision"],
  },
  { path: "/farmacia", label: "Farmacia", icon: Pill, roles: ["farmacia"] },
  {
    path: "/auditoria",
    label: "Bitácora",
    icon: Logs,
    roles: ["admin", "supervision"],
  },
  {
    path: "/accesos",
    label: "Cuentas de prueba",
    icon: UsersRound,
    roles: ["admin"],
  },
];
export default function AppLayout({
  user,
  onProfileChange,
  onLogout,
  switching,
}) {
  const [mobile, setMobile] = useState(false),
    [theme, setTheme] = useState(
      localStorage.getItem("sigeshrl-theme") ?? "light",
    );
  const location = useLocation();
  useEffect(() => setMobile(false), [location.pathname]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("sigeshrl-theme", theme);
  }, [theme]);
  return (
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
          <span>Avance académico · PETI 02</span>
        </div>
        <div className="nav-section-label">ESPACIO DE TRABAJO</div>
        <nav aria-label="Navegación principal">
          {menu
            .filter((m) => m.roles.includes(user.role))
            .map((m) => (
              <NavLink
                key={m.path}
                to={m.path}
                className={({ isActive }) =>
                  "nav-item " + (isActive ? "active" : "")
                }
              >
                <m.icon size={19} />
                <span>{m.label}</span>
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-card">
            <Smartphone size={21} />
            <strong>Escanear y revisar</strong>
            <p>
              Identifica el DNI y continúa con los documentos de la atención.
            </p>
            <Link to="/guia">
              Ver el recorrido
              <ArrowRight size={14} />
            </Link>
          </div>
          <NavLink
            to="/guia"
            className={({ isActive }) =>
              "nav-item " + (isActive ? "active" : "")
            }
          >
            <BookOpen size={18} />
            <span>Guía del avance</span>
          </NavLink>
          <div className="sidebar-foot">
            <span className="online-dot" />
            React + Vite <small>v2.0</small>
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
              SIGESHRL <span>/</span>
              <strong>
                {menu.find((m) => location.pathname.startsWith(m.path))
                  ?.label ?? "Guía del avance"}
              </strong>
            </span>
          </div>
          <div className="topbar-actions">
            <span className="academic-tag">
              <FlaskConical size={13} />
              Avance académico
            </span>
            <button
              className="icon-button"
              onClick={() =>
                setTheme((t) => (t === "light" ? "dark" : "light"))
              }
              aria-label={
                theme === "light" ? "Activar modo oscuro" : "Activar modo claro"
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
                onChange={(e) => onProfileChange(e.target.value)}
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
                  <option value="medico-otro">Médico de otro servicio</option>
                )}
              </select>
              <small>{user.name}</small>
            </div>
            <button
              className="icon-button logout"
              onClick={onLogout}
              aria-label="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <div className="demo-strip">
          <ShieldCheck size={14} />
          <span>
            Datos clínicos ficticios. La lectura del documento y la firma del
            chip son operaciones diferentes.
          </span>
        </div>
        <main id="main-content">
          <Outlet />
        </main>
        <footer className="workspace-footer">
          <span>SIGESHRL · Hospital Regional Lambayeque</span>
          <span>Avance académico · React y Vite</span>
        </footer>
      </div>
    </div>
  );
}
