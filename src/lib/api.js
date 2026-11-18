export class ApiError extends Error {
  status;
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
export async function request(url, options = {}) {
  let response;
  try {
    response = await fetch("/api" + url, {
      credentials: "same-origin",
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-sigeshrl-client": "web",
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      "No hay conexión con la aplicación. Reintenta; los registros guardados se conservan.",
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "El servidor no pudo responder. Reintenta en unos segundos.",
    );
  }
  if (!response.ok) {
    if (response.status === 401 && !url.startsWith("/auth/"))
      window.dispatchEvent(new Event("session-expired"));
    throw new ApiError(
      data.error ?? "No se pudo completar la operación.",
      response.status,
    );
  }
  return data;
}
export const post = (url, data = {}) =>
  request(url, { method: "POST", body: JSON.stringify(data) });
export function downloadJSON(data, name) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const localDate = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(
    new Date(),
  );
export const formatDate = (s, full = false) =>
  new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    ...(full
      ? { dateStyle: "medium", timeStyle: "short" }
      : { day: "2-digit", month: "short", year: "numeric" }),
  }).format(new Date(s.length === 10 ? s + "T12:00:00-05:00" : s));
export const docTitle = (type) =>
  ({
    nota: "Nota clínica",
    receta: "Receta electrónica",
    enfermeria: "Registro de enfermería",
  })[type] ?? type;
export const roleTitle = (role) =>
  ({
    medico: "Médico",
    enfermeria: "Enfermería",
    admision: "Admisión",
    supervision: "Supervisión",
    farmacia: "Farmacia",
    admin: "Administración",
  })[role] ?? role;
