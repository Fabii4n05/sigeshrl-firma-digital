import React, { useState } from "react";
import {
  CalendarDays,
  Clock3,
  Users,
  FilePenLine,
  ArrowRight,
  ScanLine,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  RefreshCw,
} from "lucide-react";
import type { PageProps } from "../App";
import { localDate, formatDate, post } from "../api";
import { useResource } from "../hooks";
import { Badge, Spinner, ErrorBox, Empty, Metric, Panel } from "../ui";
export function Agenda({ user, go, notify }: PageProps) {
  const [date, setDate] = useState(localDate()),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [busy, setBusy] = useState("");
  const { data, error, loading, reload } = useResource(
    "/appointments?date=" + date,
  );
  const rows = data?.appointments ?? [];
  const filtered = rows.filter(
    (a: any) =>
      (status === "all" || a.status === status) &&
      [a.patient_name, a.history, a.dni].some((s: string) =>
        s.toLowerCase().includes(search.toLowerCase()),
      ),
  );
  const pending = rows.filter(
    (a: any) => a.documents.total > a.documents.signed,
  ).length;
  async function open(a: any) {
    setBusy(a.id);
    try {
      if (user.role === "admision") {
        await post(`/appointments/${a.id}/confirm`);
        notify("Llegada del paciente confirmada.");
        reload();
      } else {
        const result = await post(`/appointments/${a.id}/open`);
        go("atencion/" + result.encounterId);
      }
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy("");
    }
  }
  function shift(n: number) {
    const d = new Date(date + "T12:00:00-05:00");
    d.setDate(d.getDate() + n);
    setDate(
      new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(d),
    );
  }
  return (
    <>
      <div className="agenda-hero">
        <div>
          <div className="hero-eyebrow">
            <span className="live-dot" />
            {user.service.toUpperCase()} <span>/</span>{" "}
            {user.role === "admision"
              ? "PROGRAMACIÓN"
              : user.role === "enfermeria"
                ? "ENFERMERÍA"
                : "MEDICINA INTERNA"}
          </div>
          <h1>Una nueva jornada de cuidado.</h1>
          <p>Tu agenda, tus pacientes y cada documento en su lugar.</p>
          <div className="hero-user">
            <span className="hero-avatar">
              {user.role === "medico"
                ? "LM"
                : user.role === "enfermeria"
                  ? "AT"
                  : "RR"}
            </span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.specialty} · Consultorio 04</small>
            </span>
          </div>
        </div>
        <div className="hero-date">
          <CalendarDays size={25} />
          <small>AGENDA DEL DÍA</small>
          <strong>
            {new Intl.DateTimeFormat("es-PE", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "America/Lima",
            }).format(new Date(date + "T12:00:00-05:00"))}
          </strong>
          <span>
            Turno de mañana <span>07:00 — 13:00</span>
          </span>
        </div>
        <svg
          className="hero-pattern"
          width="440"
          height="200"
          viewBox="0 0 440 200"
          aria-hidden="true"
        >
          <circle cx="300" cy="100" r="130" />
          <circle cx="300" cy="100" r="100" />
          <circle cx="300" cy="100" r="70" />
          <path d="M5 120h95l20-30 20 60 30-90 25 60h210" />
        </svg>
      </div>
      <div className="metrics">
        <Metric
          label="Citas del día"
          value={rows.length.toString().padStart(2, "0")}
          detail="Dentro de tu ámbito de acceso"
          icon={<CalendarDays size={19} />}
        />
        <Metric
          label="Por atender"
          value={rows
            .filter((a: any) => a.status === "programada")
            .length.toString()
            .padStart(2, "0")}
          detail="Pacientes en la agenda"
          icon={<Users size={19} />}
          color="blue"
        />
        <Metric
          label="Atenciones completadas"
          value={rows
            .filter((a: any) => a.status === "atendida")
            .length.toString()
            .padStart(2, "0")}
          detail="Estado asistencial"
          icon={<CheckCheck size={19} />}
          color="mint"
        />
        <Metric
          label="Con firma pendiente"
          value={pending.toString().padStart(2, "0")}
          detail="Estado documental independiente"
          icon={<FilePenLine size={19} />}
          color="amber"
        />
      </div>
      <Panel
        title="Agenda de citas"
        subtitle="Abre una cita para continuar con la atención vinculada."
        action={
          <button className="button secondary" onClick={() => go("dni")}>
            <ScanLine size={17} />
            Identificar por DNI
          </button>
        }
      >
        <div className="table-toolbar">
          <div className="date-control">
            <button
              className="icon-button"
              aria-label="Día anterior"
              onClick={() => shift(-1)}
            >
              <ChevronLeft size={17} />
            </button>
            <label>
              <span className="sr-only">Fecha de agenda</span>
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
              />
            </label>
            <button
              className="icon-button"
              aria-label="Día siguiente"
              onClick={() => shift(1)}
            >
              <ChevronRight size={17} />
            </button>
            <button
              className="text-button"
              onClick={() => setDate(localDate())}
            >
              Hoy
            </button>
          </div>
          <div className="filter-group">
            <label className="search-input">
              <Search size={16} />
              <input
                placeholder="Paciente, historia o DNI"
                aria-label="Buscar paciente"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label className="select-wrap">
              <SlidersHorizontal size={15} />
              <select
                aria-label="Filtrar estado de atención"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">Todos los estados</option>
                <option value="programada">Programadas</option>
                <option value="en_atencion">En atención</option>
                <option value="atendida">Atendidas</option>
              </select>
            </label>
            <button
              className="icon-button"
              onClick={reload}
              aria-label="Actualizar agenda"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorBox message={error} retry={reload} />
        ) : !filtered.length ? (
          <Empty
            title="Sin citas para esta búsqueda"
            message="Prueba otra fecha o modifica los filtros."
          />
        ) : (
          <div className="table-scroll">
            <table className="agenda-table">
              <thead>
                <tr>
                  <th>HORA</th>
                  <th>PACIENTE / HISTORIA CLÍNICA</th>
                  <th>TIPO DE CITA</th>
                  <th>ATENCIÓN</th>
                  <th>DOCUMENTOS</th>
                  <th className="align-right">ACCIÓN</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a: any) => (
                  <tr
                    key={a.id}
                    className={
                      a.patient_name === "Paciente 014" ? "demo-row" : ""
                    }
                  >
                    <td>
                      <div className="appointment-time">
                        {a.time}
                        <small>
                          <Clock3 size={11} />
                          30 min
                        </small>
                      </div>
                    </td>
                    <td>
                      <div className="patient-cell">
                        <div
                          className={
                            "avatar " +
                            (a.patient_name === "Paciente 014" ? "mint" : "")
                          }
                        >
                          {a.patient_name.replace("Paciente ", "")}
                        </div>
                        <div>
                          <strong>
                            {a.patient_name}
                            {a.patient_name === "Paciente 014" && (
                              <span className="case-label">CASO GUÍA</span>
                            )}
                          </strong>
                          <small>
                            {a.history} <span>·</span> DNI {a.dni}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {a.type}
                      <small className="cell-subtitle">{a.specialty}</small>
                    </td>
                    <td>
                      <Badge status={a.status} />
                    </td>
                    <td>
                      {!a.documents.total ? (
                        <span className="muted">Sin documentos</span>
                      ) : a.documents.total === a.documents.signed ? (
                        <span className="document-state complete">
                          <CheckCheck size={15} />
                          Completos en demo
                        </span>
                      ) : (
                        <span className="document-state pending">
                          <FilePenLine size={15} />
                          {a.documents.total - a.documents.signed} pendiente
                          {a.documents.total - a.documents.signed !== 1
                            ? "s"
                            : ""}
                        </span>
                      )}
                    </td>
                    <td className="align-right">
                      <button
                        className={
                          "button compact " +
                          (a.patient_name === "Paciente 014"
                            ? "primary"
                            : "ghost")
                        }
                        disabled={!!busy}
                        onClick={() => open(a)}
                      >
                        {busy === a.id
                          ? "Abriendo…"
                          : user.role === "admision"
                            ? "Confirmar llegada"
                            : "Abrir atención"}
                        <ArrowRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-foot">
          <span>
            {filtered.length} cita{filtered.length !== 1 ? "s" : ""}{" "}
            <span>·</span> {formatDate(date)}
          </span>
          <span className="scope-label">
            <span className="online-dot" /> Solo registros autorizados para tu
            perfil
          </span>
        </div>
      </Panel>
      <div className="agenda-bottom">
        <div>
          <ShieldMini />
          <p>
            <strong>La atención y la firma tienen estados diferentes.</strong>
            <span>
              Una consulta atendida puede conservar una nota o receta pendiente
              de firma.
            </span>
          </p>
        </div>
        <button className="text-button" onClick={() => go("guia")}>
          Conocer el recorrido <ArrowRight size={15} />
        </button>
      </div>
    </>
  );
}
function ShieldMini() {
  return (
    <div className="info-symbol">
      <FilePenLine size={21} />
    </div>
  );
}
