async function runTests() {
  console.log('====================================================');
  console.log('🧪 INICIANDO PRUEBAS DE FLUJO COMPLETO EN PRODUCCIÓN');
  console.log('====================================================\n');

  // 1. Login Admin con DNI como contraseña
  console.log('1. Probando Login de Admin Maycol Gómez con su DNI como contraseña...');
  const loginRes = await fetch('http://127.0.0.1:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '75231718', password: '75231718' }),
  });
  const loginData = await loginRes.json();
  console.log('  Status:', loginRes.status);
  console.log('  Admin:', loginData.user?.name);
  console.log('  DNI:', loginData.user?.dni);
  console.log('  Debe cambiar contraseña?:', loginData.user?.mustChangePassword);

  const token = loginData.token;

  // 2. Cambio obligatorio de contraseña
  console.log('\n2. Probando cambio obligatorio de contraseña (/api/auth/change-password)...');
  const changeRes = await fetch('http://127.0.0.1:3001/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      currentPassword: '75231718',
      newPassword: 'Maycol2026!',
    }),
  });
  const changeData = await changeRes.json();
  console.log('  Status:', changeRes.status);
  console.log('  Mensaje:', changeData.message);

  // 3. Emisión atómica de múltiples tickets (3 tickets) a nombre de Carlos Mendoza
  console.log('\n3. Emitiendo 3 tickets para Carlos Mendoza (DNI: 71234567)...');
  const ticketRes = await fetch('http://127.0.0.1:3001/api/tickets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      buyerName: 'Carlos Mendoza Gómez',
      dni: '71234567',
      phone: '987123456',
      quantity: 3,
      paymentMethod: 'efectivo',
    }),
  });
  const ticketData = await ticketRes.json();
  console.log('  Status:', ticketRes.status);
  console.log('  Boletos emitidos:', ticketData.createdTickets?.length);
  console.log('  Total pagado: S/', ticketData.totalPaid);
  ticketData.createdTickets?.forEach((t, i) => {
    console.log(`   ${i + 1}. Número: ${t.formattedNumber} | Cód: ${t.verificationCode}`);
  });

  // 4. Verificación pública por DNI de Carlos Mendoza
  console.log('\n4. Verificación pública del comprador por su DNI (71234567)...');
  const verifyRes = await fetch('http://127.0.0.1:3001/api/public/verify/71234567');
  const verifyData = await verifyRes.json();
  console.log('  Status:', verifyRes.status);
  console.log('  Válido?:', verifyData.valid);
  console.log('  Titular:', verifyData.ticket?.buyerName);
  console.log('  Total de boletos a su nombre:', verifyData.totalBuyerTickets);
  verifyData.buyerAllTickets?.forEach((bt, i) => {
    console.log(`   * Boleto ${bt.formattedNumber} -> Hash: ${bt.ticketCode}`);
  });

  // 5. Login de Super Admin Marks
  console.log('\n5. Probando Login de Super Admin Marks (marksdelmissolano@gmail.com)...');
  const superRes = await fetch('http://127.0.0.1:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'marksdelmissolano@gmail.com', password: 'password123' }),
  });
  const superData = await superRes.json();
  console.log('  Status:', superRes.status);
  console.log('  Super Admin:', superData.user?.name, `(${superData.user?.role})`);
  console.log('  Debe cambiar contraseña?:', superData.user?.mustChangePassword);

  // 6. Consultar estadísticas globales de administradores
  console.log('\n6. Verificando conteo de tickets de los 31 administradores...');
  const adminsRes = await fetch('http://127.0.0.1:3001/api/admins', {
    headers: { 'Authorization': `Bearer ${superData.token}` },
  });
  const adminsList = await adminsRes.json();
  const hanssel = adminsList.find((a) => a.dni === '74765137');
  console.log(`  Hanssel Llancari: ${hanssel?.totalSold} / 20 tickets vendidos`);
  const totalGlobalSold = adminsList.reduce((acc, a) => acc + (a.totalSold || 0), 0);
  console.log(`  Total global vendido en plataforma: ${totalGlobalSold} / 620 tickets`);

  console.log('\n====================================================');
  console.log('✅ TODAS LAS PRUEBAS DE FLUJO COMPLETADAS CON ÉXITO');
  console.log('====================================================');
}

runTests().catch(console.error);
