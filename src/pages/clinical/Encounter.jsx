import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Save,
  FilePenLine,
  CheckCheck,
  FileText,
  Pill,
  Plus,
  Trash2,
  ChevronRight,
  LockKeyhole,
  UserRound,
  Clock3,
  GitBranch,
  History,
  Stethoscope,
} from "lucide-react";
import { request, post, formatDate, docTitle } from "../../lib/api.js";
import { useResource } from "../../lib/hooks.js";
import {
  PageHeading,
  Panel,
  Spinner,
  ErrorBox,
  Empty,
  Badge,
} from "../../components/shared/UI.jsx";
const emptyItem = () => ({
  name: "",
  dose: "",
  frequency: "",
  duration: "",
  quantity: 1,
});
export function Encounter({ user, go, notify, id }) {
  const { data, error, loading, reload } = useResource(
    id ? "/encounters/" + id : null,
  );
  const [form, setForm] = useState({
      reason: "",
      diagnosis: "",
      evolution: "",
      nursing: "",
      prescription: [],
    }),
    [busy, setBusy] = useState(false),
    [newVersion, setNewVersion] = useState(false),
    [dirty, setDirty] = useState(false),
    [history, setHistory] = useState(false);
  const e = data?.encounter,
    docs = data?.documents ?? [];
  const signed = docs.some((d) => d.is_current && d.status === "signed");
  const locked = signed && !newVersion;
  useEffect(() => {
    if (e) {
      setForm({
        reason: e.reason ?? "",
        diagnosis: e.diagnosis ?? "",
        evolution: e.evolution ?? "",
        nursing: e.nursing ?? "",
        prescription: e.prescription ?? [],
      });
      setDirty(false);
      setNewVersion(false);
    }
  }, [e]);
  useEffect(() => {
    const warn = (event) => {
      if (dirty) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  }
  async function save() {
    setBusy(true);
    try {
      await request("/encounters/" + id, {
        method: "PUT",
        body: JSON.stringify({ ...form, version: e.version, newVersion }),
      });
      notify(
        "Registro guardado y documentos vinculados. Las firmas quedan pendientes.",
      );
      setDirty(false);
      reload();
      return true;
    } catch (e) {
      notify(e.message, true);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function finish() {
    if (dirty) {
      notify("Guarda los cambios antes de finalizar la atención.", true);
      return;
    }
    setBusy(true);
    try {
      await post("/encounters/" + id + "/finish");
      notify(
        "Atención finalizada. El estado de firma se conserva por separado.",
      );
      reload();
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  function setItem(index, key, value) {
    update(
      "prescription",
      form.prescription.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    );
  }
  if (!id)
    return (
      <>
        <PageHeading
          eyebrow="CONSULTA EXTERNA"
          title="Atención clínica"
          description="Primero selecciona una cita de tu agenda para conservar su vínculo con la historia clínica."
        />
        <Empty
          title="Abre una atención desde la agenda"
          message="Cada registro pertenece a una cita, una historia y un profesional responsable."
        >
          <button className="button primary" onClick={() => go("agenda")}>
            Ir a mi agenda
            <ChevronRight size={16} />
          </button>
        </Empty>
      </>
    );
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} retry={reload} />;
  if (!e) return null;
  return (
    <>
      <button className="back-link" onClick={() => go("agenda")}>
        <ArrowLeft size={15} />
        Volver a la agenda
      </button>
      <PageHeading
        eyebrow={e.service.toUpperCase() + " / " + user.specialty.toUpperCase()}
        title={
          user.role === "enfermeria"
            ? "Registro de enfermería"
            : "Atención clínica"
        }
        description="Registra, revisa y conserva cada documento de esta atención."
        action={<Badge status={e.appointment_status} />}
      />
      <div className="patient-banner">
        <div className="avatar mint large">
          <UserRound size={27} />
        </div>
        <div className="patient-banner-main">
          <span>PACIENTE DE DEMOSTRACIÓN</span>
          <h2>{e.patient_name}</h2>
          <p>
            {e.history} <b>·</b> DNI {e.dni}
          </p>
        </div>
        <dl>
          <div>
            <dt>Fecha de atención</dt>
            <dd>{formatDate(e.date)}</dd>
          </div>
          <div>
            <dt>Edad / sexo registrado</dt>
            <dd>
              {Math.floor(
                (new Date(e.date).getTime() -
                  new Date(e.birth_date).getTime()) /
                  31557600000,
              )}{" "}
              años / {e.sex === "M" ? "Masculino" : "Femenino"}
            </dd>
          </div>
          <div>
            <dt>Alergias</dt>
            <dd>{e.allergies}</dd>
          </div>
        </dl>
      </div>
      <div className="clinical-layout">
        <div className="clinical-main">
          <Panel
            title={
              user.role === "enfermeria"
                ? "Cuidados y observaciones"
                : "Registro del episodio"
            }
            subtitle="Los campos pertenecen a esta atención. Los cambios se guardan con autor, fecha y versión."
            action={
              <span className="version-chip">
                Versión de atención {e.version}
              </span>
            }
          >
            {locked && (
              <div className="locked-banner">
                <LockKeyhole size={19} />
                <p>
                  <strong>El original firmado se conserva.</strong>
                  <span>
                    Para corregir el registro, crea una nueva versión. La
                    versión anterior seguirá disponible.
                  </span>
                </p>
                <button
                  className="button secondary compact"
                  onClick={() => {
                    setNewVersion(true);
                    notify(
                      "Puedes editar la nueva versión. Se publicará al guardar.",
                    );
                  }}
                >
                  <GitBranch size={15} />
                  Crear nueva versión
                </button>
              </div>
            )}
            {newVersion && (
              <div className="inline-note">
                <GitBranch size={16} />
                Editando una nueva versión. Sus documentos necesitarán nuevas
                firmas.
              </div>
            )}
            <form
              className="clinical-form"
              onSubmit={(ev) => {
                ev.preventDefault();
                void save();
              }}
            >
              {user.role === "enfermeria" ? (
                <label className="field">
                  Registro de enfermería
                  <textarea
                    rows={9}
                    value={form.nursing}
                    maxLength={8000}
                    required
                    disabled={locked}
                    onChange={(ev) => update("nursing", ev.target.value)}
                    placeholder="Registra los cuidados y observaciones de demostración."
                  />
                </label>
              ) : (
                <>
                  <label className="field">
                    Motivo de consulta
                    <textarea
                      rows={2}
                      value={form.reason}
                      maxLength={4000}
                      required
                      disabled={locked}
                      onChange={(ev) => update("reason", ev.target.value)}
                      placeholder="Describe el motivo de esta atención."
                    />
                  </label>
                  <label className="field">
                    Diagnóstico
                    <input
                      value={form.diagnosis}
                      maxLength={2000}
                      required
                      disabled={locked}
                      onChange={(ev) => update("diagnosis", ev.target.value)}
                      placeholder="Diagnóstico de demostración y código, si corresponde."
                    />
                  </label>
                  <label className="field">
                    Evolución clínica
                    <textarea
                      rows={5}
                      value={form.evolution}
                      maxLength={8000}
                      required
                      disabled={locked}
                      onChange={(ev) => update("evolution", ev.target.value)}
                      placeholder="Registra los hallazgos y la evolución del caso ficticio."
                    />
                  </label>
                  <div className="prescription-heading">
                    <div>
                      <Pill size={18} />
                      <h3>Prescripción de demostración</h3>
                    </div>
                    <button
                      className="text-button"
                      type="button"
                      disabled={locked || form.prescription.length >= 20}
                      onClick={() =>
                        update("prescription", [
                          ...form.prescription,
                          emptyItem(),
                        ])
                      }
                    >
                      <Plus size={15} />
                      Agregar ítem
                    </button>
                  </div>
                  <p className="field-hint">
                    Utiliza nombres e indicaciones ficticias para la exposición.
                    No son instrucciones de tratamiento.
                  </p>
                  {form.prescription.length === 0 ? (
                    <div className="no-items">
                      No hay ítems prescritos. Se generará únicamente la nota
                      clínica.
                    </div>
                  ) : (
                    form.prescription.map((item, index) => (
                      <div className="prescription-item" key={index}>
                        <div className="item-number">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <div className="item-fields">
                          <label className="field">
                            Nombre del medicamento
                            <input
                              value={item.name}
                              maxLength={160}
                              required
                              disabled={locked}
                              onChange={(ev) =>
                                setItem(index, "name", ev.target.value)
                              }
                            />
                          </label>
                          <div className="form-grid three">
                            <label className="field">
                              Dosis / presentación
                              <input
                                value={item.dose}
                                maxLength={160}
                                required
                                disabled={locked}
                                onChange={(ev) =>
                                  setItem(index, "dose", ev.target.value)
                                }
                              />
                            </label>
                            <label className="field">
                              Frecuencia
                              <input
                                value={item.frequency}
                                maxLength={160}
                                required
                                disabled={locked}
                                onChange={(ev) =>
                                  setItem(index, "frequency", ev.target.value)
                                }
                              />
                            </label>
                            <label className="field">
                              Duración
                              <input
                                value={item.duration}
                                maxLength={160}
                                required
                                disabled={locked}
                                onChange={(ev) =>
                                  setItem(index, "duration", ev.target.value)
                                }
                              />
                            </label>
                          </div>
                          <label className="field quantity-field">
                            Cantidad
                            <input
                              type="number"
                              value={item.quantity}
                              min={1}
                              max={9999}
                              required
                              disabled={locked}
                              onChange={(ev) =>
                                setItem(
                                  index,
                                  "quantity",
                                  Number(ev.target.value),
                                )
                              }
                            />
                          </label>
                        </div>
                        <button
                          className="icon-button"
                          type="button"
                          disabled={locked}
                          aria-label={"Quitar ítem " + (index + 1)}
                          onClick={() =>
                            update(
                              "prescription",
                              form.prescription.filter((_, i) => i !== index),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </>
              )}
              <div className="form-actions">
                <span className={dirty ? "unsaved" : "saved"}>
                  {dirty ? (
                    <>
                      <Clock3 size={14} />
                      Cambios sin guardar
                    </>
                  ) : (
                    <>
                      <CheckCheck size={14} />
                      Registro guardado
                    </>
                  )}
                </span>
                <button
                  type="submit"
                  className="button primary"
                  disabled={busy || locked || !dirty}
                >
                  <Save size={17} />
                  {busy ? "Guardando…" : "Guardar registro"}
                </button>
              </div>
            </form>
          </Panel>
        </div>
        <aside className="clinical-side">
          <Panel
            title="Documentos de la atención"
            subtitle="Revisa el contenido antes de simular la firma."
          >
            {!docs.filter((d) => d.is_current).length ? (
              <Empty
                title="Aún no hay documentos"
                message="Se crean cuando guardas el registro."
              />
            ) : (
              <div className="document-links">
                {docs
                  .filter((d) => d.is_current)
                  .map((d) => (
                    <button key={d.id} onClick={() => go("firmas/" + d.id)}>
                      <span className="doc-type-icon">
                        {d.type === "receta" ? (
                          <Pill size={20} />
                        ) : (
                          <FileText size={20} />
                        )}
                      </span>
                      <span>
                        <strong>{docTitle(d.type)}</strong>
                        <small>Versión {d.version}</small>
                        <Badge status={d.status} />
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
              </div>
            )}
            <div className="panel-inner-footer">
              <button
                className="button primary full"
                disabled={!docs.some((d) => d.is_current) || dirty}
                onClick={() => go("firmas?atencion=" + id)}
              >
                <FilePenLine size={16} />
                Revisar documentos
                <ArrowLeft className="rotate" size={15} />
              </button>
            </div>
          </Panel>
          <div className="clinical-finish">
            <Stethoscope size={23} />
            <h3>Cerrar el episodio asistencial</h3>
            <p>
              Finalizar la atención no firma los documentos. Los pendientes
              seguirán en la bandeja.
            </p>
            <button
              className="button secondary full"
              disabled={
                busy ||
                e.appointment_status === "atendida" ||
                dirty ||
                user.role !== "medico"
              }
              onClick={finish}
            >
              <CheckCheck size={17} />
              {e.appointment_status === "atendida"
                ? "Atención finalizada"
                : "Finalizar atención"}
            </button>
          </div>
          <button
            className="history-toggle"
            onClick={() => setHistory(!history)}
          >
            <History size={17} />
            Historial de versiones<span>{docs.length}</span>
            <ChevronRight className={history ? "turn" : ""} size={15} />
          </button>
          {history && (
            <div className="version-history">
              {docs.map((d) => (
                <button key={d.id} onClick={() => go("firmas/" + d.id)}>
                  <strong>
                    {docTitle(d.type)} · v{d.version}
                  </strong>
                  <span>
                    {d.is_current ? "Vigente" : "Conservada"} ·{" "}
                    {d.status === "signed" ? "Firma simulada" : "Pendiente"}
                  </span>
                </button>
              ))}
            </div>
          )}
          <p className="small-note">
            Último guardado: {formatDate(e.updated_at, true)}.<br />
            Solo se muestran las secciones autorizadas para tu perfil.
          </p>
        </aside>
      </div>
    </>
  );
}
