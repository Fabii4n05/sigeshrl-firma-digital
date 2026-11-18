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
import { Period, initialFrom } from "../../components/shared/PeriodFilter";
import { Pagination } from "../../components/shared/Pagination";
import { DocumentModal } from "../../components/shared/DocumentModal";

export function Coverage({ go, notify }) {
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
  const evaluated = services.reduce((n, s) => n + s.evaluated, 0),
    complete = services.reduce((n, s) => n + s.complete, 0);
  const rows = (detail.data?.documents ?? []).filter(
    (d) =>
      (filter === "all" || d.status === filter) &&
      [d.patient_name, d.history, d.author_name].some((s) =>
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
          {services.map((s, i) => (
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
                      {rows.slice(page * 10, page * 10 + 10).map((d) => (
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
