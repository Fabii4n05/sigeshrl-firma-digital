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
export const initialFrom = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" })
    .format(new Date())
    .slice(0, 7) + "-01";
export function Period({ from, to, setFrom, setTo }) {
  return (
    <div className="period-filter">
      <CalendarDays size={16} />
      <label>
        <span>Desde</span>
        <input
          type="date"
          aria-label="Fecha inicial del periodo"
          value={from}
          onChange={(e) => e.target.value && setFrom(e.target.value)}
        />
      </label>
      <span className="period-dash">—</span>
      <label>
        <span>Hasta</span>
        <input
          type="date"
          aria-label="Fecha final del periodo"
          value={to}
          onChange={(e) => e.target.value && setTo(e.target.value)}
        />
      </label>
    </div>
  );
}
