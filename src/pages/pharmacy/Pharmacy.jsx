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

export function Pharmacy({ user, notify }) {
  const [from, setFrom] = useState(initialFrom()),
    [to, setTo] = useState(localDate()),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [page, setPage] = useState(0),
    [preview, setPreview] = useState(""),
    [dispense, setDispense] = useState(null),
    [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false);
  const resource = useResource(`/pharmacy?from=${from}&to=${to}`);
  const all = resource.data?.prescriptions ?? [];
  const rows = all.filter(
    (d) =>
      (filter === "all" || d.state === filter) &&
      [d.patient_name, d.history, d.dni].some((s) =>
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
      notify(e.message, true);
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
          value={all.filter((d) => d.state === "espera").length}
          detail="Entrega bloqueada hasta pasar la simulación"
          icon={<Clock3 size={19} />}
          color="amber"
        />
        <Metric
          label="Listas para dispensar"
          value={all.filter((d) => d.state === "lista").length}
          detail="Con firma simulada e integridad verificable"
          icon={<ShieldCheck size={19} />}
        />
        <Metric
          label="Dispensadas"
          value={all.filter((d) => d.state === "dispensada").length}
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
                  {rows.slice(page * 10, page * 10 + 10).map((d) => (
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
            {dispense.items.map((item, i) => (
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
