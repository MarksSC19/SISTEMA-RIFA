# Investigación de boletos y contraseñas — 5 de octubre de 2026

Se consultó origin/main mediante git fetch, el historial de emisión/autenticación, los archivos históricos locales y el panel de producción con la sesión existente del supervisor. No se emitieron, anularon, reasignaron ni editaron boletos reales; no se probaron ni cambiaron contraseñas reales.

## Evidencia actual

- Producción informa versión 1.5.0, commit fa5992a660fa664253f9756fc69616761306ef7d y PostgreSQL conectado. Es el mismo commit final publicado el 3 de octubre; GitHub main no presenta actualizaciones posteriores al consultar.
- Hay 75 boletos en la base de datos. El panel muestra 75 vendidos y S/ 750.00.
- Rosa conserva 12 boletos, 601–612, asociados a su cuenta original. El informe local del 25 de septiembre también registra 12 ventas. La auditoría muestra las 12 emisiones, entre el 18 y el 20 de septiembre, hora de Lima; la última corresponde al 612.
- La auditoría visible incluye emisiones posteriores 613–620 del vendedor adm-31 el 30 de septiembre. No son de Rosa. Los registros visibles no muestran anulación de sus 12 boletos; la ausencia de un evento histórico no prueba que nunca se haya realizado una operación no auditada.
- Se conservan compras repetidas: Max Jhonatan (608 y 609), Lourdes (604 y 605) y Valeria (611 y 612). Repetir comprador/DNI no es una causa automática de eliminación.
- Su rango actual estable es 661–680. Los 12 boletos históricos siguen visibles y mantienen sus códigos. La cuenta alternativa archivada estaba sin boletos; no se mezclaron ni trasladaron ventas.

## Fallos históricos confirmados en Git

1. En 6deacdf, server/routes/tickets.ts interpreta el ID adm-1789761050275 como número de administrador y lo limita a 31. Por eso Rosa y adm-31 compartían el rango 601–620. Otros IDs basados en fecha sufrían el mismo problema.
2. En la misma versión, TicketRegistrationModal captura un fallo de API y genera boletos locales con código RF-… y QR. Esos certificados podían compartirse sin haberse guardado. La sincronización posterior sustituía la lista en pantalla por la respuesta de PostgreSQL, haciendo desaparecer esos registros locales. El código oficial histórico del servidor tiene formato TK-024-…; el actual TK-… . Un código RF-… es un indicio fuerte del mecanismo local, y debe cotejarse individualmente.
3. El login antiguo aceptaba DNI como clave aunque el hash ya fuera de una contraseña personalizada y ejecutaba UPDATE password_hash, must_change_password=true. Así podía restablecer una contraseña sin una acción administrativa explícita.
4. analyze_production.cjs y .js probaban todas las cuentas con password=dni. Con aquel login, un supuesto diagnóstico podía provocar ese restablecimiento. El informe histórico que etiqueta a Rosa como NUNCA_INICIO_SESION no permite esa conclusión: tener contraseña temporal no demuestra nunca haber entrado. Se deshabilitaron ambos scripts locales para evitar repetir esa operación.

## Correcciones ya en producción y verificación

La eliminación de certificados locales está en d2985d0; la autenticación estricta y las transacciones de boletos en 575ead1; el rango estable en b6595c0. Se integraron mediante 1404b47 el 2 de octubre. Los ajustes finales del 3 de octubre conservan ventas históricas y archivan únicamente el duplicado vacío de Rosa. La migración no altera hashes ni obliga a repetir cambios de clave.

Se amplió la regresión con dos compras separadas del mismo comprador: códigos diferentes y persistentes después de nuevo login y migración; intento de acceso con DNI no modifica el hash ni must_change_password. Las pruebas usan datos ficticios en PGlite, no producción. Resultado: 100 comprobaciones HTTP y verificaciones de migración aprobadas; npm run lint también aprobado. No fue necesario un nuevo despliegue para activar estas protecciones: se verificaron en el commit ya desplegado. Los cambios de esta investigación son el informe local, pruebas adicionales y deshabilitación de los diagnósticos locales peligrosos.

## Diagnóstico y recuperación pendientes

### Contraste específico de las 15 ventas declaradas

La declaración de 15 ventas puede ser correcta comercialmente aunque PostgreSQL conserve 12 registros. No corresponde deducir que Rosa solo cobró 12 ni desestimar los tres comprobantes faltantes. Los informes históricos locales ya contienen totalSold=12, y las 12 emisiones visibles preceden a las correcciones de octubre. Esto no respalda la hipótesis de que la actualización del 2–3 de octubre borró tres registros persistidos, pero no excluye ventas locales o una operación histórica no auditada.

Se revisaron los diffs de migración y sincronización: b6595c0 asigna números estables de talonario y no borra tickets; 4556fc6 deja de cargar la lista inicial desde caché y comienza desde el servidor; d2985d0 elimina la generación local tras fallo de API. El cambio de lectura pudo hacer evidente una diferencia ya existente entre registros locales y servidor, sin demostrar por sí mismo que las tres ventas concretas fueran locales. No hay en Git un respaldo completo de los compradores/códigos perdidos: Git versiona el código, no el historial de filas de PostgreSQL.

Plan de conciliación: obtener las 15 constancias entregadas o, como mínimo, las tres faltantes; cotejar cada código con boleto, número, titular, propietario y estado. Si aparece un registro de otra cuenta, corregir la asociación únicamente tras acreditar su titularidad; si está anulado, revisar causa y trazabilidad; si nunca persistió, recuperar desde una copia histórica de base de datos cuando exista o reconstruir con el comprobante. Un código/número ocupado requiere resolver el conflicto antes de emitir sustitutos. La diferencia de tres es provisional hasta recibir las constancias; no se crearon tres ventas ficticias para igualar el contador.

El relato es compatible con certificados locales y colisión de rangos, pero no se puede atribuir cada boleto faltante sin sus códigos, compradores y fechas. No hay evidencia suficiente para afirmar que alguien borró las tres ventas relatadas. Se solicitaron esos datos y el DNI usado para entrar.

Antes de emitir reemplazos se debe comprobar cada código original. Si existe, conservarlo y revisar propietario/estado. Si es un certificado local, cotejar número, comprador, comprobante y disponibilidad histórica: un número ya vendido a otra persona no se puede asignar de nuevo. La restauración requiere evidencia específica, y no se inventarán ventas ni se reemplazarán códigos a ciegas.
