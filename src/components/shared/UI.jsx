import React, { useEffect, useRef } from "react";
import {
  X,
  Check,
  Clock3,
  AlertCircle,
  FileText,
  Loader2,
  ArrowUpRight,
} from "lucide-react";
export const statusLabel = {
  programada: "Programada",
  en_atencion: "En atención",
  atendida: "Atendida",
  pending: "Pendiente",
  signed: "Firma simulada",
  espera: "En espera de firma",
  lista: "Lista en demo",
  dispensada: "Dispensada en demo",
};
export function Badge({ status, children }) {
  return (
    <span className={"badge " + (status ?? "neutral")}>
      {status === "signed" ||
      status === "atendida" ||
      status === "dispensada" ? (
        <Check size={12} />
      ) : status === "pending" || status === "espera" ? (
        <Clock3 size={12} />
      ) : null}
      {children ?? statusLabel[status ?? ""] ?? status}
    </span>
  );
}
export function Spinner({ label = "Cargando información…" }) {
  return (
    <div className="loading">
      <Loader2 className="spin" size={23} />
      <span>{label}</span>
    </div>
  );
}
export function Empty({ title = "Sin registros", message, children }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <FileText size={25} />
      </span>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {children}
    </div>
  );
}
export function ErrorBox({ message, retry }) {
  return (
    <div className="error-box" role="alert">
      <AlertCircle size={18} />
      <span>{message}</span>
      {retry && (
        <button className="text-button" onClick={retry}>
          Reintentar
        </button>
      )}
    </div>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const old = document.activeElement;
    const root = ref.current;
    root?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = root?.querySelectorAll(
          'button:not([disabled]),input,select,a[href],textarea,[tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
      old?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={"modal " + (wide ? "wide" : "")}
      >
        <header>
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Cerrar ventana"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}
export function Metric({ label, value, detail, icon, color = "mint" }) {
  return (
    <div className="metric">
      <div className="metric-top">
        <span>{label}</span>
        <span className={"metric-icon " + color}>{icon}</span>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
export function Panel({ title, subtitle, children, action, className = "" }) {
  return (
    <section className={"panel " + className}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export function LinkArrow({ children, onClick }) {
  return (
    <button className="text-button" onClick={onClick}>
      {children}
      <ArrowUpRight size={15} />
    </button>
  );
}
