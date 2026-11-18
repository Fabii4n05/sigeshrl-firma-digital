import { useState } from "react";
import {
  Activity,
  HeartPulse,
  CalendarDays,
  ChartNoAxesCombined,
  Pill,
  UsersRound,
  FilePenLine,
  FlaskConical,
  LockKeyhole,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import Brand from "../../components/shared/BrandLogo";
import { post, roleTitle } from "../../lib/api";
import { ErrorBox } from "../../components/shared/UI";
export default function Login({ onLogin }) {
  const [profile, setProfile] = useState("medico"),
    [username, setUsername] = useState("medico"),
    [password, setPassword] = useState("Demo2026!"),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await post("/auth/login", { username, password });
      onLogin(result.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const icons = {
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
