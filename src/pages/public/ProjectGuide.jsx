import {
  BookOpen,
  ScanLine,
  CheckCircle2,
  Smartphone,
  ExternalLink,
  FlaskConical,
} from "lucide-react";
import { PageHeading, Panel } from "../../components/shared/UI";

export function Help() {
  const steps = [
    [
      "Escanea y abre la cita",
      "Entra como Médico y abre Escáner de DNI. Usa la cámara o Probar QR ficticio. Confirma 00000014 y abre su atención.",
    ],
    [
      "Revisa el documento",
      "La nota y la receta del Paciente 014 empiezan pendientes. Revisa el contenido y abre Documentos y firma.",
    ],
    [
      "Prueba la firma",
      "Para la exposición, simula rechazo y luego éxito. Para probar el chip, despliega la opción Android NFC y sigue sus tres pasos.",
    ],
    [
      "Consulta el resultado",
      "Con ambas firmas simuladas, Supervisión muestra 18/20 historias completas, equivalentes al 90 %. Farmacia permite una entrega de prueba.",
    ],
  ];
  return (
    <>
      <PageHeading
        eyebrow="AVANCE DEL PROYECTO"
        title="De la cita al documento firmado"
        description="Un recorrido breve basado en la guía de SIGESHRL, con datos ficticios."
        action={
          <span className="method-tag">
            <BookOpen size={17} />
            Guía de demostración
          </span>
        }
      />
      <div className="help-intro">
        <div>
          <span className="eyebrow">CASO PARA EXPONER</span>
          <h2>
            Paciente 014.
            <br />
            Una atención completa.
          </h2>
          <p>
            Identifica el DNI, abre la atención y revisa sus documentos. Los
            demás perfiles permiten mostrar lo que ocurre después.
          </p>
          <span className="demo-dni">
            <ScanLine size={21} />
            DNI de prueba <strong>00000014</strong>
          </span>
        </div>
        <ol className="help-journey">
          {steps.map(([title, description], i) => (
            <li key={title}>
              <span>0{i + 1}</span>
              <div>
                <strong>{title}</strong>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="help-grid">
        <Panel
          title="Escanear el DNI"
          subtitle="La fotografía cargada es una alternativa de respaldo."
        >
          <ul className="feature-list">
            {[
              "Cámara en vivo: códigos QR, PDF417 y Code 128.",
              "Modo Texto del DNI / MRZ con dos lecturas coincidentes.",
              "Lector USB en modo teclado, sin instalar componentes en la web.",
              "QR ficticio que permite probar el decodificador sin una cámara.",
              "Revisión de los ocho dígitos antes de buscar una cita.",
            ].map((text) => (
              <li key={text}>
                <CheckCircle2 size={16} />
                {text}
              </li>
            ))}
          </ul>
          <p className="small-note">
            Un código cifrado o un formato distinto puede requerir el modo
            Texto. El escaneo identifica datos impresos; no autentica al
            titular.
          </p>
        </Panel>
        <Panel
          title="Probar el chip con Android NFC"
          subtitle="App experimental incluida en el proyecto."
        >
          <ul className="pending-list">
            <li>
              <Smartphone size={23} />
              <div>
                <strong>Primero lee el certificado, sin PIN</strong>
                <p>
                  Intenta reconocer los perfiles del DNIe 2.0 y 3.0. Si no
                  encuentra la aplicación de firma por NFC, muestra el error y
                  se detiene.
                </p>
              </div>
            </li>
            <li>
              <CheckCircle2 size={23} />
              <div>
                <strong>Después, una solicitud de firma</strong>
                <p>
                  Desde Documentos y firma prepara el código, ábrelo en Android
                  y devuelve el resultado. La web comprueba la firma, el DNI
                  indicado y la huella del documento.
                </p>
              </div>
            </li>
          </ul>
          <p className="small-note">
            Necesita una prueba con su teléfono y DNIe. No se ha validado la
            cadena de confianza ni la revocación. La prueba no modifica el
            estado clínico ni habilita Farmacia.
          </p>
        </Panel>
      </div>
      <Panel
        title="Qué muestra este avance"
        subtitle="Las cuentas y los registros del hospital son de demostración."
      >
        <p>
          Incluye acceso por perfil, agenda, atención, documentos con versiones,
          firma simulada, reporte de cobertura, Farmacia y bitácora. La firma
          del chip se conserva como prueba técnica separada. Un piloto requiere
          un firmador institucional, validación de certificados y autorización
          del hospital.
        </p>
        <div className="source-links">
          <a
            href="https://identidad.reniec.gob.pe/documents/d/guest/manual_comandos_dnie_v3"
            target="_blank"
            rel="noreferrer"
          >
            RENIEC · comandos del DNIe 3.0
            <ExternalLink size={14} />
          </a>
          <a
            href="https://identidad.reniec.gob.pe/documents/d/guest/manual_comandos_dnie_v2"
            target="_blank"
            rel="noreferrer"
          >
            RENIEC · comandos del DNIe 2.0
            <ExternalLink size={14} />
          </a>
          <a
            href="https://developer.chrome.com/docs/capabilities/nfc"
            target="_blank"
            rel="noreferrer"
          >
            Chrome · alcance de Web NFC
            <ExternalLink size={14} />
          </a>
        </div>
      </Panel>
      <div className="help-footer">
        <FlaskConical size={19} />
        <p>
          React, Vite, JSX y React Router. Carpetas de páginas, componentes,
          estilos y servicios como en AdminLab. API local y SQLite para
          conservar el avance.
        </p>
      </div>
    </>
  );
}
