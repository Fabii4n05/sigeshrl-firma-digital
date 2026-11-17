import React, { useState, useRef, useEffect } from "react";
import {
  ScanLine,
  Camera,
  Upload,
  ImagePlus,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  UserRound,
  Keyboard,
  Info,
  Check,
  VideoOff,
  Loader2,
  Trash2,
} from "lucide-react";
import type { PageProps } from "../App";
import { parseDni, type DniResult } from "../dni";
import { post, request, formatDate } from "../api";
import { PageHeading, Panel, ErrorBox, Badge } from "../ui";

export function DniReader({ user, go, notify }: PageProps) {
  const [image, setImage] = useState(""),
    [result, setResult] = useState<DniResult | null>(null),
    [dni, setDni] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [stage, setStage] = useState(""),
    [error, setError] = useState(""),
    [camera, setCamera] = useState(false),
    [lookup, setLookup] = useState<any>(null),
    [confirmed, setConfirmed] = useState(false),
    [opening, setOpening] = useState("");
  const input = useRef<HTMLInputElement>(null),
    video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    mounted = useRef(true),
    workerRef = useRef<any>(null),
    previewRef = useRef("");
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stream.current?.getTracks().forEach((t) => t.stop());
      workerRef.current?.terminate();
      if (previewRef.current.startsWith("blob:"))
        URL.revokeObjectURL(previewRef.current);
    };
  }, []);
  function stopCamera() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setCamera(false);
  }
  async function startCamera() {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "La cámara necesita localhost o HTTPS. Puedes cargar una foto desde tu equipo.",
        );
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      stream.current = s;
      setCamera(true);
      setTimeout(() => {
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
      }, 50);
    } catch (e) {
      setError(
        (e as Error).name === "NotAllowedError"
          ? "No se permitió usar la cámara. Habilita el permiso o carga una foto."
          : (e as Error).message,
      );
    }
  }
  async function recognize(file: Blob) {
    if (file.size > 12 * 1024 * 1024) {
      setError("La imagen debe pesar menos de 12 MB.");
      return;
    }
    if (
      !["image/png", "image/jpeg", "image/webp", "image/bmp"].includes(
        file.type,
      )
    ) {
      setError("Selecciona una imagen JPG, PNG, WebP o BMP.");
      return;
    }
    stopCamera();
    setBusy(true);
    setError("");
    setLookup(null);
    setResult(null);
    setConfirmed(false);
    setDni("");
    setProgress(0);
    setStage("Preparando lectura local");
    if (previewRef.current.startsWith("blob:"))
      URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setImage(url);
    let worker: any;
    try {
      const tesseract = await import("tesseract.js");
      const { createWorker } = tesseract.default ?? tesseract;
      worker = await createWorker("spa", 1, {
        workerPath: "/ocr/worker.min.js",
        corePath: "/ocr",
        langPath: "/ocr",
        workerBlobURL: false,
        gzip: true,
        logger: (m) => {
          if (!mounted.current) return;
          setStage(
            m.status === "recognizing text"
              ? "Reconociendo datos del documento"
              : "Preparando motor de lectura",
          );
          setProgress(
            m.status === "recognizing text" ? Math.round(m.progress * 100) : 0,
          );
        },
      });
      workerRef.current = worker;
      await worker.setParameters({
        tessedit_pageseg_mode: (tesseract.default ?? tesseract).PSM.SPARSE_TEXT,
      });
      const img = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const scale = Math.min(2, 2200 / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.filter = "grayscale(1) contrast(1.2)";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.close();
      const output = await worker.recognize(canvas);
      if (mounted.current) {
        const parsed = parseDni(output.data.text);
        setResult(parsed);
        setDni(parsed.dni);
        if (!parsed.dni)
          setError(
            "No se encontró un DNI de ocho dígitos. Prueba una foto más nítida o escríbelo manualmente.",
          );
        else
          notify(
            "Lectura completada. Revisa y confirma el número antes de continuar.",
          );
      }
    } catch (e) {
      console.warn(
        "No se pudo iniciar o completar el OCR:",
        e instanceof Error ? e.message : String(e),
      );
      if (mounted.current)
        setError(
          "No se pudo leer la imagen. Usa una foto frontal y nítida o ingresa el DNI manualmente.",
        );
    } finally {
      try {
        await worker?.terminate();
      } catch {}
      workerRef.current = null;
      if (mounted.current) setBusy(false);
    }
  }
  async function example() {
    try {
      const response = await fetch("/dni-ejemplo.png");
      if (!response.ok) throw new Error();
      await recognize(await response.blob());
    } catch {
      setError(
        "No se pudo abrir la muestra. Puedes escribir 00000014 para recorrer el caso guía.",
      );
    }
  }
  async function capture() {
    if (!video.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.current.videoWidth;
    canvas.height = video.current.videoHeight;
    canvas.getContext("2d")!.drawImage(video.current, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) void recognize(blob);
      },
      "image/jpeg",
      0.95,
    );
  }
  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setLookup(null);
    try {
      const data = await request("/patients/by-dni/" + dni);
      setLookup(data);
      setConfirmed(true);
      notify(
        "Registro ficticio localizado. La identidad no fue validada por RENIEC.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function open(a: any) {
    setOpening(a.id);
    try {
      if (user.role === "admision") {
        await post(`/appointments/${a.id}/confirm`);
        notify("Llegada confirmada.");
      } else {
        const data = await post(`/appointments/${a.id}/open`);
        go("atencion/" + data.encounterId);
      }
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setOpening("");
    }
  }
  function clear() {
    stopCamera();
    if (previewRef.current.startsWith("blob:"))
      URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setImage("");
    setResult(null);
    setDni("");
    setLookup(null);
    setError("");
    setConfirmed(false);
  }
  return (
    <>
      <PageHeading
        eyebrow="IDENTIFICACIÓN SIN LECTOR FÍSICO"
        title="El DNI, al alcance de tu cámara."
        description="Reconoce el número impreso y encuentra la cita en los registros de la demostración."
        action={
          <span className="method-tag">
            <ScanLine size={16} />
            Lectura óptica · OCR
          </span>
        }
      />
      <div className="steps-strip">
        <div className="active">
          <span>1</span>Captura el documento
        </div>
        <i />
        <div className={result || dni ? "active" : ""}>
          <span>2</span>Revisa los datos
        </div>
        <i />
        <div className={confirmed ? "active" : ""}>
          <span>3</span>Abre la atención
        </div>
      </div>
      <div className="reader-grid">
        <Panel
          title="Captura del documento"
          subtitle="Coloca el frente del DNI en un lugar iluminado y evita reflejos."
        >
          <div
            className={"capture-zone " + (image || camera ? "has-image" : "")}
          >
            {camera ? (
              <>
                <video
                  ref={video}
                  muted
                  playsInline
                  autoPlay
                  aria-label="Vista de la cámara"
                />
                <div className="camera-guide" />
                <span className="capture-label">
                  Alinea el documento dentro del marco
                </span>
              </>
            ) : image ? (
              <>
                <img
                  src={image}
                  alt="Documento seleccionado para lectura local"
                />
                <span className="capture-label">
                  <ShieldCheck size={13} />
                  Imagen procesada en tu navegador
                </span>
              </>
            ) : (
              <>
                <div className="scan-illustration">
                  <span />
                  <UserRound size={45} />
                  <div>
                    <i />
                    <i />
                    <i />
                  </div>
                  <ScanLine size={145} strokeWidth={0.7} />
                </div>
                <h3>Una imagen clara es el primer paso</h3>
                <p>
                  Usa tu cámara o carga una fotografía.
                  <br />
                  El chip y el PIN no se leen en esta opción.
                </p>
              </>
            )}
          </div>
          {busy && image && (
            <div className="ocr-progress" role="status">
              <div>
                <Loader2 className="spin" size={16} />
                <span>{stage}</span>
                <strong>{progress}%</strong>
              </div>
              <progress max={100} value={progress} />
            </div>
          )}
          <div className="capture-buttons">
            {camera ? (
              <>
                <button className="button primary" onClick={capture}>
                  <Camera size={17} />
                  Capturar documento
                </button>
                <button className="button secondary" onClick={stopCamera}>
                  <VideoOff size={17} />
                  Cerrar cámara
                </button>
              </>
            ) : (
              <>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={startCamera}
                >
                  <Camera size={17} />
                  Usar cámara
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => input.current?.click()}
                >
                  <Upload size={17} />
                  Cargar imagen
                </button>
              </>
            )}
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/bmp"
              className="sr-only"
              aria-label="Seleccionar imagen del DNI"
              onChange={(e) => {
                if (e.target.files?.[0]) void recognize(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </div>
          <div className="capture-example">
            <button className="text-button" disabled={busy} onClick={example}>
              <ImagePlus size={16} />
              Probar con una muestra ficticia
              <ArrowRight size={14} />
            </button>
            {image && (
              <button
                className="icon-button"
                disabled={busy}
                onClick={clear}
                aria-label="Borrar imagen y datos"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </Panel>
        <div className="reader-right">
          <Panel
            title="Revisa antes de continuar"
            subtitle="La lectura puede cometer errores. Confirma siempre los ocho dígitos."
          >
            <form onSubmit={confirm}>
              <label className="field">
                Número de DNI
                <span className="input-with-icon">
                  <Keyboard size={18} />
                  <input
                    className="dni-input"
                    value={dni}
                    onChange={(e) => {
                      setDni(e.target.value.replace(/\D/g, "").slice(0, 8));
                      setConfirmed(false);
                      setLookup(null);
                    }}
                    inputMode="numeric"
                    pattern="[0-9]{8}"
                    placeholder="00000000"
                    maxLength={8}
                    required
                    aria-describedby="dni-help"
                  />
                </span>
              </label>
              <small id="dni-help" className="field-hint">
                También puedes escribir el número. Caso guía:{" "}
                <strong>00000014</strong>.
              </small>
              {result?.candidates.length! > 1 && (
                <label className="field">
                  Se detectaron varios números
                  <select value={dni} onChange={(e) => setDni(e.target.value)}>
                    {result!.candidates.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  required
                />
                <span>
                  He revisado el número y autorizo su búsqueda en los datos de
                  prueba.
                </span>
              </label>
              {error && <ErrorBox message={error} />}
              <button
                className="button primary full"
                disabled={busy || dni.length !== 8 || !confirmed}
              >
                <ScanLine size={17} />
                {busy ? "Procesando…" : "Buscar registro de prueba"}
                <ArrowRight size={16} />
              </button>
            </form>
            {result && (
              <details className="ocr-details">
                <summary>Ver texto reconocido</summary>
                <pre>{result.raw || "No se reconoció texto."}</pre>
                <span>Este texto no se envía al servidor.</span>
              </details>
            )}
          </Panel>
          <div className="privacy-note">
            <ShieldCheck size={20} />
            <div>
              <strong>La fotografía se queda en este dispositivo.</strong>
              <p>
                El reconocimiento se realiza localmente. Solo se envía el número
                confirmado para buscar una cita; la foto se descarta al salir.
              </p>
            </div>
          </div>
        </div>
      </div>
      {lookup && (
        <Panel
          title="Registro encontrado"
          subtitle="Coincidencia en la base ficticia. Esto no verifica la autenticidad del documento."
          className="lookup-result"
        >
          <div className="lookup-person">
            <div className="avatar mint large">
              <UserRound size={26} />
            </div>
            <div>
              <h3>{lookup.patient.name}</h3>
              <p>
                {lookup.patient.history} <span>·</span> DNI {lookup.patient.dni}
              </p>
            </div>
            <Badge status="signed">Registro de demostración</Badge>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>FECHA Y HORA</th>
                  <th>SERVICIO</th>
                  <th>ESTADO DE ATENCIÓN</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lookup.appointments.map((a: any) => (
                  <tr key={a.id}>
                    <td>
                      {formatDate(a.date)}{" "}
                      <small className="cell-subtitle">{a.time}</small>
                    </td>
                    <td>
                      {a.service}
                      <small className="cell-subtitle">{a.specialty}</small>
                    </td>
                    <td>
                      <Badge status={a.status} />
                    </td>
                    <td className="align-right">
                      <button
                        className="button primary compact"
                        disabled={!!opening}
                        onClick={() => open(a)}
                      >
                        {user.role === "admision"
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
        </Panel>
      )}
      <div className="plain-info">
        <Info size={18} />
        <p>
          <strong>¿Por qué no NFC?</strong> La web no accede al chip
          criptográfico del DNIe. Web NFC trabaja con etiquetas NDEF y no ofrece
          las operaciones de bajo nivel necesarias. Para la firma real se debe
          integrar un firmador y un medio de firma compatible; esta alternativa
          lee datos impresos.
        </p>
        <a
          href="https://developer.chrome.com/docs/capabilities/nfc"
          target="_blank"
          rel="noreferrer"
        >
          Consultar fuente
          <ArrowRight size={13} />
        </a>
      </div>
    </>
  );
}
