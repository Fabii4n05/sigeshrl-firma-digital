import React, { useState, useEffect, useRef } from "react";
import {
  FilePenLine,
  FileText,
  Pill,
  ShieldCheck,
  Download,
  CheckCircle2,
  Search,
  ArrowRight,
  Clock3,
  AlertTriangle,
  Check,
  GitBranch,
  RefreshCw,
  Upload,
  Info,
  FileJson,
  LockKeyhole,
} from "lucide-react";
import type { PageProps } from "../App";
import { request, post, formatDate, docTitle, downloadJSON } from "../api";
import { useResource } from "../hooks";
import {
  PageHeading,
  Panel,
  Spinner,
  ErrorBox,
  Empty,
  Badge,
  Modal,
} from "../ui";
import { exportPDF } from "../pdf";
export function Signatures({
  user,
  go,
  notify,
  documentId,
  encounterId,
}: PageProps & { documentId?: string; encounterId?: string }) {
  const list = useResource(
    "/documents" + (encounterId ? "?encounter=" + encounterId : ""),
  );
  const [selected, setSelected] = useState(documentId ?? ""),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [placement, setPlacement] = useState("right"),
    [outcome, setOutcome] = useState("success"),
    [signing, setSigning] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [busy, setBusy] = useState(""),
    [verifyResult, setVerifyResult] = useState<any>(null),
    [modal, setModal] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const detail = useResource(selected ? "/documents/" + selected : null);
  const d = detail.data?.document;
  useEffect(() => {
    if (documentId) setSelected(documentId);
  }, [documentId]);
  useEffect(() => {
    if (!selected && list.data?.documents?.length) {
      const rows = list.data.documents;
      setSelected(
        (
          rows.find(
            (d: any) => d.patient_name === "Paciente 014" && d.type === "nota",
          ) ?? rows[0]
        ).id,
      );
    }
  }, [list.data, selected]);
  useEffect(() => {
    setVerifyResult(null);
    setReviewed(false);
    setPlacement(d?.placement ?? "right");
  }, [d?.id, d?.status]);
  const rows = list.data?.documents ?? [],
    pending = rows.filter((x: any) => x.status === "pending").length;
  const visible = rows.filter(
    (x: any) =>
      (filter === "all" || x.status === filter) &&
      [x.patient_name, x.history, docTitle(x.type)].some((s: string) =>
        s.toLowerCase().includes(search.toLowerCase()),
      ),
  );
  async function sign() {
    setSigning(true);
    try {
      const result = await post("/documents/" + d.id + "/sign", {
        version: d.version,
        placement,
        outcome,
      });
      if (result.ok) {
        notify(
          "Firma simulada registrada. La copia original y su huella se conservaron.",
        );
        setModal(false);
      } else notify(result.error, true);
      list.reload();
      detail.reload();
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setSigning(false);
    }
  }
  async function verify(rawPayload?: string) {
    setBusy("verify");
    try {
      const result = await post(
        "/documents/" + d.id + "/verify",
        rawPayload === undefined ? {} : { rawPayload },
      );
      setVerifyResult(result);
      notify(
        result.valid
          ? "La copia coincide con la huella conservada."
          : "La copia no coincide o el documento aún no tiene firma simulada.",
        !result.valid,
      );
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy("");
    }
  }
  async function compare(file: File) {
    try {
      if (file.size > 1_000_000)
        throw new Error("Selecciona una copia JSON de menos de 1 MB.");
      const copy = JSON.parse(await file.text());
      if (typeof copy.rawPayload !== "string")
        throw new Error(
          "El archivo no contiene una copia exportada por SIGESHRL.",
        );
      await verify(copy.rawPayload);
    } catch (e) {
      notify((e as Error).message, true);
    }
  }
  async function download(format: string) {
    setBusy(format);
    try {
      const data = await request("/documents/" + d.id + "/export");
      if (format === "pdf") await exportPDF(data);
      else downloadJSON(data, `SIGESHRL-${d.type}-v${d.version}.json`);
      notify(
        format === "pdf"
          ? "PDF académico descargado."
          : "Copia original y constancia de simulación descargadas.",
      );
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="DOCUMENTOS CLÍNICOS"
        title="Cada documento, revisado y respaldado."
        description="Verifica el contenido, ensaya la firma y consulta el resultado de cada intento."
        action={
          <span className="count-chip">
            <FilePenLine size={17} />
            {pending} pendiente{pending !== 1 ? "s" : ""}
          </span>
        }
      />
      <div className="signature-layout">
        <section className="document-list panel">
          <div className="panel-heading">
            <div>
              <h2>Mis documentos</h2>
              <p>
                {encounterId
                  ? "Documentos de la atención seleccionada"
                  : "Solo documentos de tu autoría"}
              </p>
            </div>
            <button
              className="icon-button"
              aria-label="Actualizar documentos"
              onClick={() => {
                list.reload();
                detail.reload();
              }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <div className="list-filters">
            <label className="search-input">
              <Search size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Paciente o historia"
                aria-label="Buscar documento"
              />
            </label>
            <div className="segmented">
              {[
                ["all", "Todos"],
                ["pending", "Pendientes"],
                ["signed", "Simulados"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={filter === id ? "active" : ""}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {list.loading ? (
            <Spinner />
          ) : list.error ? (
            <ErrorBox message={list.error} retry={list.reload} />
          ) : !visible.length ? (
            <Empty
              title="Sin documentos"
              message="No hay documentos para este filtro."
            />
          ) : (
            <div className="document-list-items">
              {visible.map((item: any) => (
                <button
                  key={item.id}
                  className={selected === item.id ? "selected" : ""}
                  onClick={() => {
                    setSelected(item.id);
                    setVerifyResult(null);
                  }}
                >
                  <span
                    className={
                      "doc-list-icon " +
                      (item.type === "receta" ? "purple" : "")
                    }
                  >
                    {item.type === "receta" ? (
                      <Pill size={20} />
                    ) : (
                      <FileText size={20} />
                    )}
                  </span>
                  <span>
                    <strong>{docTitle(item.type)}</strong>
                    <small>
                      {item.patient_name} · v{item.version}
                    </small>
                    <small>{item.history}</small>
                    <Badge status={item.status} />
                  </span>
                  {selected === item.id && <span className="selected-bar" />}
                </button>
              ))}
            </div>
          )}
        </section>
        <div className="signature-workspace">
          {!selected ? (
            <Empty
              title="Selecciona un documento"
              message="Primero guarda un registro clínico para generar sus documentos."
            />
          ) : detail.loading ? (
            <Spinner />
          ) : detail.error ? (
            <ErrorBox message={detail.error} retry={detail.reload} />
          ) : (
            d && (
              <>
                <div className="preview-heading">
                  <div>
                    <h2>
                      {docTitle(d.type)} <span>v{d.version}</span>
                    </h2>
                    <p>
                      {d.history} <span>·</span> {d.service}
                    </p>
                  </div>
                  <div className="preview-actions">
                    <button
                      className="button secondary compact"
                      disabled={!!busy}
                      onClick={() => download("json")}
                    >
                      <FileJson size={15} />
                      Original JSON
                    </button>
                    <button
                      className="button secondary compact"
                      disabled={!!busy}
                      onClick={() => download("pdf")}
                    >
                      <Download size={15} />
                      PDF
                    </button>
                  </div>
                </div>
                {!d.is_current && (
                  <div className="inline-note">
                    <GitBranch size={17} />
                    Versión conservada. El documento vigente se encuentra en la
                    bandeja.
                  </div>
                )}
                <div className="paper-surround">
                  <DocumentPreview document={d} placement={placement} />
                </div>
                <Panel
                  title={
                    d.status === "signed"
                      ? "Resultado de la simulación"
                      : "Revisión y firma"
                  }
                  subtitle={
                    d.status === "signed"
                      ? "La marca visible representa el registro académico de firma."
                      : "La simulación no utiliza el chip ni solicita el PIN de tu DNI."
                  }
                  action={<Badge status={d.status} />}
                >
                  <div className="signature-controls">
                    {d.status === "pending" ? (
                      <>
                        <div className="form-grid two">
                          <label className="field">
                            Ubicación de la marca visible
                            <select
                              value={placement}
                              onChange={(e) => setPlacement(e.target.value)}
                            >
                              <option value="right">
                                Pie derecho · última página
                              </option>
                              <option value="left">
                                Pie izquierdo · última página
                              </option>
                            </select>
                          </label>
                          <label className="field">
                            Respuesta del firmador de prueba
                            <select
                              value={outcome}
                              onChange={(e) => setOutcome(e.target.value)}
                            >
                              <option value="success">
                                Simulación satisfactoria
                              </option>
                              <option value="rejected">
                                Certificado de prueba rechazado
                              </option>
                              <option value="unavailable">
                                Firmador sin respuesta
                              </option>
                            </select>
                          </label>
                        </div>
                        {d.last_error && <ErrorBox message={d.last_error} />}
                        <div className="sign-action">
                          <div>
                            <LockKeyhole size={17} />
                            <p>
                              Firmante autorizado<strong>{user.name}</strong>
                            </p>
                          </div>
                          <button
                            className="button primary"
                            disabled={!d.is_current}
                            onClick={() => {
                              setReviewed(false);
                              setModal(true);
                            }}
                          >
                            <FilePenLine size={18} />
                            Revisar y simular firma
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="signature-success">
                          <CheckCircle2 size={26} />
                          <div>
                            <strong>Firma simulada registrada</strong>
                            <p>
                              {d.signer_name} <span>·</span>{" "}
                              {formatDate(d.signed_at, true)}
                            </p>
                          </div>
                        </div>
                        <div className="checksum">
                          <label>HUELLA SHA-256 DEL ORIGINAL</label>
                          <code>{d.sha256}</code>
                        </div>
                        <div className="verification-actions">
                          <button
                            className="button secondary compact"
                            disabled={!!busy}
                            onClick={() => verify()}
                          >
                            <ShieldCheck size={16} />
                            Comprobar integridad
                          </button>
                          <button
                            className="text-button"
                            disabled={!!busy}
                            onClick={() => fileInput.current?.click()}
                          >
                            <Upload size={15} />
                            Comparar una copia JSON
                          </button>
                          <input
                            type="file"
                            accept=".json,application/json"
                            className="sr-only"
                            ref={fileInput}
                            aria-label="Seleccionar copia JSON"
                            onChange={(e) => {
                              if (e.target.files?.[0])
                                void compare(e.target.files[0]);
                              e.target.value = "";
                            }}
                          />
                        </div>
                        {verifyResult && (
                          <div
                            className={
                              "integrity-result " +
                              (verifyResult.valid ? "valid" : "invalid")
                            }
                            role="status"
                          >
                            {verifyResult.valid ? (
                              <ShieldCheck size={18} />
                            ) : (
                              <AlertTriangle size={18} />
                            )}
                            <span>
                              <strong>
                                {verifyResult.valid
                                  ? "La copia conserva su integridad."
                                  : "La copia fue modificada o no tiene una huella firmada."}
                              </strong>{" "}
                              Verificación de integridad de la demo, sin
                              verificación de certificado IOFE.
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    <p className="signature-disclaimer">
                      <Info size={14} />
                      La huella permite comparar el contenido. No acredita
                      identidad ni reemplaza una firma digital emitida con un
                      certificado válido.
                    </p>
                  </div>
                </Panel>
              </>
            )
          )}
        </div>
      </div>
      {modal && d && (
        <Modal
          title="Confirmar simulación de firma"
          onClose={() => {
            if (!signing) setModal(false);
          }}
        >
          <div className="confirm-document">
            <span className="doc-type-icon">
              <FilePenLine size={25} />
            </span>
            <div>
              <h3>
                {docTitle(d.type)} · versión {d.version}
              </h3>
              <p>
                {d.patient_name} <span>·</span> {d.history}
              </p>
            </div>
          </div>
          <p>
            Se conservará el contenido exacto de esta versión y se registrará el
            resultado del intento con tu cuenta de prueba.
          </p>
          <dl className="confirmation-details">
            <div>
              <dt>Firmante</dt>
              <dd>{user.name}</dd>
            </div>
            <div>
              <dt>Resultado elegido</dt>
              <dd>
                {outcome === "success"
                  ? "Simulación satisfactoria"
                  : outcome === "rejected"
                    ? "Certificado rechazado"
                    : "Sin respuesta del firmador"}
              </dd>
            </div>
            <div>
              <dt>Ubicación</dt>
              <dd>{placement === "right" ? "Pie derecho" : "Pie izquierdo"}</dd>
            </div>
          </dl>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            <span>
              He revisado esta versión y entiendo que es una firma académica
              simulada.
            </span>
          </label>
          <div className="modal-actions">
            <button
              className="button secondary"
              disabled={signing}
              onClick={() => setModal(false)}
            >
              Volver a revisar
            </button>
            <button
              className="button primary"
              disabled={!reviewed || signing}
              onClick={sign}
            >
              {signing ? "Registrando…" : "Simular firma"}
              <Check size={17} />
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function DocumentPreview({
  document: d,
  placement = "right",
}: {
  document: any;
  placement?: string;
}) {
  const p = d.payload;
  return (
    <article className="document-paper">
      <header className="paper-header">
        <div>
          <strong>SIGESHRL</strong>
          <span>Hospital Regional Lambayeque</span>
        </div>
        <span>
          DOCUMENTO DE
          <br />
          DEMOSTRACIÓN
        </span>
      </header>
      <div className="paper-title">
        <span>{p.service.toUpperCase()}</span>
        <h2>{docTitle(p.type)}</h2>
        <p>
          {p.patient.history} <b>·</b> Versión {p.version} <b>·</b>{" "}
          {formatDate(p.date)}
        </p>
      </div>
      <dl className="paper-patient">
        <div>
          <dt>Paciente</dt>
          <dd>{p.patient.name}</dd>
        </div>
        <div>
          <dt>DNI</dt>
          <dd>{p.patient.dni}</dd>
        </div>
        <div className="full">
          <dt>Profesional responsable</dt>
          <dd>{p.author}</dd>
        </div>
      </dl>
      <div className="paper-content">
        {p.type === "nota" ? (
          <>
            <section>
              <h3>Motivo de consulta</h3>
              <p>{p.reason}</p>
            </section>
            <section>
              <h3>Diagnóstico</h3>
              <p>{p.diagnosis}</p>
            </section>
            <section>
              <h3>Evolución</h3>
              <p>{p.evolution}</p>
            </section>
          </>
        ) : p.type === "enfermeria" ? (
          <section>
            <h3>Cuidados y observaciones</h3>
            <p>{p.nursing}</p>
          </section>
        ) : (
          <>
            <h3>Prescripción de ejemplo</h3>
            {(p.prescription ?? []).map((item: any, i: number) => (
              <section className="paper-rx" key={i}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h4>{item.name}</h4>
                  <p>
                    {item.dose}
                    <br />
                    {item.frequency}
                    <br />
                    {item.duration}
                  </p>
                  <strong>Cantidad: {item.quantity}</strong>
                </div>
              </section>
            ))}
          </>
        )}
      </div>
      <div
        className={
          "paper-signature " + (d.status === "signed" ? d.placement : placement)
        }
      >
        <div className={d.status === "signed" ? "stamped" : "placeholder"}>
          <FilePenLine size={21} />
          <div>
            <strong>
              {d.status === "signed"
                ? "FIRMA SIMULADA"
                : "ZONA VISIBLE DE FIRMA"}
            </strong>
            <span>
              {d.status === "signed"
                ? d.signer_name
                : "Pie de la última página"}
            </span>
            <small>
              {d.status === "signed"
                ? formatDate(d.signed_at, true)
                : "Vista previa de ubicación"}
            </small>
          </div>
        </div>
      </div>
      <footer className="paper-footer">
        <span>Datos ficticios · Sin validez clínica ni firma digital IOFE</span>
        <span>1 / 1</span>
      </footer>
    </article>
  );
}
