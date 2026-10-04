# Auditoría funcional — 3 de octubre de 2026

## Correcciones aplicadas posteriormente

El usuario autorizó aplicar y desplegar las correcciones. Se resolvió la fusión local conservando la autenticación segura. El código se publicó desde una copia limpia basada en main remoto para evitar publicar los reportes locales de producción.

- Retirada recuperable de administradores con filtro de archivados y restauración; boletos válidos y anulados conservados; supervisor protegido por rol.
- Confirmación explícita de nombres repetidos para permitir homónimos legítimos sin crear duplicados accidentalmente.
- Migración conservadora de la cuenta alternativa histórica: solo la archiva si coincide con la cuenta sintética conocida, existe la original y no tiene ningún boleto. No modifica el DNI de la titular ni reasigna sus ventas.
- Métricas por ID y campaña, con suma del precio pagado. Las metas cuentan vendedores activos, incluido el supervisor que tiene talonario. La recaudación histórica permanece aunque se archive o desactive una cuenta.
- Capacidad ampliada al crear/reasignar administradores y migrar talonarios existentes; campañas nuevas no heredan cuotas de otras campañas.
- Auditoría administrativa transaccional y conservación de resultados anteriores al reiniciar premios; validación estricta de autorización y estados de sorteo.
- Verificación anónima por código de QR con nombre/DNI enmascarados y sin exponer otros códigos del comprador; búsqueda completa para sesiones autorizadas, limitada al propietario para operadores.
- Panel del vendedor conserva precios históricos y disponibilidad excluye números anulados.

Validación: 97 comprobaciones HTTP con PGlite, incluidas transacciones revertidas al fallar auditoría, archivo/restauración con ventas, homónimos, campañas, privacidad pública, precios mixtos y migración repetible con protección de historial. TypeScript y build correctos. Prueba visual con cuentas ficticias: retirada, filtro de archivados, restauración y conservación de un boleto de S/ 12 tras recargar. Permanece advertencia de tamaño del bundle (~634 kB).

El primer despliegue nuevo (`3bab0af`) quedó Live en Render y respondió versión 1.5.0, PostgreSQL conectado, 66 boletos y S/ 660. El despliegue final se está verificando; su resultado se registra al finalizar este trabajo. No se ejecutaron ventas, sorteos ni cambios de contraseñas reales para probar.

Los hallazgos siguientes describen el estado ANTERIOR a estas correcciones.

Repositorio: MarksSC19/SISTEMA-RIFA. Se actualizó origin con `git fetch origin`; main remoto apunta a `1404b476ad4c07263d3b7a70abebf93980b32353`. La copia local está en `91fa90c`, con una fusión pendiente y conflicto en `server/routes/auth.ts`. Esta revisión no resuelve la fusión ni modifica datos reales.

## Caso de Rosa: causa y alcance

La captura muestra dos cuentas con el mismo nombre, pero DNI y correo diferentes: 72095575 y 72970575. Los archivos locales `admins_prod.json` y `admins_detailed_report.json` corroboran históricamente la cuenta con 12 ventas y la alternativa sin ventas; no constituyen una consulta actual de producción.

En `git show HEAD:server/index.ts` existe un bloque de arranque que inserta expresamente `adm-23-alt`, con DNI 72970575 y correo alternativo, y ejecuta `ON CONFLICT (dni) DO UPDATE SET status = 'active'`. También reactiva el catálogo oficial en cada inicio. Es una causa directa y verificable de creación/reaparición del duplicado. El login de esa revisión también admite esta variante, autoaprovisiona usuarios y acepta el DNI como sustituto de una contraseña cambiada.

El main remoto retiró estos comportamientos. Sin embargo, no elimina ni consolida las cuentas ya creadas. La restricción UNIQUE por DNI/correo no detecta que dos identificadores diferentes representan a la misma persona. No debe imponerse nombre único: personas distintas pueden compartir nombre.

## Hallazgos vigentes en main remoto

| Prioridad | Hallazgo y evidencia | Consecuencia y corrección requerida |
|---|---|---|
| P1 | `server/routes/admins.ts:46-49` implementa DELETE como UPDATE a inactive; `SuperAdminView.tsx:225` promete eliminar; GET devuelve todos los estados. | La tarjeta sigue visible incluso después de confirmar. Definir eliminación real de cuentas sin historial y archivo/desactivación explícita para cuentas con ventas; mostrar el resultado real y separar archivados. Comprobar todos los boletos, incluidos anulados, antes de borrar. |
| P1 | No existe conciliación del duplicado histórico de Rosa. | Actualizar el código no limpia la base. Confirmar el DNI correcto con la titular, verificar ventas e historial de ambas cuentas y retirar la alternativa mediante una operación auditada. No trasladar ni borrar las 12 ventas automáticamente. |
| P1 | `src/App.tsx:502-511` actualiza ventas por email, DNI **o nombre**; `:591` decrementa por nombre. | Emitir o anular para una de dos cuentas homónimas altera temporalmente los contadores de ambas hasta la sincronización. Usar `sellerAdminId` y `raffleId`, nunca el nombre como identidad. |
| P1 | `SuperAdminView.tsx:1365-1391` calcula importes como ventas × 10; overview multiplica cantidades por el precio actual. | El panel de la captura ignora cambios de precio; el resumen revaloriza ventas antiguas si cambia la tarifa. Sumar `price_paid` de boletos válidos, por campaña y vendedor; usar tarifa vigente únicamente para la meta prevista. |
| P2 | `SuperAdminView.tsx:438,1360` excluye únicamente `adm-super`, aunque el supervisor oficial es `adm-2`; tampoco separa inactivos. | Supervisores e inactivos cuentan en la meta de operadores. Definir si el supervisor participa como vendedor y distinguir operadores activos, archivados y vendedores; calcular metas según ese criterio. El texto todavía dice 31 en `:1352`. |
| P1 | `server/routes/admins.ts:40` cambia la rifa asignada sin ampliar su capacidad; `raffles.ts` calcula capacidad con MAX de todos los usuarios. | Reasignar un talonario alto a una campaña menor permite guardar, pero después bloquea vender por rango fuera de capacidad. Validar/ampliar capacidad en la misma transacción y por campaña. |
| P1 | `admins.ts:11` cuenta ventas de la campaña asignada de cada usuario, mientras overview usa precio de rf-024 y agrega todos los usuarios. | Con varias campañas se mezclan cantidades y tarifas de rifas distintas. Devolver métricas por campaña y filtrar el panel por la seleccionada. |
| P2 | Administradores, campañas, configuración, premios y reinicio de premios no escriben auditoría persistente; App añade algunas entradas solo al estado local. | La sincronización sustituye esos mensajes por registros del servidor y se pierde la trazabilidad administrativa. Guardar actor, antes/después y acción en la misma transacción. |
| P1 | `server/routes/public.ts:32-37,83-86` permite consultar por número secuencial y devuelve nombre completo y DNI. | Cualquier visitante puede recorrer números para obtener datos personales. El nombre enmascarado adicional no protege los campos completos. Restringir la consulta pública y minimizar los datos retornados. |
| P2 | `/prizes/reset` borra resultados sin conservar un evento de reinicio; sorteo no valida el estado de campaña y `allowRedraw` se acepta por valor truthy. | El servidor admite sorteos de borradores y repetir premios con cadenas como "false". Validar booleano estricto, estados permitidos y registrar reinicios/resultados previos. La regla de estados debe acordarse con el flujo oficial. |

## Problemas exclusivos de la copia local anterior

- P0: login con autoaprovisionamiento y sustitución de contraseña por DNI. Main remoto ya lo corrige, pero el conflicto local vuelve a incluir el código inseguro. Resolver conservando autenticación estricta, sesión obligatoria y revocación de credenciales.
- P1: arranque reactiva cuentas, crea la alternativa de Rosa y sobrescribe comprador de boleto #0023. Main remoto ya retiró esas escrituras. Evitar recuperar esos bloques al resolver la fusión.
- P0 para entrega: `npm run lint` falla con TS1185 por los tres marcadores del conflicto. No es una versión compilable ni desplegable.

## Verificación y límites

- Git remoto consultado y referencias actualizadas correctamente.
- Revisión de altas/bajas, autenticación, permisos, emisión, cuotas, anulación, campañas, precios, sorteos, verificación pública y auditoría.
- `npm run lint` en el workspace: falla por conflicto de fusión.
- `npm run test:audit` en el workspace: no inicia porque falta `@electric-sql/pglite`.
- Verificación aislada del commit remoto, extraído con `git archive` en una carpeta temporal sin credenciales: TypeScript correcto; build de producción correcto (advertencia de bundle de 630.64 kB); 68 comprobaciones HTTP originales aprobadas con PGlite y datos ficticios. Estas pruebas no usan la base real ni verifican interfaz en navegador.
- Se amplió el recorrido en la copia temporal para reproducir bajas y reasignaciones. La prueba confirmó que DELETE deja el administrador inactivo dentro del listado. Crear sin campaña explícita sí amplía correctamente la campaña predeterminada; esta sospecha se descartó mediante ejecución.
- El recorrido ampliado finalizó con 75 comprobaciones HTTP: confirmó también que reasignar a una campaña pequeña devuelve éxito, pero emitir después responde 409; y que el mismo nombre con DNI/correo diferentes permite otra cuenta. Se conserva en `scripts/functional-audit-probes.ts`, ejecutable con `node scripts/run-ts.mjs scripts/functional-audit-probes.ts` sobre una copia compilable con dependencias instaladas. Las comprobaciones adicionales afirman el comportamiento defectuoso actual para reproducirlo; su aprobación NO significa que esos defectos estén corregidos. Deben convertirse en pruebas de aceptación con el comportamiento esperado al implementar las reparaciones.
- No se ingresó al panel real ni se consultó la base actual. No se verificó qué commit sirve Render hoy; los datos de producción citados son captura y reportes históricos.

## Orden de reparación

1. Resolver la fusión local conservando los controles de main remoto y ejecutar las verificaciones.
2. Corregir el contrato de eliminación/archivo, con prueba de persistencia al recargar y reiniciar. Añadir detección de posibles duplicados por nombre normalizado como aviso revisable, sin confundirlo con identidad única.
3. Conciliar Rosa con identificación confirmada y respaldo; preservar boletos, números, compradores e importes históricos.
4. Unificar contadores por ID/campaña e importes realmente pagados; definir metas de activos e inclusión del supervisor.
5. Corregir asignación/capacidad de campañas y auditoría persistente.
6. Validar sorteos y consulta pública, ejecutar pruebas en ensayo y comprobar después del despliegue. Las pruebas automatizadas previas no certifican el flujo de eliminación ni el saneamiento de datos históricos.
