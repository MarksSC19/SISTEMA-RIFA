# Despliegue de las correcciones en Render

La rama `audit-talonarios-passwords` contiene las correcciones. No desplegarla contra producción hasta validar la migración en una copia restaurada de PostgreSQL y tener un respaldo recuperable. No ejecutar `db:seed` para actualizar datos existentes.

## Preparación

1. Configuración comprobada en Render: servicio SISTEMA-RIFA, ID srv-dalagpek1f9s73dnk4dg, runtime Node, plan Free, rama main, commit desplegado 6deacdf. El start es `npm run start`. El build actual es `npm install && npm run build && npm run db:migrate && npm run db:seed`. Antes del despliegue corregido, sustituirlo por `npm ci && npm run build && npm run db:migrate`, con la migración ya validada y respaldo recuperable. Eliminar db:seed del build. El plan Free no permite Shell ni predeploy; puede ejecutar la migración desde este build, conectado a DATABASE_URL.
2. Se comprobó la presencia de DATABASE_URL sin revelar su valor; JWT_SECRET está ausente. Conservar `DATABASE_URL` del servicio y configurar `JWT_SECRET` privado y aleatorio. El código exige este último en producción. Introducir los secretos directamente en Render; no guardarlos en GitHub ni en informes.
3. Guardar un respaldo de PostgreSQL y probar su restauración. Ejecutar las consultas siguientes sobre la copia. Ninguna modifica datos.

```sql
-- Debe devolver cero filas; el nuevo índice impide repetir un ganador en la misma rifa.
SELECT raffle_id, winner_ticket_id, COUNT(*)
FROM prizes WHERE winner_ticket_id IS NOT NULL
GROUP BY raffle_id, winner_ticket_id HAVING COUNT(*) > 1;

-- Referencias históricas que requieren revisión.
SELECT p.id, p.raffle_id, p.winner_ticket_id
FROM prizes p LEFT JOIN tickets t ON t.id = p.winner_ticket_id
WHERE p.winner_ticket_id IS NOT NULL
AND (t.id IS NULL OR t.raffle_id <> p.raffle_id OR t.status <> 'valid');
```

## Ensayo y migración

Sobre la copia del repositorio y la base de ensayo:

```sh
npm ci
npm run lint
npm run test:audit
npm run build
npm run db:migrate
```

La migración añade metadatos, números estables de talonario e índices. Conserva los boletos ya emitidos. Comprobar después los boletos fuera del rango del vendedor:

```sql
SELECT t.id, t.ticket_number, t.raffle_id, t.seller_admin_id, u.booklet_number
FROM tickets t JOIN users u ON u.id = t.seller_admin_id
WHERE t.ticket_number NOT BETWEEN (u.booklet_number - 1) * 20 + 1 AND u.booklet_number * 20
ORDER BY t.seller_admin_id, t.ticket_number;
```

Cotejar estas filas con talonarios físicos; no reasignarlas automáticamente. Probar supervisor y operador, edición persistente, anulación, cuota, cambio de clave y rechazo de la sesión anterior. Las pruebas automáticas usan datos ficticios y una conexión PostgreSQL embebida; falta validar concurrencia con varias conexiones reales.

## Producción

Durante una ventana sin escrituras, crear un respaldo nuevo, aplicar la migración validada y desplegar frontend y backend del mismo commit. La migración requiere la conexión PostgreSQL del servicio. El Dockerfile no la ejecuta automáticamente: usar Shell/predeploy si el plan lo admite o un entorno autorizado conectado a la base. No cambiar la rama de despliegue antes de aplicar la migración.

Verificar logs, carga de la web, login, talonarios, corrección y lectura posterior del boleto. Los usuarios deben iniciar sesión de nuevo y realizar ellos mismos la introducción de contraseñas reales. No ejecutar sorteos reales para comprobar la interfaz; usar el simulacro.

Si falla el arranque, conservar logs, volver al commit anterior del servicio y comprobar el estado de la base. No borrar columnas ni restaurar un respaldo sobre ventas nuevas sin reconciliación. Esta guía prepara el despliegue; no certifica que Render ya esté actualizado.
