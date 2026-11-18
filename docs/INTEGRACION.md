# Diseño propuesto del intercambio SIGESHRL SIHCE

Este contrato es una propuesta académica para RF-10. No representa una API confirmada por el Hospital Regional Lambayeque ni por MINSA. La DITI debe validar el sistema de destino, los identificadores, formatos, permisos y mecanismo de firma antes de desarrollar un conector real.

## Frontera con el firmador

La operación local `POST /api/documents/{documentId}/sign` comprueba sesión, ámbito, autoría, versión y vigencia. Actualmente recibe un resultado de simulación. En un piloto debe sustituir ese resultado por un adaptador al firmador aprobado, manteniendo el flujo de estados.

1. Recuperar en el servidor la versión autorizada y producir el PDF institucional completo.
2. Entregar los bytes exactos al componente de firma mediante un canal autenticado.
3. Introducir el PIN únicamente en el componente de firma aprobado, cuando corresponda. No enviarlo a la API clínica ni registrarlo en la bitácora.
4. Recibir el original firmado y comprobar la firma criptográfica, integridad, identidad del certificado, confianza, vigencia, revocación y autorización hospitalaria para ese acto.
5. Conservar los bytes originales firmados, el resultado de verificación y el vínculo con documento, versión y firmante. La huella del JSON de esta demo no sustituye esas validaciones.
6. Actualizar el estado solo tras verificación satisfactoria. Mantener el pendiente si el componente falla o rechaza la firma.

La clave privada y el PIN no viajan a la API ni en mensajes de intercambio clínico. La prueba NFC devuelve el certificado público y la firma del desafío para su comprobación. Firma Perú es una opción de evaluación; esta entrega no incluye sus credenciales ni declara estar integrada a esa plataforma.

La prueba separada `POST /api/nfc/challenges` prepara un desafío de diez minutos asociado a autor, documento, versión, DNI esperado y huella SHA-256. El APK firma sus bytes UTF-8 si puede acceder al chip. `POST /api/nfc/challenges/{id}/verify` comprueba correspondencia exacta, vigencia, DNI y RSA/SHA-256, y guarda una constancia técnica de un solo uso. No valida confianza o revocación y por ello no modifica `documents.status`, no crea una fila de firma clínica y no habilita Farmacia. No produce PAdES. El PIN solo se introduce en la app Android y se transmite al chip, sin acceso a Internet.

## Identificadores y datos

| Campo propuesto | Significado |
| --- | --- |
| eventId | UUID estable del evento. Un reintento conserva el mismo valor |
| sourceSystem | Identificador del emisor aprobado por DITI |
| appointmentId | Cita de origen en SIGESHRL |
| encounterId | Episodio de atención |
| patientId | Identificador interno del paciente, con correspondencia aprobada |
| medicalRecordId | Historia clínica, sin asumir que el DNI sea su identificador |
| documentId y version | Documento y versión inmutable |
| documentType | Tipo de documento del catálogo acordado |
| serviceCode | Código institucional de servicio |
| professionalId | Cuenta o identificador profesional autorizado |
| signedAt | Fecha y hora ISO 8601 con zona o UTC |
| contentSha256 | Huella de los bytes del original firmado que se intercambia |
| contentType | Tipo del original, por ejemplo application/pdf |
| originalReference | Referencia interna protegida; nunca una URL pública permanente |
| verification | Resultado de la validación y referencias a evidencia protegida |

Ejemplo ficticio de notificación después de una firma real verificada en un futuro piloto:

```json
{
  "eventId": "0bda90c6-77a9-45dd-93c1-a812343ac412",
  "sourceSystem": "SIGESHRL_PILOTO",
  "eventType": "clinical.document.signed",
  "appointmentId": "cita-014",
  "encounterId": "at-014",
  "patientId": "p014",
  "medicalRecordId": "HC-DEMO-014",
  "documentId": "receta-014-v1",
  "version": 1,
  "documentType": "PRESCRIPTION",
  "serviceCode": "CE_DEMO",
  "professionalId": "profesional-de-prueba",
  "signedAt": "2026-11-17T14:00:00Z",
  "contentSha256": "<64 caracteres hexadecimales del PDF firmado>",
  "contentType": "application/pdf",
  "originalReference": "<referencia protegida acordada con DITI>",
  "verification": {
    "status": "VALID",
    "evidenceReference": "<referencia de verificación>"
  }
}
```

El ejemplo muestra la forma del contrato, no evidencia una firma o un intercambio ejecutados. Los códigos y las direcciones definitivas no han sido proporcionados.

## Transporte y respuesta

Propuesta: API HTTPS con JSON UTF-8, autenticación de servicio aprobada por DITI y una clave de idempotencia igual a `eventId`. Los originales grandes se transfieren por una operación separada protegida o por el mecanismo que el destino admita. El servidor no debe descargar direcciones arbitrarias indicadas por el navegador.

Respuesta propuesta al aceptar el evento:

```json
{
  "eventId": "0bda90c6-77a9-45dd-93c1-a812343ac412",
  "status": "ACCEPTED",
  "destinationRecordId": "<identificador del destino>",
  "receivedAt": "2026-11-17T14:00:02Z"
}
```

| Respuesta propuesta | Tratamiento |
| --- | --- |
| 200 o 201 con ACCEPTED | Guardar el acuse y marcar la entrega confirmada |
| 200 con ALREADY_ACCEPTED | Considerar el mismo evento entregado; no duplicar el registro |
| 400 o 422 | Marcar error de contrato y derivar a revisión; no reintentar sin corregir |
| 401 o 403 | Detener el conector y revisar credenciales o permisos |
| 404 | Revisar correspondencia de historia, episodio o documento |
| 409 | Comparar versión, identificador y huella; no sobrescribir originales |
| 429, 502, 503 o timeout | Mantener el evento pendiente y reintentar con la misma clave |

## Reintentos y auditoría

En el piloto, usar una bandeja de salida persistente vinculada a la transacción de firma. Un proceso autorizado entrega los eventos, registra intentos y conserva el acuse. Propuesta inicial de espera: 30 segundos, 2 minutos y 10 minutos, seguida de revisión tras cinco intentos. Es una política de diseño que debe acordarse con DITI, no una cola implementada en esta demostración.

Un timeout no demuestra que el destino no procesó el evento. Antes de repetir, consultar por `eventId` cuando el destino lo permita; mantener la idempotencia en ambos extremos. La entrega clínica y la dispensación farmacéutica son operaciones distintas y necesitan sus propios identificadores.

La bitácora institucional debe registrar identificador de evento, documento, versión, usuario o servicio, fecha, resultado y código de error, sin almacenar PIN, claves privadas, tokens ni contenido clínico innecesario.

## Decisiones que debe confirmar la DITI

- Tecnología y proveedor de SIGESHRL y SIHCE, interfaz disponible y ambientes de prueba.
- Catálogos e identificadores, contenido mínimo, original canónico y formato de firma.
- Firmador, cadena de confianza, servicios de revocación y sellado de tiempo.
- Identidad institucional, permisos de servicio y registro, cuentas con varios roles y segregación.
- Reglas de contingencia, trazabilidad, custodia, retención, respaldo y recuperación.
- Definición y periodo de la línea base del 60 %, despliegue por servicios y capacitación.
