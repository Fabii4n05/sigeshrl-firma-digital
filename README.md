# SIGESHRL · React + Vite

Avance académico basado en `Guia_SIGESHRL_Firma_Digital.docx`: agenda, atención, documentos, firma, cobertura y Farmacia. La interfaz usa **React, Vite, JSX, React Router y CSS separado**, siguiendo la organización de AdminLab. No utiliza su base de datos ni sus claves.

## Abrir en VS Code

Abre esta carpeta y, en la terminal, ejecuta:

```powershell
npm install
npm run dev
```

En esta computadora las dependencias ya están instaladas. Visita **http://localhost:5173**. Vite actualiza las pantallas al guardar; el servicio local escucha en el puerto 3001. Deja la terminal abierta. Requiere Node.js **22.16 o posterior**; recomendado 24 LTS.

Para preparar y abrir la versión compilada:

```powershell
npm run build
npm start
```

`INICIAR.cmd` también prepara y abre la versión compilada. Detén la ejecución anterior antes de ocupar de nuevo el puerto 5173. `npm run preview` sirve la interfaz compilada y necesita el servicio iniciado por separado con `npm run dev:api`.

## Recorrido para mostrar el avance

1. Ingresa como **medico**, contraseña **Demo2026!**.
2. Abre **Escáner de DNI**. Pulsa **Probar QR ficticio**: se genera y decodifica un QR real de prueba.
3. Confirma **00000014**, busca su cita y abre la atención del **Paciente 014**, historia **HC-DEMO-014**.
4. Revisa la nota y la receta. En **Documentos y firma**, prueba primero un rechazo y luego la firma simulada satisfactoria en ambos documentos.
5. Cambia a **Supervisión**: en el periodo de los casos iniciales, la cobertura pasa de **17/20 = 85 %** a **18/20 = 90 %**.
6. Cambia a **Farmacia** y registra la entrega de prueba. Un reintento no duplica la entrega.

Si se usa otro día, ajusta la fecha de la agenda y el periodo del reporte para incluir los casos iniciales. Reiniciar no borra los datos.

## Escáner de DNI

- **Cámara en vivo, códigos:** QR, PDF417 y Code 128 que contengan un DNI legible. Los QR oficiales cifrados o con otro formato pueden no revelar el número.
- **Cámara en vivo, texto / MRZ:** OCR local con dos lecturas coincidentes. Requiere buena luz y mantener inmóvil el documento.
- **Lector USB de códigos:** modo teclado; enfoca el campo y escanea. No lee el chip inteligente.
- **Ingreso manual:** permite continuar si el documento no se reconoce.
- **Última alternativa:** cargar una imagen de hasta 12 MB.

Siempre se revisan los ocho dígitos. La cámara no guarda ni sube imágenes; el motor OCR se ejecuta en el navegador. Cámara disponible en `localhost` o HTTPS. La búsqueda consulta únicamente los registros de prueba de esta aplicación, sin RENIEC. Escanear un documento no autentica a su titular.

## DNIe con el celular Android NFC

Se incluye **public/android/SIGESHRL-Lector-NFC.apk** y su fuente en **android-nfc/**. Es una prueba nativa experimental: la web por sí sola no puede enviar los comandos ISO-DEP que necesita el chip. Web NFC se limita a NDEF ([Chrome](https://developer.chrome.com/docs/capabilities/nfc)).

1. En Android 8 o posterior con NFC, descarga e instala el APK del proyecto. Activa NFC y abre **SIGESHRL Lector NFC**.
2. Acerca el DNIe a la antena posterior. Se intenta leer el certificado **sin PIN**, reconociendo los perfiles 2.0 y 3.0. Si el chip no expone su aplicación PKI por NFC, se informa el error. No se simula una lectura exitosa.
3. En la web abre un documento propio y despliega **Probar firma del chip con Android NFC**. Escribe el DNI del titular del certificado y prepara la solicitud.
4. Copia el código al lector Android o abre su enlace desde el teléfono. Revisa titular, documento y huella. Mantén la tarjeta cerca y escribe **tu PIN personal únicamente en la app Android**; pulsa firmar.
5. Copia el resultado JSON a la web y pulsa **Comprobar firma del chip**. La solicitud vence en diez minutos y solo se acepta una vez.

La app no tiene permiso de Internet, no guarda el PIN ni la clave privada y no cambia datos del DNI. Envía el PIN al chip únicamente al pulsar firmar. Consulta los intentos disponibles y se detiene si queda uno o el contador no es accesible. **No pruebes PIN supuestos.** Si el DNI no expone PKI mediante NFC o exige un canal seguro adicional, esta prueba no podrá firmar; se necesitará un medio compatible. No se ha probado con un teléfono o DNI físico.

Los comandos se basan en los manuales oficiales de [RENIEC 2.0](https://identidad.reniec.gob.pe/documents/d/guest/manual_comandos_dnie_v2) y [RENIEC 3.0](https://identidad.reniec.gob.pe/documents/d/guest/manual_comandos_dnie_v3). Estos manuales no garantizan que el canal NFC del DNI permita todas esas operaciones.

**El resultado es una prueba criptográfica del desafío que incluye la huella del documento. No es un PDF con firma PAdES ni una firma institucional validada.** Se comprueba la firma RSA/SHA-256, la vigencia y el DNI declarado en el certificado, pero no su cadena de confianza ni revocación. Por eso se guarda como prueba separada y no habilita la receta ni cambia la cobertura. La firma simulada está identificada y permite exponer el recorrido completo.

Para recompilar el APK se necesitan Java 17 y Android SDK con plataforma y Build Tools:

```powershell
powershell -ExecutionPolicy Bypass -File android-nfc/build.ps1
```

El script acepta `-SdkPath` y `-JavaPath`. Produce un APK con firma de desarrollo; no es una aplicación publicada en Play Store. `android-nfc/build/` se excluye del repositorio y del paquete.

## Organización como AdminLab

```text
src/
  main.jsx                       ReactDOM + BrowserRouter + CSS
  App.jsx                        Rutas y sesión
  pages/
    public/                      Acceso y guía
    clinical/                    Agenda, escáner, atención y firma
    supervision/                 Cobertura
    pharmacy/                    Farmacia
    admin/                       Accesos y bitácora
  components/
    layout/                      Menú y cabecera
    shared/                      Controles y rutas protegidas
    clinical/                    Documento y prueba NFC
  css/
    global/                      Diseño general
    pages/clinical/              Escáner y prueba NFC
  lib/                           API, OCR, lector, PDF y utilidades
server/                          API Hono y SQLite local; TypeScript
drizzle/                         Migraciones de base de datos
android-nfc/                     Lector nativo Java sin dependencias externas
public/                          APK, motor OCR y muestra ficticia
tests/                           Comprobaciones del recorrido y criptografía
vite.config.js                   Vite y conexión con API local
```

El servidor conserva TypeScript; la interfaz se desarrolla en JSX como AdminLab. SQLite evita instalar MySQL para este avance. La publicación usa la misma API con almacenamiento D1. Las migraciones conservan los registros existentes.

## Cuentas

Contraseña común: **Demo2026!**. El selector superior permite cambiar el perfil de demostración.

| Usuario | Módulo |
| --- | --- |
| medico | Agenda, atención y documentos propios |
| enfermeria | Atención y registro propio de enfermería |
| admision | Agenda e identificación |
| supervision | Cobertura y detalle autorizado |
| farmacia | Recetas y entrega de prueba |
| admin | Accesos y auditoría |

Todas las cuentas y pacientes son ficticios. Los permisos se comprueban en el servidor por rol, servicio, autor y relación con el registro. No es un sistema para atención hospitalaria real.

## Comprobaciones y respaldo

```powershell
npm test
npm run build
npm audit
npm run db:backup
```

La base local está en `data/sigeshrl.sqlite`, excluida del ZIP y del repositorio. `npm run db:restore -- ruta-de-copia.sqlite` permite restaurar con el servidor detenido y crea una copia previa. Consulta **docs/PRUEBAS.md**, **docs/ALCANCE.md** y **docs/INTEGRACION.md** para el detalle y los pendientes institucionales.
