async function testNewAuthAndProfile() {
  console.log('=== TEST 1: LOGIN SUPERADMIN JHEYSON RYAM JORGE VASQUEZ ===');
  const loginRes = await fetch('http://127.0.0.1:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '70905188', password: '70905188' }),
  });
  const loginData = await loginRes.json();
  console.log('Status:', loginRes.status);
  console.log('Superadmin:', loginData.user?.name);
  console.log('Rol:', loginData.user?.role);
  console.log('DNI:', loginData.user?.dni);
  console.log('Debe cambiar contraseña?:', loginData.user?.mustChangePassword);

  const token = loginData.token;

  console.log('\n=== TEST 2: CRUD DE PERFIL DEL SUPERADMIN (PUT /api/auth/profile) ===');
  const updateRes = await fetch('http://127.0.0.1:3001/api/auth/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'JHEYSON RYAM JORGE VASQUEZ',
      email: 'jheyson.jorge@rifas.pe',
      phone: '987654321',
    }),
  });
  const updateData = await updateRes.json();
  console.log('Status:', updateRes.status);
  console.log('Mensaje:', updateData.message);
  console.log('Usuario actualizado:', updateData.user?.name, updateData.user?.email);

  console.log('\n=== TEST 3: VERIFICAR LOGIN DE ADMIN REGULAR (HANSSEL LLANCARI) ===');
  const adminRes = await fetch('http://127.0.0.1:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '74765137', password: '74765137' }),
  });
  const adminData = await adminRes.json();
  console.log('Status:', adminRes.status);
  console.log('Admin:', adminData.user?.name);
  console.log('Rol:', adminData.user?.role);
  console.log('Debe cambiar contraseña?:', adminData.user?.mustChangePassword);

  console.log('\n¡TODAS LAS PRUEBAS COMPLETADAS!');
}

testNewAuthAndProfile().catch(console.error);
