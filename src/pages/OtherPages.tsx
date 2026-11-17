import React, { useState, useEffect } from "react";
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
import type { PageProps } from "../App";
import { useResource } from "../hooks";
import {
  request,
  post,
  localDate,
  formatDate,
  docTitle,
  roleTitle,
  downloadJSON,
} from "../api";
import {
  PageHeading,
  Panel,
  Metric,
  Badge,
  Empty,
  Spinner,
  ErrorBox,
  Modal,
} from "../ui";
import { DocumentPreview } from "./Signatures";
import { exportPDF } from "../pdf";
const initialFrom = () => localDate().slice(0, 7) + "-01";
function Period({
  from,
  to,
  setFrom,
  setTo,
}: {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
}) {
  return (
    <div className="period-filter">
      <CalendarDays size={16} />
      <label>
        <span>Desde</span>
        <input
          type="date"
          aria-label="Fecha inicial del periodo"
          value={from}
          onChange={(e) => e.target.value && setFrom(e.target.value)}
        />
      </label>
      <span className="period-dash">—</span>
      <label>
        <span>Hasta</span>
        <input
          type="date"
          aria-label="Fecha final del periodo"
          value={to}
          onChange={(e) => e.target.value && setTo(e.target.value)}
        />
      </label>
    </div>
  );
}
export function Coverage({ go, notify }: PageProps) {
  const [from, setFrom] = useState(initialFrom()),
    [to, setTo] = useState(localDate()),
    [service, setService] = useState("Consulta Externa"),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [page, setPage] = useState(0),
    [preview, setPreview] = useState("");
  const params = `?from=${from}&to=${to}`;
  const report = useResource("/coverage" + params);
  const detail = useResource(
    report.data?.detailPermission
      ? "/coverage/detail" + params + "&service=" + encodeURIComponent(service)
      : null,
  );
  const services = report.data?.services ?? [];
  const evaluated = services.reduce((n: number, s: any) => n + s.evaluated, 0),
    complete = services.reduce((n: number, s: any) => n + s.complete, 0);
  const rows = (detail.data?.documents ?? []).filter(
    (d: any) =>
      (filter === "all" || d.status === filter) &&
      [d.patient_name, d.history, d.author_name].some((s: string) =>
        s.toLowerCase().includes(search.toLowerCase()),
      ),
  );
  useEffect(() => setPage(0), [search, filter, service, from, to]);
  function exportReport() {
    downloadJSON(
      { scope: "Demostración académica con datos ficticios", ...report.data },
      `Cobertura-SIGESHRL-${from}-${to}.json`,
    );
    notify("Reporte de demostración exportado.");
  }
  return (
    <>
      <PageHeading
        eyebrow="SUPERVISIÓN CLÍNICA"
        title="Una vista clara de lo que falta."
        description="Identifica las historias completas y los documentos pendientes de cada servicio."
        action={
          <button
            className="button secondary"
            disabled={!report.data}
            onClick={exportReport}
          >
            <Download size={16} />
            Exportar resumen
          </button>
        }
      />
      <div className="report-toolbar">
        <Period {...{ from, to, setFrom, setTo }} />
        <span className="fiction-label">
          <FlaskConical size={14} />
          Todas las cifras son ficticias
        </span>
        <button
          className="icon-button"
          aria-label="Actualizar cobertura"
          onClick={() => {
            report.reload();
            detail.reload();
          }}
        >
          <RefreshCw size={16} />
        </button>
      </div>
      <div className="metrics three">
        <Metric
          label="Historias evaluadas"
          value={evaluated}
          detail="Historias únicas por servicio y periodo"
          icon={<FileText size={19} />}
        />
        <Metric
          label="Historias completas"
          value={complete}
          detail="Todos los documentos vigentes con firma simulada"
          icon={<CheckCheck size={19} />}
        />
        <Metric
          label="Historias pendientes"
          value={evaluated - complete}
          detail="Al menos un documento por completar"
          icon={<Clock3 size={19} />}
          color="amber"
        />
      </div>
      {report.loading ? (
        <Spinner />
      ) : report.error ? (
        <ErrorBox message={report.error} retry={report.reload} />
      ) : (
        <div className="service-grid">
          {services.map((s: any, i: number) => (
            <button
              className={
                "service-card " + (service === s.service ? "selected" : "")
              }
              key={s.service}
              onClick={() => setService(s.service)}
            >
              <div className="service-card-top">
                <span className={"service-icon service-" + i}>
                  {i === 0 ? (
                    <Activity size={21} />
                  ) : i === 1 ? (
                    <FileText size={21} />
                  ) : (
                    <Pill size={21} />
                  )}
                </span>
                <ArrowUpRight size={18} />
              </div>
              <h2>{s.service}</h2>
              <div className="service-percentage">
                {s.percentage === null
                  ? "—"
                  : s.percentage.toLocaleString("es-PE") + "%"}
                <span>
                  {s.percentage === null
                    ? "Sin casos evaluables"
                    : "de historias completas"}
                </span>
              </div>
              <div
                className="progress-track"
                aria-label={`Cobertura ${s.percentage ?? 0}%`}
              >
                <span style={{ width: (s.percentage ?? 0) + "%" }} />
              </div>
              <div className="service-numbers">
                <span>
                  <b>{s.complete}</b> completas
                </span>
                <span>
                  <b>{s.pending}</b> pendientes
                </span>
                <span>
                  <b>{s.evaluated}</b> evaluadas
                </span>
              </div>
              <div className="service-card-bottom">
                {report.data?.detailPermission
                  ? "Revisar documentos"
                  : "Detalle requiere permiso"}
                <ArrowRight size={15} />
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="coverage-explanation">
        <Info size={18} />
        <p>
          <strong>¿Cómo se calcula?</strong> Historias completas ÷ historias
          evaluadas × 100. Una historia está completa cuando todos sus
          documentos obligatorios vigentes, en el servicio y periodo elegidos,
          tienen firma simulada registrada. Sin historias evaluables se muestra
          «—».
        </p>
      </div>
      {report.data && !report.data.detailPermission ? (
        <div className="permission-empty">
          <LockKeyhole size={23} />
          <h3>El resumen está disponible</h3>
          <p>
            La consulta de historias y documentos necesita un permiso adicional
            de Administración.
          </p>
        </div>
      ) : (
        report.data?.detailPermission && (
          <Panel
            title={"Detalle de " + service}
            subtitle="El permiso adicional de esta cuenta habilita la revisión documental."
          >
            <div className="table-toolbar">
              <label className="search-input">
                <Search size={16} />
                <input
                  value={search}
                  aria-label="Buscar historia en el reporte"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Paciente, historia o responsable"
                />
              </label>
              <label className="select-wrap">
                <select
                  aria-label="Estado de firma"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <option value="all">Todos los documentos</option>
                  <option value="pending">Pendientes</option>
                  <option value="signed">Firmados en demo</option>
                </select>
              </label>
            </div>
            {detail.loading ? (
              <Spinner />
            ) : detail.error ? (
              <ErrorBox message={detail.error} retry={detail.reload} />
            ) : !rows.length ? (
              <Empty
                title="Sin documentos en este periodo"
                message="Modifica el servicio, las fechas o el filtro."
              />
            ) : (
              <>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>PACIENTE / HISTORIA</th>
                        <th>DOCUMENTO</th>
                        <th>RESPONSABLE</th>
                        <th>FIRMA</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(page * 10, page * 10 + 10).map((d: any) => (
                        <tr key={d.id}>
                          <td>
                            <strong>{d.patient_name}</strong>
                            <small className="cell-subtitle">{d.history}</small>
                          </td>
                          <td>
                            {docTitle(d.type)}
                            <small className="cell-subtitle">
                              Versión {d.version}
                            </small>
                          </td>
                          <td>{d.author_name}</td>
                          <td>
                            <Badge status={d.status} />
                            <small className="cell-subtitle">
                              {d.signed_at
                                ? formatDate(d.signed_at, true)
                                : d.last_error
                                  ? "Último intento rechazado"
                                  : "Por completar"}
                            </small>
                          </td>
                          <td className="align-right">
                            <button
                              className="text-button"
                              onClick={() => setPreview(d.id)}
                            >
                              Ver documento
                              <ArrowUpRight size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination {...{ page, setPage, total: rows.length }} />
              </>
            )}
          </Panel>
        )
      )}
      <div className="baseline-note">
        <div>
          <span>LÍNEA BASE REFERIDA EN LA GUÍA</span>
          <strong>60%</strong>
          <small>Según entrevista · medición por confirmar con DITI</small>
        </div>
        <ArrowRight size={21} />
        <div>
          <span>META DEL PROYECTO</span>
          <strong>
            100% <small>para 2028</small>
          </strong>
          <small>
            Las cifras de esta demo no miden el avance real del hospital.
          </small>
        </div>
      </div>
      {preview && (
        <DocumentModal
          id={preview}
          onClose={() => setPreview("")}
          notify={notify}
        />
      )}
    </>
  );
}
function Pagination({
  page,
  setPage,
  total,
}: {
  page: number;
  setPage: (p: number) => void;
  total: number;
}) {
  return (
    <div className="table-foot">
      <span>
        {total} registros <span>·</span> Página {page + 1} de{" "}
        {Math.max(1, Math.ceil(total / 10))}
      </span>
      <div className="pagination">
        <button
          className="icon-button"
          aria-label="Página anterior"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Página siguiente"
          disabled={(page + 1) * 10 >= total}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}

export function Pharmacy({ user, notify }: PageProps) {
  const [from, setFrom] = useState(initialFrom()),
    [to, setTo] = useState(localDate()),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [page, setPage] = useState(0),
    [preview, setPreview] = useState(""),
    [dispense, setDispense] = useState<any>(null),
    [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false);
  const resource = useResource(`/pharmacy?from=${from}&to=${to}`);
  const all = resource.data?.prescriptions ?? [];
  const rows = all.filter(
    (d: any) =>
      (filter === "all" || d.state === filter) &&
      [d.patient_name, d.history, d.dni].some((s: string) =>
        s.toLowerCase().includes(search.toLowerCase()),
      ),
  );
  useEffect(() => setPage(0), [from, to, search, filter]);
  async function confirm() {
    setBusy(true);
    try {
      const result = await post("/pharmacy/" + dispense.id + "/dispense");
      notify(
        result.alreadyDispensed
          ? "La receta ya había sido dispensada. No se duplicó la entrega."
          : "Dispensación simulada registrada con fecha y usuario.",
      );
      setDispense(null);
      resource.reload();
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="FARMACIA AMBULATORIA"
        title="Una receta validada, una entrega trazable."
        description="Revisa la prescripción y registra la dispensación de los documentos habilitados en la demo."
        action={
          <span className="method-tag">
            <Pill size={17} />
            {user.service}
          </span>
        }
      />
      <div className="metrics three">
        <Metric
          label="En espera de firma"
          value={all.filter((d: any) => d.state === "espera").length}
          detail="Entrega bloqueada hasta pasar la simulación"
          icon={<Clock3 size={19} />}
          color="amber"
        />
        <Metric
          label="Listas para dispensar"
          value={all.filter((d: any) => d.state === "lista").length}
          detail="Con firma simulada e integridad verificable"
          icon={<ShieldCheck size={19} />}
        />
        <Metric
          label="Dispensadas"
          value={all.filter((d: any) => d.state === "dispensada").length}
          detail="Una entrega por versión de receta"
          icon={<PackageCheck size={19} />}
          color="blue"
        />
      </div>
      <Panel
        title="Recetas electrónicas"
        subtitle="Farmacia consulta la receta y sus ítems; no puede modificar la prescripción."
        action={
          <button
            className="icon-button"
            aria-label="Actualizar recetas"
            onClick={resource.reload}
          >
            <RefreshCw size={17} />
          </button>
        }
      >
        <div className="pharmacy-filters">
          <Period {...{ from, to, setFrom, setTo }} />
          <div className="filter-group">
            <label className="search-input">
              <Search size={16} />
              <input
                placeholder="Paciente, historia o DNI"
                aria-label="Buscar receta"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="select-wrap">
              <select
                aria-label="Estado de la receta"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Todos los estados</option>
                <option value="espera">En espera de firma</option>
                <option value="lista">Listas para dispensar</option>
                <option value="dispensada">Dispensadas</option>
              </select>
            </label>
          </div>
        </div>
        {resource.loading ? (
          <Spinner />
        ) : resource.error ? (
          <ErrorBox message={resource.error} retry={resource.reload} />
        ) : !rows.length ? (
          <Empty
            title="Sin recetas para esta búsqueda"
            message="Prueba otro periodo o cambia el filtro."
          />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>PACIENTE / HISTORIA</th>
                    <th>RECETA / FECHA</th>
                    <th>PRESCRIPTOR</th>
                    <th>ESTADO</th>
                    <th className="align-right">ACCIÓN</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(page * 10, page * 10 + 10).map((d: any) => (
                    <tr
                      key={d.id}
                      className={
                        d.patient_name === "Paciente 014" ? "demo-row" : ""
                      }
                    >
                      <td>
                        <div className="patient-cell">
                          <div className="avatar">
                            {d.patient_name.replace("Paciente ", "")}
                          </div>
                          <div>
                            <strong>
                              {d.patient_name}
                              {d.patient_name === "Paciente 014" && (
                                <span className="case-label">CASO GUÍA</span>
                              )}
                            </strong>
                            <small>{d.history}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <button
                          className="text-button"
                          onClick={() => setPreview(d.id)}
                        >
                          Receta · v{d.version}
                          <ArrowUpRight size={13} />
                        </button>
                        <small className="cell-subtitle">
                          {formatDate(d.date)} · {d.items.length} ítem
                          {d.items.length !== 1 ? "s" : ""}
                        </small>
                      </td>
                      <td>
                        {d.author_name}
                        <small className="cell-subtitle">{d.service}</small>
                      </td>
                      <td>
                        <Badge status={d.state} />
                        {d.dispensed_at && (
                          <small className="cell-subtitle">
                            {formatDate(d.dispensed_at, true)}
                          </small>
                        )}
                      </td>
                      <td className="align-right">
                        <button
                          className={
                            "button compact " +
                            (d.state === "lista" ? "primary" : "secondary")
                          }
                          disabled={d.state !== "lista"}
                          onClick={() => {
                            setDispense(d);
                            setChecked(false);
                          }}
                        >
                          {d.state === "dispensada" ? (
                            <>
                              <CheckCheck size={15} />
                              Registrada
                            </>
                          ) : d.state === "espera" ? (
                            <>
                              <LockKeyhole size={14} />
                              Bloqueada
                            </>
                          ) : (
                            <>
                              Dispensar en demo
                              <ArrowRight size={14} />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination {...{ page, setPage, total: rows.length }} />
          </>
        )}
      </Panel>
      <div className="plain-info">
        <Info size={18} />
        <p>
          <strong>La entrega depende de la receta vigente.</strong> El servidor
          comprueba la firma simulada y la huella del documento antes de
          registrar la dispensación. Un reintento no duplica la entrega. Los
          casos de contingencia deben seguir el procedimiento institucional que
          se apruebe.
        </p>
      </div>
      {preview && (
        <DocumentModal
          id={preview}
          onClose={() => setPreview("")}
          notify={notify}
        />
      )}
      {dispense && (
        <Modal
          title="Registrar dispensación simulada"
          onClose={() => {
            if (!busy) setDispense(null);
          }}
        >
          <div className="confirm-document">
            <span className="doc-type-icon">
              <Pill size={24} />
            </span>
            <div>
              <h3>{dispense.patient_name}</h3>
              <p>
                {dispense.history} · Receta v{dispense.version}
              </p>
            </div>
          </div>
          <div className="dispense-items">
            {dispense.items.map((item: any, i: number) => (
              <div key={i}>
                <span>{i + 1}</span>
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.dose}
                    <br />
                    {item.frequency} · {item.duration}
                  </p>
                </div>
                <b>
                  {item.quantity}
                  <small>unidades</small>
                </b>
              </div>
            ))}
          </div>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span>
              He revisado los ítems y deseo registrar esta entrega académica. No
              se moverá inventario real.
            </span>
          </label>
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setDispense(null)}
            >
              Cancelar
            </button>
            <button
              className="button primary"
              disabled={!checked || busy}
              onClick={confirm}
            >
              <PackageCheck size={17} />
              {busy ? "Registrando…" : "Confirmar dispensación"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function DocumentModal({
  id,
  onClose,
  notify,
}: {
  id: string;
  onClose: () => void;
  notify: PageProps["notify"];
}) {
  const { data, loading, error } = useResource("/documents/" + id);
  const [busy, setBusy] = useState(false);
  async function pdf() {
    setBusy(true);
    try {
      const data = await request("/documents/" + id + "/export");
      await exportPDF(data);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Revisión del documento" onClose={onClose} wide>
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} />
      ) : (
        data && (
          <>
            <DocumentPreview document={data.document} />
            <div className="modal-actions">
              <Badge status={data.document.status} />
              <button
                className="button secondary"
                disabled={busy}
                onClick={pdf}
              >
                <Download size={16} />
                Descargar PDF académico
              </button>
            </div>
          </>
        )
      )}
    </Modal>
  );
}

export function Audit({ notify }: PageProps) {
  const { data, error, loading, reload } = useResource("/audit?limit=200");
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
  const rows = (data?.events ?? []).filter((event: any) =>
    [event.user_name, event.action, event.record_id ?? "", event.result].some(
      (s: string) => s.toLowerCase().includes(search.toLowerCase()),
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
                  {rows.slice(page * 10, page * 10 + 10).map((event: any) => (
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
export function Access({ user, notify }: PageProps) {
  const resource = useResource("/admin/users");
  const [editing, setEditing] = useState<any>(null),
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
      notify((e as Error).message, true);
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
                {resource.data?.users.map((u: any) => (
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

export function Help({ go, user }: PageProps) {
  return (
    <>
      <PageHeading
        eyebrow="PROYECTO 2 DEL PETI / HRL"
        title="De la cita a una historia completa."
        description="Un prototipo académico basado en la guía de historia clínica electrónica y firma digital de SIGESHRL."
        action={
          <span className="method-tag">
            <BookOpen size={17} />
            Guía de demostración
          </span>
        }
      />
      <div className="help-intro">
        <div>
          <span className="eyebrow">UN SOLO RECORRIDO</span>
          <h2>
            Prueba el caso del
            <br />
            Paciente 014.
          </h2>
          <p>
            Su historia comienza con dos documentos pendientes. Completa la
            simulación, revisa el cambio en la cobertura y registra la entrega
            en Farmacia.
          </p>
          <span className="demo-dni">
            <ScanLine size={21} />
            DNI de prueba <strong>00000014</strong>
          </span>
        </div>
        <ol className="help-journey">
          <li>
            <span>01</span>
            <div>
              <strong>Identifica y abre la cita</strong>
              <p>
                Entra como Médico. Usa la muestra de DNI o busca al Paciente 014
                en la agenda.
              </p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <strong>Revisa y simula la firma</strong>
              <p>
                Abre sus documentos. Prueba primero un certificado rechazado y
                luego una simulación satisfactoria en ambos.
              </p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <strong>Observa la cobertura</strong>
              <p>
                Cambia a Supervisión. En el periodo que incluye los casos
                iniciales, Consulta Externa pasa de 17/20 a 18/20: del 85% al
                90%.
              </p>
            </div>
          </li>
          <li>
            <span>04</span>
            <div>
              <strong>Completa la dispensación</strong>
              <p>
                Cambia a Farmacia, revisa la receta del Paciente 014 y registra
                una entrega simulada.
              </p>
            </div>
          </li>
        </ol>
      </div>
      <div className="help-grid">
        <Panel
          title="Lo que puedes demostrar"
          subtitle="Operaciones implementadas con datos ficticios."
        >
          <ul className="feature-list">
            {[
              "Acceso con cuenta y permisos comprobados en el servidor.",
              "Agenda vinculada a la historia y al episodio de atención.",
              "Lectura óptica por cámara o imagen, con confirmación manual.",
              "Registro médico y registro de enfermería según el perfil.",
              "Documentos con autor, fecha y versiones conservadas.",
              "Firma simulada satisfactoria, rechazada o sin respuesta.",
              "Huella SHA-256, exportación JSON y PDF académico.",
              "Farmacia bloqueada mientras la receta no esté habilitada.",
              "Dispensación con control para evitar una entrega duplicada.",
              "Cobertura por periodo, detalle autorizado y bitácora.",
            ].map((s) => (
              <li key={s}>
                <CheckCircle2 size={16} />
                {s}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          title="Para pasar a un piloto institucional"
          subtitle="Estas integraciones requieren evaluación y acceso del hospital."
        >
          <ul className="pending-list">
            <li>
              <FilePenLine size={21} />
              <div>
                <strong>Firma digital real</strong>
                <p>
                  Integrar un firmador aprobado, certificado vigente y medio de
                  firma compatible. La demo no lee claves del DNI ni valida
                  certificados IOFE.
                </p>
              </div>
            </li>
            <li>
              <Server size={21} />
              <div>
                <strong>Intercambio SIGESHRL–SIHCE</strong>
                <p>
                  El paquete incluye el diseño de identificadores, mensajes,
                  errores y reintentos. La interfaz real debe ser confirmada por
                  DITI.
                </p>
              </div>
            </li>
            <li>
              <ShieldCheck size={21} />
              <div>
                <strong>Operación en el hospital</strong>
                <p>
                  Definir autenticación institucional, respaldo, custodia,
                  contingencias, carga, protección de datos y capacitación por
                  servicio.
                </p>
              </div>
            </li>
            <li>
              <GitBranch size={21} />
              <div>
                <strong>Medición y despliegue</strong>
                <p>
                  Confirmar la línea base del 60% antes de compararla con nuevos
                  porcentajes. Consulta Externa es el primer caso propuesto.
                </p>
              </div>
            </li>
          </ul>
        </Panel>
      </div>
      <Panel
        title="Lectura de DNI y NFC"
        subtitle="La alternativa funciona sin comprar un lector."
      >
        <div className="dni-comparison">
          <div>
            <span className="method-tag">
              <CameraIcon />
              Disponible ahora
            </span>
            <h3>Cámara o fotografía</h3>
            <p>
              Reconoce datos impresos con OCR, pide revisar los ocho dígitos y
              busca la cita en la base de prueba. No acredita la identidad ni la
              autenticidad del documento.
            </p>
          </div>
          <div>
            <span className="badge neutral">Integración pendiente</span>
            <h3>Chip, certificados y firma</h3>
            <p>
              Web NFC se limita a etiquetas NDEF; no expone las operaciones de
              bajo nivel del chip. El DNIe y la firma real necesitan un
              componente compatible. No se presenta una lectura NFC ficticia.
            </p>
          </div>
        </div>
        <div className="source-links">
          <a
            href="https://developer.chrome.com/docs/capabilities/nfc"
            target="_blank"
            rel="noreferrer"
          >
            Chrome · Alcance de Web NFC
            <ExternalLink size={14} />
          </a>
          <a
            href="https://identidad.reniec.gob.pe/es/dni-electronico"
            target="_blank"
            rel="noreferrer"
          >
            RENIEC · DNI electrónico
            <ExternalLink size={14} />
          </a>
          <a
            href="https://www.gob.pe/firmaperu"
            target="_blank"
            rel="noreferrer"
          >
            Plataforma Firma Perú
            <ExternalLink size={14} />
          </a>
        </div>
      </Panel>
      <div className="help-footer">
        <FlaskConical size={19} />
        <p>
          React y TypeScript para la interfaz; servidor con permisos y base de
          datos persistente. El paquete del proyecto incluye instrucciones,
          recorrido de exposición, pruebas y diseño de integración.
        </p>
      </div>
    </>
  );
}
function CameraIcon() {
  return <ScanLine size={15} />;
}
