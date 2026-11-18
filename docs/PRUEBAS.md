# Comprobaciones del avance

`npm test` ejecuta 26 comprobaciones sobre datos ficticios y una base SQLite en memoria. Pasan tras migrar a React y Vite.

- Sesión, contraseñas, cookies, permisos por rol, servicio, autor y registro.
- Agenda, apertura sin duplicados, versiones y control de ediciones simultáneas.
- DNI impreso, MRZ, ceros iniciales, dígito verificador y lecturas ambiguas.
- Motor OCR real con la muestra ficticia incluida.
- Formatos de escáner: texto, JSON, campo etiquetado y parámetro de URL; rechazo de códigos desconocidos.
- Firma simulada satisfactoria y fallida, comparación SHA-256 y conservación del original.
- Cobertura por historias, denominador cero y entregas de Farmacia sin duplicados.
- Permisos de enfermería, supervisión y administración, vencimiento y rechazo de otro origen.
- Prueba NFC con un certificado autofirmado generado en memoria y firma RSA real: se rechazan contenido alterado, firma inválida, DNI distinto, solicitudes vencidas y repetidas. Una prueba correcta conserva la receta pendiente y no crea una firma clínica.

`npm run build` genera la interfaz con Vite y empaqueta el servicio local y el Worker. No es un comprobador de tipos. `npm audit` no informó vulnerabilidades en la revisión de esta entrega.

El APK se compila con Java y Android SDK. `apksigner verify` comprueba sus firmas de paquete v2 y v3. Esto verifica la integridad del instalador, no la compatibilidad con un DNIe físico.

## Revisión en navegador

La revisión se centra en acceso, navegación de React Router, escáner, QR ficticio decodificado, revisión de DNI, apertura de atención, documentos y solicitud NFC. El recorrido de firma simulada, cobertura y Farmacia tiene además comprobación automática de extremo a extremo en la API.

## Límites

No se ha probado la cámara física, un escáner USB físico, el APK instalado en Android ni el chip de un DNIe real. Tampoco la cadena de confianza, revocación de certificados, PAdES, SIHCE o la red del hospital. No se certifica seguridad de producción, accesibilidad formal ni rendimiento institucional.

Las pruebas no modifican la base que se usa para exponer. Reiniciar conserva los datos; las migraciones se aplican una sola vez. Los comandos de respaldo y restauración siguen disponibles y deben ensayarse con una base de prueba y el servidor detenido.
