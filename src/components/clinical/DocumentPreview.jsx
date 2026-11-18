import { FilePenLine } from "lucide-react";
import { docTitle, formatDate } from "../../lib/api";

export function DocumentPreview({ document: d, placement = "right" }) {
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
            {(p.prescription ?? []).map((item, i) => (
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
