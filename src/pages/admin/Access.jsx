import { useState, useEffect } from "react";
import {
  ChartNoAxesCombined,
  CheckCheck,
  Clock3,
  ArrowRight,
  ArrowUpRight,
  FileText,
  ShieldCheck,
  CalendarDays,
  Pill,
  Search,
  PackageCheck,
  RefreshCw,
  Download,
  UsersRound,
  LockKeyhole,
  Activity,
  ScanLine,
  FilePenLine,
  BookOpen,
  Info,
  CheckCircle2,
  FlaskConical,
  Server,
  GitBranch,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  UserRound,
  KeyRound,
  Check,
  Logs,
} from "lucide-react";
import { useResource } from "../../lib/hooks";
import {
  request,
  post,
  localDate,
  formatDate,
  docTitle,
  roleTitle,
  downloadJSON,
} from "../../lib/api";
import {
  PageHeading,
  Panel,
  Metric,
  Badge,
  Empty,
  Spinner,
  ErrorBox,
  Modal,
} from "../../components/shared/UI";

export function Access({ user, notify }) {
  const resource = useResource("/admin/users");
  const [editing, setEditing] = useState(null),
    [enabled, setEnabled] = useState(true),
    [detail, setDetail] = useState(false),
    [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await request("/admin/users/" + editing.id, {
        method: "PATCH",
        body: JSON.stringify({ enabled, detailPermission: detail }),
      });
      notify("Permisos actualizados. Las sesiones de esa cuenta se cerraron.");
      setEditing(null);
      resource.reload();
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRACIÓN DE ACCESOS"
        title="El permiso correcto, para cada función."
        description="Gestiona la habilitación y el permiso adicional de revisión documental de las cuentas de prueba."
      />
      <div className="access-notice">
        <KeyRound size={24} />
        <div>
          <strong>
            La identificación y la autorización cumplen funciones diferentes.
          </strong>
          <p>
            Leer o escribir un DNI no habilita módulos. El servidor verifica la
            cuenta, el perfil, el servicio y la relación con el registro en cada
            operación.
          </p>
        </div>
      </div>
      <Panel
        title="Personal de demostración"
        subtitle="Estas cuentas son ficticias. Administración no tiene acceso automático a registros clínicos."
      >
        {resource.loading ? (
          <Spinner />
        ) : resource.error ? (
          <ErrorBox message={resource.error} retry={resource.reload} />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>PERSONAL / USUARIO</th>
                  <th>PERFIL</th>
                  <th>ÁMBITO</th>
                  <th>CUENTA</th>
                  <th>DETALLE DE COBERTURA</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {resource.data?.users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                      <small className="cell-subtitle">{u.username}</small>
                    </td>
                    <td>{roleTitle(u.role)}</td>
                    <td>{u.service}</td>
                    <td>
                      <Badge status={u.enabled ? "signed" : "pending"}>
                        {u.enabled ? "Habilitada" : "Deshabilitada"}
                      </Badge>
                    </td>
                    <td>
                      {u.role === "supervision"
                        ? u.detail_permission
                          ? "Autorizado"
                          : "Sin permiso"
                        : "No aplica"}
                    </td>
                    <td className="align-right">
                      <button
                        className="button secondary compact"
                        disabled={u.id === user.id}
                        onClick={() => {
                          setEditing(u);
                          setEnabled(!!u.enabled);
                          setDetail(!!u.detail_permission);
                        }}
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <div className="access-matrix">
        <div>
          <ShieldCheck size={21} />
          <h3>Permisos en el servidor</h3>
          <p>
            Las solicitudes directas fuera del ámbito reciben un rechazo.
            Ocultar un botón no es la barrera de seguridad.
          </p>
        </div>
        <div>
          <Clock3 size={21} />
          <h3>Sesión con vencimiento</h3>
          <p>
            Treinta minutos sin actividad de servidor y un máximo de ocho horas
            por sesión. Cierre manual disponible.
          </p>
        </div>
        <div>
          <Logs size={21} />
          <h3>Cambios trazables</h3>
          <p>
            La habilitación de cuentas y la modificación de permisos se
            registran con el administrador responsable.
          </p>
        </div>
      </div>
      {editing && (
        <Modal
          title="Gestionar cuenta de demostración"
          onClose={() => {
            if (!busy) setEditing(null);
          }}
        >
          <div className="confirm-document">
            <div className="avatar mint large">
              <UserRound size={24} />
            </div>
            <div>
              <h3>{editing.name}</h3>
              <p>
                {roleTitle(editing.role)} · {editing.service}
              </p>
            </div>
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            <span>Cuenta habilitada para iniciar sesión</span>
          </label>
          {editing.role === "supervision" && (
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={detail}
                onChange={(e) => setDetail(e.target.checked)}
              />
              <span>
                Permitir el detalle de historias y documentos en Supervisión
              </span>
            </label>
          )}
          <p className="small-note">
            Guardar cerrará las sesiones de esta cuenta para aplicar los
            permisos.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
            <button className="button primary" disabled={busy} onClick={save}>
              Guardar permisos
              <Check size={16} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
