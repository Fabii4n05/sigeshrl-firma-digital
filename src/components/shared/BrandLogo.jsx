import { HeartPulse } from "lucide-react";
import { Link } from "react-router";
export default function Brand() {
  return (
    <Link to="/agenda" className="brand" aria-label="SIGESHRL">
      <span className="brand-mark">
        <HeartPulse size={25} strokeWidth={1.8} />
      </span>
      <div>
        <strong>SIGESHRL</strong>
        <span>Salud conectada</span>
      </div>
    </Link>
  );
}
