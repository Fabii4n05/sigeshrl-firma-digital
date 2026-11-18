import { useState } from "react";
import {
  Smartphone,
  Download,
  Copy,
  ShieldCheck,
  Info,
  ArrowRight,
} from "lucide-react";
import { post, downloadJSON } from "../../lib/api";
import { ErrorBox } from "../shared/UI";
import "../../css/pages/clinical/NfcTrial.css";

export default function NfcSignatureTrial({ document, notify }) {
  const [dni, setDni] = useState(""),
    [challenge, setChallenge] = useState(null),
    [qr, setQr] = useState(""),
    [proof, setProof] = useState(""),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const trial = await post("/nfc/challenges", {
        documentId: document.id,
        dni,
      });
      const mod = await import("qrcode");
      setQr(
        await (mod.default ?? mod).toDataURL(trial.deepLink, {
          width: 300,
          margin: 3,
        }),
      );
      setChallenge(trial);
      setProof("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    setBusy(true);
    setError("");
    try {
      const parsed = JSON.parse(proof);
      const verified = await post(
        "/nfc/challenges/" + challenge.id + "/verify",
        parsed,
      );
      setResult(verified);
      notify(
        "Firma criptográfica comprobada. La confianza del certificado aún requiere validación institucional.",
      );
    } catch (e) {
      setError(
        e instanceof SyntaxError
          ? "Pega el resultado JSON completo del lector Android."
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(challenge.request);
      notify("Solicitud copiada para el lector Android.");
    } catch {
      notify("Selecciona y copia el código que aparece debajo.", true);
    }
  }
  return (
    <details className="nfc-trial">
      <summary>
        <Smartphone size={18} />
        Probar firma del chip con Android NFC
      </summary>
      <p className="nfc-intro">
        Esta prueba intenta usar la clave del DNIe, sin subir fotos. Necesitas
        instalar el lector Android y mantener el DNI pegado a la antena NFC. La
        compatibilidad se confirma con tu tarjeta.
      </p>
      <div className="nfc-instructions">
        <a
          className="button secondary compact"
          href="/android/SIGESHRL-Lector-NFC.apk"
          download
        >
          <Download size={15} />
          1. Descargar lector Android
        </a>
        <small>
          App experimental del proyecto, sin permiso de Internet. El PIN se
          introduce únicamente en el celular y se envía al chip.
        </small>
      </div>
      <form onSubmit={create} className="nfc-request-form">
        <label className="field">
          DNI del titular del certificado
          <input
            value={dni}
            onChange={(e) =>
              setDni(e.target.value.replace(/\D/g, "").slice(0, 8))
            }
            maxLength={8}
            pattern="[0-9]{8}"
            inputMode="numeric"
            required
            placeholder="Tus ocho dígitos"
          />
        </label>
        <button
          className="button secondary compact"
          disabled={busy || dni.length !== 8}
        >
          2. Preparar solicitud
          <ArrowRight size={15} />
        </button>
      </form>
      {challenge && (
        <>
          <div className="nfc-request">
            <img src={qr} alt="QR de la solicitud de firma NFC" />
            <div>
              <strong>Abre esta solicitud en el lector</strong>
              <p>
                Escanea el QR con tu celular o copia el código y pégalo en la
                app. La solicitud vence en diez minutos.
              </p>
              <a className="button primary compact" href={challenge.deepLink}>
                Abrir lector en este Android
              </a>
              <button className="text-button" onClick={copy}>
                <Copy size={14} />
                Copiar solicitud
              </button>
            </div>
          </div>
          <details>
            <summary className="small-note">Ver código de solicitud</summary>
            <textarea
              readOnly
              rows={3}
              value={challenge.request}
              aria-label="Código de solicitud NFC"
            />
          </details>
          <label className="field nfc-response">
            3. Pega el resultado del lector Android
            <textarea
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              rows={5}
              maxLength={100000}
              placeholder="Resultado JSON copiado desde el celular"
            />
          </label>
          <button
            className="button primary compact"
            disabled={busy || !proof || !!result}
            onClick={verify}
          >
            <ShieldCheck size={16} />
            {busy ? "Comprobando…" : "Comprobar firma del chip"}
          </button>
        </>
      )}
      {error && <ErrorBox message={error} />}{" "}
      {result && (
        <div className="integrity-result valid">
          <ShieldCheck size={20} />
          <div>
            <strong>La firma criptográfica coincide con este documento.</strong>
            <p>
              {result.subject} · DNI {result.dni}
            </p>
            <p>
              Certificado vigente hasta{" "}
              {new Date(result.notAfter).toLocaleDateString("es-PE")}. Emisor
              declarado: {result.issuer}.
            </p>
            <button
              className="text-button"
              onClick={() =>
                downloadJSON(
                  { verification: result, proof: JSON.parse(proof) },
                  "Prueba-firma-DNIe.json",
                )
              }
            >
              Descargar constancia técnica
            </button>
          </div>
        </div>
      )}
      <p className="signature-disclaimer">
        <Info size={15} />
        Esta prueba verifica la firma y el DNI indicado en el certificado; no
        valida su cadena de confianza ni revocación. No cambia el estado clínico
        ni habilita Farmacia. El avance con firma simulada continúa disponible arriba.
      </p>
    </details>
  );
}
