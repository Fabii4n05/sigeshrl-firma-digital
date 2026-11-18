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
export function Pagination({ page, setPage, total }) {
  return (
    <div className="table-foot">
      <span>
        {total} registros <span>·</span> Página {page + 1} de{" "}
        {Math.max(1, Math.ceil(total / 10))}
      </span>
      <div className="pagination">
        <button
          className="icon-button"
          aria-label="Página anterior"
          disabled={page === 0}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Página siguiente"
          disabled={(page + 1) * 10 >= total}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
