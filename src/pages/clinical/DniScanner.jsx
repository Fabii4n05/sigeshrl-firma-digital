import { useState, useRef, useEffect } from "react";
import {
  Camera,
  ScanLine,
  Keyboard,
  VideoOff,
  Upload,
  ArrowRight,
  Smartphone,
  ShieldCheck,
  Info,
  QrCode,
  Loader2,
  UserRound,
} from "lucide-react";
import {
  PageHeading,
  Panel,
  ErrorBox,
  Badge,
} from "../../components/shared/UI";
import { parseScannedDni, createBarcodeReader } from "../../lib/scanner";
import { parseDni } from "../../lib/dni";
import { createDniOCR } from "../../lib/ocr";
import { request, post, formatDate } from "../../lib/api";
import "../../css/pages/clinical/DniScanner.css";

export default function DniScanner({ user, go, notify }) {
  const [mode, setMode] = useState("codigo"),
    [scanning, setScanning] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [dni, setDni] = useState(""),
    [reviewed, setReviewed] = useState(false),
    [busy, setBusy] = useState(false),
    [lookup, setLookup] = useState(null),
    [source, setSource] = useState(""),
    [demo, setDemo] = useState("");
  const video = useRef(null),
    control = useRef(null),
    media = useRef(null),
    worker = useRef(null),
    generation = useRef(0),
    mounted = useRef(true),
    fileInput = useRef(null),
    readerInput = useRef(null),
    loop = useRef(null);
  function stop() {
    generation.current++;
    control.current?.stop();
    control.current = null;
    clearTimeout(loop.current);
    const activeWorker = worker.current;
    worker.current = null;
    void activeWorker?.terminate();
    media.current?.getTracks().forEach((t) => t.stop());
    media.current = null;
    if (video.current?.srcObject) {
      video.current.srcObject.getTracks().forEach((t) => t.stop());
      video.current.srcObject = null;
    }
    if (mounted.current) {
      setScanning(false);
      setMessage("");
    }
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop();
      worker.current?.terminate();
    };
  }, []);
  function accept(value, origin) {
    if (!value) return;
    stop();
    setDni(value);
    setReviewed(false);
    setLookup(null);
    setSource(origin);
    setError("");
    setMessage("Lectura recibida. Revisa los ocho dígitos antes de continuar.");
  }
  function receiveCode(raw) {
    const parsed = parseScannedDni(raw);
    if (parsed.dni) {
      accept(parsed.dni, "Código escaneado");
      return true;
    }
    return false;
  }
  async function start() {
    stop();
    setError("");
    setLookup(null);
    setMessage("Preparando cámara…");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "La cámara requiere localhost o HTTPS. También puedes usar un escáner USB que escriba como teclado.",
      );
      return;
    }
    const run = ++generation.current;
    setScanning(true);
    try {
      if (mode === "codigo") {
        const reader = await createBarcodeReader();
        if (run !== generation.current) return;
        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          },
          video.current,
          (result) => {
            if (run !== generation.current || !result) return;
            if (!receiveCode(result.getText()))
              setMessage(
                "Código leído, pero no contiene un DNI reconocible. Prueba el modo Texto del DNI.",
              );
          },
        );
        if (run !== generation.current) controls.stop();
        else {
          control.current = controls;
          setMessage(
            "Apunta al código QR o de barras del documento. La detección es automática.",
          );
        }
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (run !== generation.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        media.current = stream;
        video.current.srcObject = stream;
        await video.current.play();
        const ocr = await createDniOCR();
        if (run !== generation.current) {
          await ocr.terminate();
          return;
        }
        worker.current = ocr;
        setMessage(
          "Mantén visible el número o las líneas MRZ. Se confirmará tras dos lecturas coincidentes.",
        );
        let last = "",
          hits = 0;
        const scan = async () => {
          if (run !== generation.current || !video.current?.videoWidth) return;
          try {
            const v = video.current,
              canvas = document.createElement("canvas");
            canvas.width = Math.min(v.videoWidth, 1800);
            canvas.height = Math.round(
              (canvas.width * v.videoHeight) / v.videoWidth,
            );
            canvas
              .getContext("2d")
              .drawImage(v, 0, 0, canvas.width, canvas.height);
            const result = await ocr.recognize(canvas);
            if (run !== generation.current) return;
            const value = parseDni(result.data.text).dni;
            if (value && value === last) hits++;
            else {
              last = value;
              hits = value ? 1 : 0;
            }
            if (hits >= 2) {
              accept(value, "Texto leído en vivo");
              return;
            }
          } catch {
            if (run === generation.current)
              setMessage("Acerca el documento y evita reflejos.");
          }
          if (run === generation.current) loop.current = setTimeout(scan, 1200);
        };
        void scan();
      }
    } catch (e) {
      if (run !== generation.current) return;
      stop();
      setError(
        e.name === "NotAllowedError"
          ? "La cámara no tiene permiso. Habilítala en el navegador o utiliza el lector USB."
          : e.name === "NotFoundError"
            ? "No se encontró cámara. Puedes usar un lector USB o el ingreso manual."
            : "No se pudo iniciar el escáner. Revisa la cámara y vuelve a intentar.",
      );
    }
  }
  async function usb(e) {
    e.preventDefault();
    if (!receiveCode(readerInput.current.value))
      setError(
        "El lector no entregó un DNI reconocible. Revisa el formato o escribe los ocho dígitos.",
      );
    else readerInput.current.value = "";
  }
  async function lookupDni(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setLookup(await request("/patients/by-dni/" + dni));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function open(a) {
    setBusy(true);
    try {
      if (user.role === "admision") {
        await post("/appointments/" + a.id + "/confirm");
        notify("Llegada confirmada.");
      } else {
        const result = await post("/appointments/" + a.id + "/open");
        go("atencion/" + result.encounterId);
      }
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  async function sample() {
    setBusy(true);
    setError("");
    try {
      const qr = await import("qrcode");
      const url = await (qr.default ?? qr).toDataURL(
        "SIGESHRL-DEMO;DNI=00000014",
        { width: 360, margin: 3 },
      );
      setDemo(url);
      const reader = await createBarcodeReader();
      const result = await reader.decodeFromImageUrl(url);
      if (!receiveCode(result.getText()))
        throw new Error("No se pudo reconocer la muestra.");
      notify("El escáner decodificó el QR de prueba.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function fallback(file) {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setError("La imagen debe pesar menos de 12 MB.");
      return;
    }
    setBusy(true);
    setError("");
    let ocr;
    try {
      ocr = await createDniOCR();
      const output = await ocr.recognize(file);
      const result = parseDni(output.data.text);
      if (!result.dni)
        throw new Error(
          "No se encontró un DNI. Prueba otra captura o escríbelo manualmente.",
        );
      accept(result.dni, "Imagen de respaldo");
    } catch (e) {
      setError(e.message);
    } finally {
      await ocr?.terminate();
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="LECTURA DEL DOCUMENTO"
        title="Escáner de DNI"
        description="Usa la cámara en vivo o un lector USB. No necesitas cargar una fotografía."
        action={
          <span className="method-tag">
            <ScanLine size={16} />
            Escaneo en vivo
          </span>
        }
      />
      <div className="reader-grid">
        <Panel
          title="Coloca el DNI frente a la cámara"
          subtitle="El escaneo identifica el número impreso. El chip se prueba por separado con Android NFC."
        >
          <div
            className="scanner-modes"
            role="group"
            aria-label="Modo del escáner"
          >
            <button
              className={mode === "codigo" ? "active" : ""}
              onClick={() => {
                stop();
                setMode("codigo");
              }}
            >
              <QrCode size={16} />
              Código QR / barras
            </button>
            <button
              className={mode === "texto" ? "active" : ""}
              onClick={() => {
                stop();
                setMode("texto");
              }}
            >
              <ScanLine size={16} />
              Texto del DNI / MRZ
            </button>
          </div>
          <div
            className={
              "capture-zone scanner-camera " + (scanning ? "has-image" : "")
            }
          >
            <video
              ref={video}
              muted
              autoPlay
              playsInline
              aria-label="Vista del escáner"
              style={{ display: scanning ? "block" : "none" }}
            />
            {scanning ? (
              <>
                <div className="scanner-frame" />
                <span className="capture-label">
                  Lectura automática · sin guardar fotografías
                </span>
              </>
            ) : (
              <>
                <ScanLine size={78} strokeWidth={1} />
                <h3>Escanea directamente el documento</h3>
                <p>
                  {mode === "codigo"
                    ? "Apunta al código del DNI, si es legible."
                    : "Mantén visible el número o las líneas de la parte posterior."}
                </p>
              </>
            )}
          </div>
          {message && (
            <p className="scanner-status" role="status">
              {scanning && <Loader2 size={15} className="spin" />}
              {message}
            </p>
          )}
          <div className="capture-buttons">
            <button
              className="button primary"
              disabled={busy}
              onClick={scanning ? stop : start}
            >
              {scanning ? <VideoOff size={17} /> : <Camera size={17} />}{" "}
              {scanning ? "Detener escáner" : "Iniciar escáner"}
            </button>
            <button
              className="button secondary"
              disabled={scanning || busy}
              onClick={sample}
            >
              <QrCode size={16} />
              Probar QR ficticio
            </button>
          </div>
          {demo && (
            <details className="scanner-sample">
              <summary>Ver QR de prueba para otro dispositivo</summary>
              <img src={demo} alt="QR ficticio del DNI 00000014" />
              <p>Muestra de SIGESHRL. No es un código oficial de RENIEC.</p>
            </details>
          )}
          <details className="scanner-option">
            <summary>
              <Keyboard size={16} />
              Usar un lector USB de códigos
            </summary>
            <p>
              Configura el lector en modo teclado, enfoca este campo y escanea.
              La mayoría envía Enter al terminar.
            </p>
            <form onSubmit={usb}>
              <input
                ref={readerInput}
                aria-label="Entrada del lector USB"
                autoComplete="off"
                placeholder="Esperando lectura…"
                maxLength={8000}
              />
              <button className="button secondary compact">Leer código</button>
            </form>
          </details>
        </Panel>
        <div className="reader-right">
          <Panel
            title="Revisa el DNI leído"
            subtitle="Confirma el número antes de buscar la cita."
          >
            <form onSubmit={lookupDni}>
              <label className="field">
                Número de DNI
                <input
                  className="dni-input"
                  value={dni}
                  inputMode="numeric"
                  maxLength={8}
                  pattern="[0-9]{8}"
                  onChange={(e) => {
                    setDni(e.target.value.replace(/\D/g, "").slice(0, 8));
                    setReviewed(false);
                    setLookup(null);
                    setSource("Ingreso manual");
                  }}
                  required
                  placeholder="00000000"
                />
              </label>
              <small className="field-hint">
                {source || "También puedes escribir el número."} · Caso guía:{" "}
                <b>00000014</b>.
              </small>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  required
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                <span>He revisado los ocho dígitos.</span>
              </label>
              {error && <ErrorBox message={error} />}
              <button
                className="button primary full"
                disabled={!reviewed || dni.length !== 8 || busy}
              >
                Buscar cita
                <ArrowRight size={16} />
              </button>
            </form>
          </Panel>
          <div className="privacy-note">
            <ShieldCheck size={21} />
            <div>
              <strong>La cámara no envía imágenes al servidor.</strong>
              <p>
                Solo se busca el DNI confirmado en la base de prueba. Escanearlo
                no autentica al firmante ni concede acceso.
              </p>
            </div>
          </div>
          <details className="scanner-option fallback">
            <summary>
              <Upload size={16} />
              Última alternativa: cargar una imagen
            </summary>
            <p>Utiliza esta opción si no funcionan la cámara ni el lector.</p>
            <input
              ref={fileInput}
              type="file"
              aria-label="Imagen de respaldo del DNI"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(e) => {
                void fallback(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </details>
          <Panel
            title="¿Y el chip del DNIe?"
            subtitle="Prueba experimental con Android NFC."
          >
            <div className="scanner-nfc">
              <Smartphone size={27} />
              <p>
                El lector Android intenta reconocer el chip y leer el
                certificado. Si la aplicación de firma es accesible por NFC,
                permite probar una firma desde «Documentos y firma».
              </p>
              <a
                className="button secondary full"
                href="/android/SIGESHRL-Lector-NFC.apk"
                download
              >
                Descargar lector Android NFC
              </a>
              <small>
                Requiere instalar la app y probarla con su DNIe. No se solicita
                el PIN en esta web.
              </small>
            </div>
          </Panel>
        </div>
      </div>
      {lookup && (
        <Panel
          title="Cita encontrada"
          subtitle="Datos ficticios de la demostración."
          className="lookup-result"
        >
          <div className="lookup-person">
            <div className="avatar mint large">
              <UserRound size={25} />
            </div>
            <div>
              <h3>{lookup.patient.name}</h3>
              <p>
                {lookup.patient.history} · DNI {lookup.patient.dni}
              </p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>FECHA Y HORA</th>
                  <th>SERVICIO</th>
                  <th>ATENCIÓN</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lookup.appointments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {formatDate(a.date)} · {a.time}
                    </td>
                    <td>{a.service}</td>
                    <td>
                      <Badge status={a.status} />
                    </td>
                    <td>
                      <button
                        className="button primary compact"
                        disabled={busy}
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
          La lectura de QR o texto obtiene datos impresos. La firma digital
          utiliza la clave privada del chip y su certificado. Un código cifrado
          o un QR sin número legible puede requerir el modo Texto o la
          aplicación oficial del emisor.
        </p>
      </div>
    </>
  );
}
