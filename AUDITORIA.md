# Auditoría de SISTEMA-RIFA — 2 de octubre de 2026

Se revisó el repositorio MarksSC19/SISTEMA-RIFA, referencia original 6deacdfadeaf9615add3e34b3ebd1c52df91724d, y la interfaz desplegada en https://sistema-rifa-x4xr.onrender.com/. Las correcciones están publicadas en la rama audit-talonarios-passwords de GitHub. Todavía no están desplegadas en Render; el acceso a su panel requiere que el titular inicie sesión. La guía DESPLIEGUE-RENDER.md prepara la migración y las verificaciones.

## Correcciones implementadas

| Área | Problema encontrado | Corrección preparada |
|---|---|---|
| Inicio de sesión | El DNI podía sustituir una contraseña ya cambiada y restablecerla; se creaban administradores desde el login. | Solo usuarios registrados, activos y contraseña verificada por bcrypt. Se elimina el autoaprovisionamiento y el acceso alternativo con DNI. |
| Contraseñas y perfil | Se podía identificar una cuenta por DNI/correo sin sesión válida. | Sesión obligatoria; contraseña actual comprobada; nueva clave distinta del DNI y de la anterior; cambio de perfil restringido a la propia cuenta. |
| Sesiones | Un token antiguo seguía funcionando después de cambiar una contraseña o desactivar al administrador. | Se valida el usuario y la versión de sus credenciales en cada solicitud. Cambiar la clave revoca sesiones anteriores. |
| Cambio inicial obligatorio | Se podía saltar el modal llamando directamente a las APIs. | El servidor bloquea operaciones hasta completar el cambio obligatorio. Los restablecimientos administrativos vuelven a exigir el cambio. |
| Talonarios | IDs con fecha se convertían en el administrador 31; usuarios desconocidos heredaban el talonario 2. | Número de talonario único y persistente en la base de datos. Los nuevos administradores reciben rangos adicionales; el rango no depende de cambios de DNI o nombre. |
| Supervisión | Tabla limitada a 30 ventas y textos con cantidades fijas. | Tabla completa, cantidades dinámicas y botón «Ver talonario» por administrador, con 20 casillas y acceso directo a corregir boletos emitidos. |
| Permisos de boletos | Se podía falsificar el vendedor al emitir y anular boletos ajenos. | Validación de propietario/rol en el servidor para emitir, editar y anular. El superadministrador puede corregir los boletos de los operadores. |
| Numeración y anulación | La disponibilidad ignoraba boletos anulados, aunque la base de datos impedía reutilizar el número. | No se reutilizan números emitidos. Venta y auditoría son transaccionales; se bloquea el administrador mientras se asignan sus números. |
| Ventas | Si fallaba la API, el navegador generaba certificados locales no registrados. | Una venta solo muestra éxito con confirmación de la base de datos. Validación de nombre, DNI, celular, pago y cantidad. |
| Precio | Cobros e indicadores usaban un precio fijo de 10 incluso al configurar otro. | El servidor toma el precio guardado de la campaña; el formulario y el comprobante de emisión muestran ese precio. |
| Persistencia administrativa | Rifas, premios, configuración y bajas podían aparentar éxito solo en memoria. | APIs para crear/editar/eliminar campañas sin historial; crear/editar/eliminar premios pendientes; guardar configuración; desactivar administradores conservando ventas. Los formularios esperan el resultado y muestran errores. |
| Sorteo | Ante un fallo del servidor se escogía un ganador local; el servidor aceptaba repetir un premio sin autorización explícita. | Se elimina el ganador local del modo oficial. El simulacro permanece separado. Bloqueo de campaña, separación de candidatos por rifa y restricción única de ganador por campaña. |
| Verificación | Se podía mostrar información en caché como válida, y la lista de otros boletos usaba un nombre de campo incorrecto para su código. | Validación con el servidor; boleto anulado mostrado como anulado; selección de otro boleto consulta su código real. |
| Resumen | La unión de boletos y premios multiplicaba los conteos y montos. | Consultas independientes de ventas y premios; suma de importes registrados. |
| Reinicio | El arranque reactivaba operadores y sobrescribía un comprador específico; los seeds reiniciaban premios. | Se retiran modificaciones de datos al arrancar y se hacen los seeds conservadores. |
| Auditoría de boletos | Escrituras y registros de edición podían quedar separados. | Emisión, edición y anulación guardan el registro de auditoría dentro de la misma transacción; nuevos registros de boletos enlazan el hash anterior. Los registros históricos no se reescriben. |

## Validación realizada

- TypeScript: `tsc --noEmit`, sin errores.
- Frontend: compilación de producción de Vite, correcta. Permanece una advertencia de tamaño del bundle (aproximadamente 630 kB antes de gzip).
- `npm run test:audit`: 68 comprobaciones HTTP aprobadas, sobre PostgreSQL embebido PGlite y datos ficticios. Incluye autenticación, cambio de clave, revocación de token, acceso cruzado, cuotas, anulación sin reutilización, edición, precio, configuración, campañas, premios, separación de sorteos, conservación de historial y migración repetible.
- Navegador integrado: inicio de sesión del supervisor ficticio; listado de operadores; «Ver talonario»; comprobación de los extremos #0001 y #0020; apertura de «Editar Boleto» desde la casilla; sin errores de consola observados en ese recorrido.
- Dependencias: el comando de instalación que actualizó package-lock reportó cero vulnerabilidades conocidas en ese momento. No equivale a una auditoría de seguridad completa.

Las pruebas con PGlite serializan transacciones porque usan una conexión. No sustituyen una prueba de carga y concurrencia con varias conexiones PostgreSQL reales.

## Observaciones de producción y pendientes

El panel desplegado mostró 34 administradores, mientras algunos textos aún decían 31. También se observaron boletos históricos fuera del rango nominal de su vendedor. La migración no cambia números ni vendedores de boletos ya emitidos; la nueva vista los conserva y señala para revisión. Hace falta cotejar esas asignaciones con los talonarios físicos antes de aprobar cualquier reasignación histórica.

La revisión de producción fue de lectura. No se modificaron contraseñas, compradores, ventas, premios ni resultados reales. Falta probar la versión corregida contra un entorno de ensayo equivalente a Render y verificarla después del despliegue. No se afirma que el sistema desplegado sea «100% funcional».

Quedan aspectos que requieren una decisión adicional o validación específica:

- La verificación pública por DNI/número sigue exponiendo nombres y documentos. Debe definirse si se conserva esa consulta o se restringe a códigos QR con datos personales enmascarados.
- La conexión PostgreSQL remota existente usa `rejectUnauthorized: false`. Debe validarse la cadena TLS admitida por el proveedor antes de cambiarla.
- El catálogo visual del verificador contiene descripciones e imágenes de premios fijas; revisar su sincronización con premios personalizados.
- El límite de intentos de inicio de sesión es por proceso; con múltiples instancias se necesita un almacén compartido.
- El historial anterior de auditoría usa hashes GENESIS; la mejora de los nuevos registros de boletos no certifica la inmutabilidad de toda la historia ni de cada operación administrativa.
- No se han probado físicamente lectura de QR desde cámaras, impresión, descargas en todos los móviles, envío por WhatsApp ni recuperación tras una caída de PostgreSQL.

## Aplicación de las correcciones

1. Revisar el paquete o el parche y aplicar los cambios sobre la referencia auditada en una rama de GitHub. Si el repositorio avanzó, resolver el parche contra su versión actual.
2. Configurar `JWT_SECRET` privado en Render. El servidor corregido exige esta variable en producción. No usar el secreto público anterior del código.
3. Antes de migrar, revisar asignaciones históricas y posibles premios duplicados sobre una copia de la base de datos. El nuevo índice único de ganadores fallará si existen duplicados; no eliminarlos automáticamente.
4. Ejecutar `npm ci`, `npm run lint`, `npm run test:audit` y `npm run build`. En este Windows restringido se usó `node node_modules/vite/bin/vite.js build --configLoader runner`; el build normal sigue disponible para Linux/Render.
5. Ejecutar `npm run db:migrate` sobre la base de ensayo. La migración añade columnas e índices para talonarios y metadatos. No ejecutar `db:seed` como mecanismo de actualización de producción.
6. Probar en ensayo y desplegar frontend y backend juntos con la migración aplicada. Las sesiones previas serán rechazadas por la nueva validación: los administradores deberán iniciar sesión nuevamente.
7. Comprobar en Render: login; clave anterior rechazada después del cambio; panel propio del operador; talonario de cada operador desde superadmin; corrección persistente del comprador; boletos anulados; contadores; premios y configuración. El usuario debe realizar la introducción y confirmación de contraseñas reales.

Los archivos entregados incluyen código fuente, pruebas y migración. No contienen node_modules, credenciales de Render ni una copia de la base de datos de producción.
