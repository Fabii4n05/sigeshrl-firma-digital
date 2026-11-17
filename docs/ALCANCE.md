# Alcance de la demostración de SIGESHRL

El documento de referencia describe una implementación hospitalaria y una demostración académica. Esta entrega materializa el recorrido académico con un servidor y una base persistente. Las integraciones institucionales se documentan como trabajo futuro; no se da por supuesto acceso a sistemas, certificados o equipos del hospital.

## Requisitos funcionales

| Código de la guía | Resultado de esta entrega | Límite |
| --- | --- | --- |
| RF-01 | Inicio de sesión, permisos en servidor por rol, servicio y registro, habilitación y revocación de sesiones | Cuentas de prueba, sin directorio institucional. Un rol por cuenta; varios roles por cuenta quedan para el piloto |
| RF-02 | Agenda por fecha, búsqueda por paciente, historia o DNI, filtro de estado y ámbito profesional y especialidad; API admite especialidad y profesional | La interfaz fija servicio, especialidad y profesional según el perfil. No ofrece agenda institucional de múltiples profesionales |
| RF-03 | Atención vinculada a cita e historia, registro médico, enfermería, nota y receta con autor y versión | Formatos ilustrativos, sin catálogo clínico ni sistema hospitalario conectado |
| RF-04 | Bandeja, vista completa del contenido conservado, estados, último error y posición de marca | Vista HTML y PDF académico, sin visor de originales institucionales firmados |
| RF-05 | Solicitud de firma simulada, control de autoría y versión, original JSON y huella SHA-256 | No implementa firma digital IOFE, validación de certificado, revocación ni identidad con DNIe |
| RF-06 | Rechazo y falta de respuesta mantienen pendientes; reintentos controlados; correcciones conservan versiones anteriores | La respuesta del firmador se elige en un simulador |
| RF-07 | Receta vigente habilitada tras simulación, bloqueo de pendientes, entrega con fecha y usuario, unicidad por versión | Dispensación ficticia, sin inventario, entregas parciales ni contingencias institucionales |
| RF-08 | Resumen y detalle por servicio y fechas, historias únicas y permiso adicional de detalle | Cifras ficticias. Línea base real y definición institucional deben confirmarse con DITI |
| RF-09 | Auditoría de acceso, consulta de DNI, firma, verificación, dispensación y cambios de permisos | La API no modifica ni borra eventos; no hay custodia externa ni registro con prueba criptográfica contra un administrador de base |
| RF-10 | Diseño del intercambio, identificadores, mensajes, respuesta, errores y reintentos | Contrato propuesto; no se envían datos al SIHCE real |

## Calidad y seguridad

| Código de la guía | Cubierto en la demo | Pendiente para un piloto |
| --- | --- | --- |
| RNF-01 | Permisos de servidor, sesiones HttpOnly y SameSite, Secure en HTTPS, vencimiento e inactividad, rechazo de orígenes ajenos | HTTPS en intranet, identidad institucional, controles de privacidad y revisión de seguridad. Localhost usa HTTP |
| RNF-02 | Contenido de documentos conservado por versión y comparación SHA-256 | Custodia y firma criptográfica con certificado, almacenamiento protegido e infraestructura institucional |
| RNF-03 | Registros persistentes, transacciones, reintentos y prevención de duplicados | Alta disponibilidad, contingencias y monitoreo del firmador real |
| RNF-04 | Comandos locales de respaldo consistente y restauración con copia previa e invalidación de sesiones | Política y copias externas, recuperación ante desastre y objetivos acordados con DITI |
| RNF-05 | Interfaz adaptable, controles con texto, foco visible, navegación por teclado y modo oscuro | Auditoría formal de accesibilidad con usuarios y tecnologías de asistencia |
| RNF-06 | Compilación y consultas locales ligeras, paginación visual en reportes y bitácora | No se certifica la meta de dos segundos bajo una carga institucional no definida |
| RNF-07 | Aplicación web comprobada en navegador de escritorio y vista móvil emulada, OCR con imagen de prueba | Cámara física, móviles reales, navegador institucional y estación DNIe con lector |
| RNF-08 | Bitácora consultable por perfiles autorizados y sin operación pública de edición | Custodia externa, segregación de funciones, alertas y protección ante administradores del almacenamiento |

## Alternativa al lector

La lectura óptica obtiene el número impreso y siempre exige revisión. Funciona con cámara o una imagen, sin acceso al chip. La foto se procesa dentro del navegador y no se almacena en el servidor.

Web NFC se limita a NDEF y no brinda operaciones de bajo nivel como ISO-DEP. Esto impide usar la API web NFC de esta solución como lector del chip del DNIe. No se concluye que todo desarrollo nativo con NFC sea imposible: requeriría evaluar la versión de tarjeta, los protocolos, la aplicación nativa y la compatibilidad, elementos que no están disponibles en este encargo.

## Decisiones del desarrollo

La solicitud del usuario autorizó elegir una tecnología sencilla y preparar una alternativa al lector. Se escogieron React, TypeScript y Node.js con SQLite, en lugar de la propuesta Laravel y MySQL de la guía. La imagen de muestra, las cuentas, las cifras y las observaciones clínicas fueron creadas para esta demostración. La entrega no representa una implementación aprobada por el hospital.
