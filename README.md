# SIGESHRL Historia clínica y firma simulada

Aplicación académica construida a partir de `Guia_SIGESHRL_Firma_Digital.docx`. Conecta la agenda, el registro clínico, la bandeja de firmas, la cobertura y Farmacia. Incorpora lectura óptica del número de DNI mediante cámara o imagen, con revisión humana obligatoria, sin necesitar un lector físico.

**Todo el contenido clínico y las cuentas son ficticios. La firma y la dispensación son simuladas.** La aplicación no consulta RENIEC, no lee el chip del DNIe y no emite firmas digitales IOFE. Puede reconocer el número impreso de un documento; la búsqueda posterior solo encuentra pacientes de la base de demostración.

## Abrir la aplicación

En esta computadora las dependencias están instaladas. Abre `INICIAR.cmd` o, desde la carpeta del proyecto en VS Code:

```powershell
npm start
```

Visita [http://localhost:5173](http://localhost:5173). Si el puerto está ocupado porque ya está abierta, utiliza esa dirección. La aplicación debe permanecer ejecutándose mientras se usa.

En otra computadora con **Node.js 22.16 o posterior** (recomendado Node.js 24 LTS), instala y compila una vez:

```powershell
npm ci
npm run build
npm start
```

La instalación inicial requiere Internet. Después, el servidor, las pantallas y el motor OCR funcionan localmente sin servicios de pago. Los archivos de reconocimiento en español se incluyen en `public/ocr` al instalar. No requieren un servicio externo de OCR.

Para editar con reconstrucción de la interfaz y reinicio automático del servidor:

```powershell
npm run dev
```

Actualiza el navegador después de cambiar la interfaz. El desarrollo usa el mismo puerto 5173; detén la ejecución anterior antes de iniciarlo.

## Cuentas de demostración

Contraseña común: **`Demo2026!`**. El selector del acceso completa la cuenta elegida. El selector superior permite cambiar de cuenta de prueba mediante una nueva autenticación en el servidor.

| Usuario | Función | Ámbito |
| --- | --- | --- |
| medico | Dra. Lucía Mendoza | Sus atenciones de Consulta Externa y sus documentos |
| enfermeria | Lic. Andrea Torres | Atenciones asignadas al servicio y sus registros de enfermería |
| admision | Rosa del Carmen Ruiz | Agenda e identificación en Consulta Externa |
| supervision | Dr. Gabriel Salas | Cobertura de los tres servicios y detalle adicional autorizado |
| farmacia | Q. F. Elena Ríos | Recetas vigentes y dispensación en Consulta Externa |
| admin | Carlos Vega | Habilitación de cuentas, permiso de detalle y auditoría |

Existe una cuenta adicional `medico.otros` para comprobar el aislamiento de Hospitalización. No aparece en el selector habitual. El permiso adicional de Supervisión se puede retirar desde Administración; el resumen continúa disponible y el detalle se bloquea.

Estas credenciales son públicas dentro del proyecto y sirven exclusivamente para la exposición. No usar la aplicación con datos reales ni como sistema hospitalario de producción.

## Recorrido recomendado

1. Entra como **Médico** y abre **Identificar DNI**.
2. Pulsa **Probar con una muestra ficticia**. Se ejecuta OCR sobre `public/dni-ejemplo.png`; no se precarga un resultado falso.
3. Revisa el número **00000014**, marca la confirmación y busca el registro.
4. Abre la atención del **Paciente 014**, con historia **HC-DEMO-014**.
5. Revisa la nota y la receta. Ambas comienzan pendientes. No necesitas volver a guardar el registro si no lo has modificado.
6. En la bandeja elige **Certificado de prueba rechazado** y simula un intento. El documento sigue pendiente.
7. Elige **Simulación satisfactoria** y firma los dos documentos. La marca puede ubicarse a la izquierda o derecha de la última página.
8. Comprueba la integridad del original; descarga el JSON y el PDF académico. Una copia cuyo `rawPayload` cambie debe fallar la comparación.
9. Cambia a **Supervisión** y revisa el periodo que incluya las fechas iniciales. Consulta Externa pasa de **17/20 = 85 %** a **18/20 = 90 %** al completar ambos documentos del caso.
10. Cambia a **Farmacia**, busca al Paciente 014, revisa la receta y registra una entrega simulada. Un reintento no genera una segunda dispensación.
11. En **Administración** o **Supervisión**, revisa la bitácora autorizada.

Los pacientes tienen DNI ficticios correlativos: por ejemplo `00000013`, `00000014` y `00000015`. Los casos iniciales se crean la primera vez que inicia el proyecto. Si expones otro día, cambia la fecha de agenda a la fecha inicial o el periodo del reporte para incluirla. El caso 014 tiene cita a las 09:00 en esa fecha.

## Lectura por cámara o imagen

- **Usar cámara** solicita el permiso del navegador y permite capturar una imagen. La cámara requiere `localhost` o HTTPS. La existencia y calidad de la cámara dependen del equipo.
- **Cargar imagen** acepta JPG, PNG, WebP y BMP de hasta 12 MB.
- El motor Tesseract.js reconoce el texto en el navegador. La fotografía no se sube al servidor. Se descarta de la interfaz al salir del módulo; no se almacena en la base de datos.
- Se muestra el texto reconocido y, si hay varios números posibles, las alternativas para revisión. El número confirmado se envía al servidor para buscar una cita autorizada.
- Hay entrada manual de ocho dígitos cuando la fotografía tiene reflejos, poca resolución o el reconocimiento no funciona.
- La muestra incluida tiene una advertencia visible y **no reproduce un documento oficial**.

OCR no certifica que el documento sea auténtico ni que pertenezca a quien lo presenta. Escribir o leer un DNI no crea una cuenta ni otorga permisos.

## Qué representa la firma

El servidor conserva una copia JSON inmutable del contenido de cada documento y una huella SHA-256 en la constancia de simulación. Registra el firmante de prueba, fecha, posición de la marca y resultado del intento. Un fallo conserva el pendiente y admite reintento.

La huella comprueba coincidencia de contenido. **No es una firma criptográfica con certificado ni valida identidad, cadena de confianza, vigencia, revocación o sello de tiempo.** El PDF exportado es una representación académica y tampoco está firmado digitalmente. Para corregir un documento ya firmado en la demo se genera una nueva versión, conservando la anterior y su constancia.

El punto de sustitución para un firmador real es la operación `POST /api/documents/:id/sign`, descrita en [el diseño de integración](docs/INTEGRACION.md). La incorporación de Firma Perú u otro componente requiere documentación, permisos y pruebas de la DITI.

## Implementación

| Parte | Tecnología |
| --- | --- |
| Interfaz | React 19, TypeScript y CSS adaptable |
| Compilación | esbuild; no necesita Laravel, PHP ni MySQL |
| Servidor | Hono con Node.js en local y entrada compatible con Workers |
| Datos locales | SQLite del propio Node.js, en `data/sigeshrl.sqlite` |
| OCR | Tesseract.js y datos de español servidos desde el proyecto |
| Documentos | Copia JSON, huella SHA-256 y PDF académico |
| Pruebas | Pruebas de integración de API y lectura de DNI |

El servidor comprueba los permisos de rol, servicio y registro, además de autoría para la firma. En esta demostración, Admisión y Enfermería tienen asignado el ámbito de Consulta Externa; la asignación individual de enfermería debe adaptarse al flujo real del hospital. Farmacia no recibe el contenido de la nota clínica. Administración no puede abrir la atención por el solo hecho de ser administrador.

Las contraseñas de prueba se guardan con PBKDF2 y sal independiente. Las sesiones usan cookies HttpOnly y SameSite Strict; el atributo Secure se activa en HTTPS. Caducan tras 30 minutos sin actividad del servidor o al cumplir ocho horas. Las mutaciones comprueban el origen y un encabezado de aplicación. Los cambios de permisos revocan las sesiones de la cuenta afectada.

Las operaciones relacionadas se agrupan en transacciones. La firma y la dispensación tienen una restricción única por documento para evitar duplicados concurrentes. La edición utiliza una versión y un identificador de operación para rechazar cambios simultáneos obsoletos.

No se almacena información clínica en `localStorage`. Solo se conserva allí la preferencia visual. El almacenamiento institucional cifrado, las copias externas, el endurecimiento, la supervisión de seguridad y los niveles de servicio quedan fuera de esta demostración.

## Respaldo y recuperación local

Con la aplicación funcionando puedes crear una copia consistente:

```powershell
npm run db:backup
```

Se guarda en `backups/`. Para restaurar, detén antes el servidor y ejecuta:

```powershell
npm run db:restore -- "backups/nombre-del-respaldo.sqlite" --confirm
```

La restauración comprueba la integridad y el tipo de archivo, conserva una copia previa de la base actual y cierra las sesiones recuperadas. No elimina documentos individualmente. Conserva los respaldos fuera del repositorio; contienen todos los datos y cuentas de esta demostración.

Las bases local y alojada, si se usa la publicación privada, son independientes. Este comando respalda únicamente la base local. Para un despliegue real deben acordarse con DITI la frecuencia, custodia, pérdida tolerable y tiempo de recuperación.

## Revisión del proyecto

```powershell
npm test
npm run build
npm audit
```

Consulta [la matriz de alcance](docs/ALCANCE.md) y [las comprobaciones de entrega](docs/PRUEBAS.md). La guía original proponía Laravel y MySQL; aquí se eligió React y un servidor de JavaScript con SQLite para simplificar la instalación, siguiendo la solicitud del grupo.

## Fuentes para la decisión sobre DNIe

- [Chrome Web NFC](https://developer.chrome.com/docs/capabilities/nfc): su alcance es NDEF y no expone operaciones de bajo nivel como ISO-DEP.
- [RENIEC DNI electrónico](https://identidad.reniec.gob.pe/es/dni-electronico): información y controladores para el DNIe.
- [RENIEC Actualizar PIN](https://www.gob.pe/institucion/reniec/pages/99724-actualizar-pin-de-seguridad): requisitos del procedimiento con lector compatible.
- [Tesseract.js](https://github.com/naptha/tesseract.js): motor OCR utilizado y licencia Apache 2.0.

La guía suministrada se tomó como especificación funcional de referencia. Sus propuestas tecnológicas y futuras integraciones no se presentaron como servicios ya disponibles ni como autorizaciones para acceder a sistemas del hospital.
