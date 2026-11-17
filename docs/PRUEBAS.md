# Comprobaciones de la entrega

El proyecto se comprueba con pruebas de integración sobre SQLite y una revisión funcional en navegador. Se usan exclusivamente registros ficticios. Las pruebas automáticas no reemplazan las pruebas del firmador, del lector ni de infraestructura institucional.

## Pruebas automatizadas

Ejecutar `npm test`. Se incluyen:

- Acceso sin sesión, contraseña incorrecta y atributos de la cookie.
- Rechazo de solicitudes fuera de rol, servicio, registro y autoría.
- Agenda vinculada a historia y episodio; apertura repetida sin duplicar la atención.
- DNI con ceros iniciales, dígito verificador, formato TD1, lecturas ambiguas y formatos descartados.
- Ejecución del motor OCR real sobre la muestra PNG incluida.
- Farmacia sin acceso a la nota ni a sus campos clínicos y con bloqueo de recetas pendientes.
- Cobertura inicial de 17/20, denominador cero y periodo inválido.
- Rechazo y falta de respuesta del firmador manteniendo pendientes.
- Firma de solo la nota sin completar la historia ni habilitar la receta.
- Comparación SHA-256 del original y rechazo de una copia alterada, incluso si solo cambia un espacio.
- Solicitudes simultáneas de firma sin duplicar la constancia.
- Dos solicitudes de dispensación con una sola entrega registrada.
- Nueva versión de una atención firmada conservando el contenido anterior.
- Ediciones simultáneas con rechazo de la versión obsoleta.
- Registro y firma de enfermería sin acceso al contenido de la nota médica.
- Cambios de permisos que revocan sesiones y restricción del detalle de Supervisión.
- Inactividad de sesión y rechazo de solicitudes de otro origen.
- Bitácora con eventos y sin operación de borrado.

La compilación `npm run build` verifica los tipos de TypeScript y genera los recursos de la interfaz y las entradas de servidor. `npm audit` comprueba los avisos de las dependencias instaladas en el momento de la revisión.

## Recorrido en navegador

Se revisa el acceso, la agenda, el OCR, la búsqueda confirmada del DNI `00000014`, la atención del Paciente 014, la vista previa, el rechazo, las dos firmas simuladas, la comparación de integridad, la descarga de PDF, el reporte de cobertura y la dispensación.

También se comprueban la navegación con el selector de perfiles, la presentación en modo oscuro y el ajuste de la interfaz a una ventana móvil emulada. Las tablas anchas conservan desplazamiento horizontal en pantallas pequeñas.

## Comprobación de persistencia y respaldo

El servidor local utiliza `data/sigeshrl.sqlite`; reiniciar el proceso no recrea ni borra los registros. El sembrado inicial usa un marcador de versión y solo agrega los datos de prueba en una base nueva. Los comandos de respaldo y restauración operan con copias consistentes de SQLite.

La restauración debe ensayarse sobre una base de prueba y con el servidor detenido. Tras restaurar se comprueban el número de documentos y la bitácora, y se exige volver a iniciar sesión. No usar la base de una exposición en curso para ensayar la recuperación.

## Límites de la verificación

No se prueba un DNI físico, una cámara física, un teléfono real, un lector smartcard, un certificado de RENIEC, un servicio de revocación, el SIHCE ni una integración con la red del hospital. No se certifica accesibilidad formal, seguridad de producción ni la carga institucional de dos segundos, que depende de condiciones que la guía deja por definir con DITI.
