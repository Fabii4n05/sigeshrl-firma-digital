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
import { Pagination } from "../../components/shared/Pagination";

export function Audit({ notify }) {
  const { data, error, loading, reload } = useResource("/audit?limit=200");
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
  const rows = (data?.events ?? []).filter((event) =>
    [event.user_name, event.action, event.record_id ?? "", event.result].some(
      (s) => s.toLowerCase().includes(search.toLowerCase()),
    ),
  );
  useEffect(() => setPage(0), [search]);
  function exportEvents() {
    downloadJSON(
      { scope: "Bitácora académica", events: rows },
      "Bitacora-SIGESHRL.json",
    );
    notify("Bitácora autorizada exportada.");
  }
  return (
    <>
      <PageHeading
        eyebrow="TRAZABILIDAD"
        title="Cada paso deja una huella."
        description="Consulta quién realizó una operación, cuándo ocurrió y cuál fue su resultado."
        action={
          <button
            className="button secondary"
            disabled={!data}
            onClick={exportEvents}
          >
            <Download size={16} />
            Exportar bitácora
          </button>
        }
      />
      <Panel
        title="Actividad del sistema"
        subtitle="La aplicación solo permite agregar eventos; no ofrece acciones para editarlos o borrarlos."
        action={
          <button
            className="icon-button"
            aria-label="Actualizar bitácora"
            onClick={reload}
          >
            <RefreshCw size={17} />
          </button>
        }
      >
        <div className="table-toolbar">
          <label className="search-input wide-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar evento"
              placeholder="Usuario, operación, registro o resultado"
            />
          </label>
          <span className="muted">Últimos 200 eventos autorizados</span>
        </div>
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorBox message={error} retry={reload} />
        ) : !rows.length ? (
          <Empty title="Aún no hay eventos para mostrar" />
        ) : (
          <>
            <div className="table-scroll">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>FECHA Y HORA</th>
                    <th>USUARIO</th>
                    <th>OPERACIÓN / REGISTRO</th>
                    <th>RESULTADO</th>
                    <th>DETALLE</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(page * 10, page * 10 + 10).map((event) => (
                    <tr key={event.id}>
                      <td>{formatDate(event.created_at, true)}</td>
                      <td>
                        <strong>{event.user_name}</strong>
                      </td>
                      <td>
                        <span className="event-name">
                          {event.action.replaceAll("_", " ").toLowerCase()}
                        </span>
                        <small className="cell-subtitle mono">
                          {event.record_id ?? "—"}
                        </small>
                      </td>
                      <td>
                        <span
                          className={
                            "badge " +
                            (/RECHAZADO|NO_|NO DISPONIBLE/.test(event.result)
                              ? "pending"
                              : "neutral")
                          }
                        >
                          {event.result.replaceAll("_", " ").toLowerCase()}
                        </span>
                      </td>
                      <td className="audit-detail">{event.detail || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...{ page, setPage, total: rows.length }} />
          </>
        )}
      </Panel>
      <p className="small-note">
        La bitácora de esta demostración se almacena junto con los registros. La
        protección institucional contra alteraciones y la política de
        conservación requieren infraestructura y controles de la DITI.
      </p>
    </>
  );
}
