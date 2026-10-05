throw new Error('Diagnóstico histórico deshabilitado: probar DNI como contraseña podía restablecer claves en versiones antiguas. Consultar el panel autenticado; no inferir historial de acceso a partir de una prueba de contraseña.');
const fs = require('fs');

async function analyzeProduction() {
  const baseUrl = 'https://sistema-rifa-x4xr.onrender.com';
  
  // 1. Login como SuperAdmin
  console.log('Autenticando como SuperAdmin...');
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '70905188', password: '70905188' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  if (!token) {
    console.error('Error al obtener token:', loginData);
    return;
  }
  console.log('Autenticado con éxito. SuperAdmin:', loginData.user.name);

  // 2. Obtener lista de administradores
  const adminsRes = await fetch(`${baseUrl}/api/admins`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const admins = await adminsRes.json();
  console.log(`Total administradores obtenidos: ${admins.length}`);

  // 3. Obtener todos los tickets
  const ticketsRes = await fetch(`${baseUrl}/api/tickets`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const tickets = await ticketsRes.json();
  console.log(`Total tickets obtenidos: ${tickets.length}`);

  // 4. Obtener logs de auditoría
  const auditRes = await fetch(`${baseUrl}/api/audit`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const auditLogs = await auditRes.json();
  console.log(`Total audit logs: ${auditLogs.length}`);

  // 5. Para cada administrador, verificar el estado de inicio de sesión / contraseña inicial
  // Si al probar login con su DNI como contraseña devuelve 200 y mustChangePassword=true, significa que NUNCA cambió su contraseña
  // Si devuelve 401 "Contraseña incorrecta", significa que YA CAMBIÓ su contraseña (inició sesión y la personalizó).
  // Si devuelve 200 con mustChangePassword=false, ya la cambió.
  console.log('Verificando estado de inicio de sesión / contraseñas de los administradores...');
  const adminStatusList = [];

  for (const adm of admins) {
    const dni = adm.dni;
    let loginState = 'desconocido';
    let hasChangedPassword = false;

    if (dni) {
      try {
        const checkRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: dni, password: dni })
        });
        const checkData = await checkRes.json();
        
        if (checkRes.ok) {
          // Entró con su DNI por defecto
          if (checkData.user?.mustChangePassword) {
            loginState = 'contraseña_por_defecto_sin_cambio';
            hasChangedPassword = false;
          } else {
            loginState = 'contraseña_confirmada';
            hasChangedPassword = true;
          }
        } else if (checkRes.status === 401) {
          // Contraseña incorrecta al poner su DNI -> Significa que ya ingresó y CAMBIÓ su contraseña
          loginState = 'contraseña_personalizada_cambiada';
          hasChangedPassword = true;
        } else {
          loginState = `error_${checkRes.status}`;
        }
      } catch (e) {
        loginState = `error_${e.message}`;
      }
    }

    // Filtrar tickets emitidos por este admin
    const myTickets = tickets.filter(t => 
      t.sellerAdminId === adm.id || 
      (t.registeredBy && adm.name && t.registeredBy.trim().toUpperCase() === adm.name.trim().toUpperCase())
    );

    // Filtrar logs de auditoría
    const myAudit = auditLogs.filter(a => 
      (a.user && adm.name && a.user.trim().toUpperCase().includes(adm.name.trim().toUpperCase())) ||
      (a.performed_by && adm.name && a.performed_by.trim().toUpperCase().includes(adm.name.trim().toUpperCase()))
    );

    // Determinar última venta
    let lastSaleDate = null;
    if (myTickets.length > 0) {
      const dates = myTickets.map(t => new Date(t.timestamp || t.sold_at || t.issuedAt).getTime()).filter(d => !isNaN(d));
      if (dates.length > 0) {
        lastSaleDate = new Date(Math.max(...dates)).toLocaleString('es-PE', { timeZone: 'America/Lima' });
      }
    }

    adminStatusList.push({
      id: adm.id,
      name: adm.name,
      dni: adm.dni,
      email: adm.email,
      totalSold: adm.totalSold || myTickets.length,
      assignedQuota: adm.assignedQuota || 20,
      quotaPercent: Math.round(((adm.totalSold || myTickets.length) / (adm.assignedQuota || 20)) * 100),
      hasChangedPassword,
      loginState,
      ticketsCount: myTickets.length,
      auditCount: myAudit.length,
      lastSaleDate,
      isSuperAdmin: adm.dni === '70905188'
    });
  }

  // Guardar resultado estructurado
  fs.writeFileSync('production_admin_report.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    totalSoldOverall: tickets.length,
    adminsCount: adminStatusList.length,
    admins: adminStatusList
  }, null, 2));

  console.log('Reporte generado exitosamente en production_admin_report.json');
}

analyzeProduction().catch(console.error);
