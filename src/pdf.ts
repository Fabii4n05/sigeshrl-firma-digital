import { docTitle, formatDate } from "./api";
export async function exportPDF(data: any) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const p = data.document,
    s = data.signature;
  const pageWidth = 210,
    margin = 19;
  let y = 50;
  function header() {
    pdf.setFillColor(17, 44, 59);
    pdf.rect(0, 0, 210, 35, "F");
    pdf.setTextColor(255);
    pdf.setFontSize(19);
    pdf.setFont("helvetica", "bold");
    pdf.text("SIGESHRL", margin, 15);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.text("Hospital Regional Lambayeque | Prototipo académico", margin, 23);
    pdf.setTextColor(160, 200, 188);
    pdf.text(
      "DATOS FICTICIOS / SIN VALIDEZ CLÍNICA NI FIRMA DIGITAL IOFE",
      margin,
      30,
    );
    pdf.setTextColor(25, 45, 57);
  }
  function ensure(space = 12) {
    if (y + space > 267) {
      pdf.addPage();
      header();
      y = 49;
    }
  }
  function lines(value: string, size = 10, bold = false) {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const list = pdf.splitTextToSize(value, pageWidth - margin * 2);
    for (const line of list) {
      ensure(6);
      pdf.text(line, margin, y);
      y += size * 0.48 + 1;
    }
    y += 3;
  }
  function section(label: string, value: string) {
    ensure(20);
    lines(label.toUpperCase(), 9, true);
    lines(value || "Sin registro");
  }
  header();
  lines(docTitle(p.type), 20, true);
  lines(`Versión ${p.version} | ${p.date} | ${p.service}`, 10);
  y += 3;
  section(
    "Paciente",
    `${p.patient.name} | ${p.patient.history} | DNI ${p.patient.dni}`,
  );
  section("Profesional responsable", p.author);
  if (p.type === "nota") {
    section("Motivo", p.reason);
    section("Diagnóstico", p.diagnosis);
    section("Evolución", p.evolution);
  }
  if (p.type === "enfermeria") section("Registro de enfermería", p.nursing);
  if (p.type === "receta") {
    for (const [i, item] of (p.prescription ?? []).entries()) {
      section(
        `Ítem ${i + 1}`,
        `${item.name}\n${item.dose}\n${item.frequency}\n${item.duration}\nCantidad: ${item.quantity}`,
      );
    }
    lines("Prescripción ficticia. No utilizar para tratamiento.", 9, true);
  }
  if (s) {
    ensure(52);
    y = Math.max(y + 7, 218);
    const x = s.placement === "left" ? margin : 104;
    pdf.setDrawColor(55, 125, 108);
    pdf.setFillColor(239, 249, 245);
    pdf.roundedRect(x, y, 87, 37, 2, 2, "FD");
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("FIRMA SIMULADA", x + 5, y + 7);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(pdf.splitTextToSize(s.signer, 77), x + 5, y + 13);
    pdf.text(formatDate(s.signedAt, true), x + 5, y + 21);
    pdf.text("Sin certificado RENIEC / IOFE", x + 5, y + 29);
    y += 43;
    lines("SHA-256 de la copia original de demostración: " + s.sha256, 7);
  } else {
    ensure(12);
    lines("PENDIENTE DE FIRMA SIMULADA", 10, true);
  }
  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(215, 225, 226);
    pdf.line(19, 282, 191, 282);
    pdf.setTextColor(100, 116, 125);
    pdf.setFontSize(8);
    pdf.text(
      "Demostración académica. El PDF no contiene firma digital criptográfica.",
      19,
      288,
    );
    pdf.text(`${page} / ${pages}`, 191, 288, { align: "right" });
  }
  pdf.save(`SIGESHRL-${p.type}-${p.patient.history}-v${p.version}.pdf`);
}
