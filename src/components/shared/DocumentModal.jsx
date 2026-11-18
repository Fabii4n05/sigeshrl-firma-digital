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
import { useResource } from "../../lib/hooks";
import {
  request,
  post,
  localDate,
  formatDate,
  docTitle,
  roleTitle,
  downloadJSON,
} from "../../lib/api";
import {
  PageHeading,
  Panel,
  Metric,
  Badge,
  Empty,
  Spinner,
  ErrorBox,
  Modal,
} from "./UI";
import { DocumentPreview } from "../clinical/DocumentPreview";
import { exportPDF } from "../../lib/pdf";
export function DocumentModal({ id, onClose, notify }) {
  const { data, loading, error } = useResource("/documents/" + id);
  const [busy, setBusy] = useState(false);
  async function pdf() {
    setBusy(true);
    try {
      const data = await request("/documents/" + id + "/export");
      await exportPDF(data);
    } catch (e) {
      notify(e.message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Revisión del documento" onClose={onClose} wide>
      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox message={error} />
      ) : (
        data && (
          <>
            <DocumentPreview document={data.document} />
            <div className="modal-actions">
              <Badge status={data.document.status} />
              <button
                className="button secondary"
                disabled={busy}
                onClick={pdf}
              >
                <Download size={16} />
                Descargar PDF académico
              </button>
            </div>
          </>
        )
      )}
    </Modal>
  );
}
