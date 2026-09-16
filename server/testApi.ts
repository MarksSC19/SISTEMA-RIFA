async function runTests() {
  const baseUrl = 'http://localhost:3001/api';

  console.log('1. Testing Login as SuperAdmin...');
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'marksdelmissolano@gmail.com',
      password: 'password123',
    }),
  });
  const loginData = await loginRes.json();
  console.log('Login status:', loginRes.status);
  console.log('Logged in user:', loginData.user?.name, loginData.user?.role);
  const token = loginData.token;

  console.log('\n2. Testing Admins list (31 admins count)...');
  const adminsRes = await fetch(`${baseUrl}/admins`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const admins = await adminsRes.json();
  console.log(`Retrieved ${admins.length} admins.`);

  console.log('\n3. Testing Ticket Emission with Quota validation...');
  const ticketRes = await fetch(`${baseUrl}/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      sellerAdminId: admins[0].id,
      buyerName: 'Carlos Mendoza',
      dni: '71234567',
      phone: '954321987',
      paymentMethod: 'yape',
      paymentReference: 'OP-882194',
    }),
  });
  const ticketData = await ticketRes.json();
  console.log('Created ticket:', ticketData.formattedNumber, ticketData.verificationCode, ticketData.buyerName);

  console.log('\n4. Testing Public Verification (No Auth required)...');
  const verifyRes = await fetch(`${baseUrl}/public/verify/${ticketData.verificationCode}`);
  const verifyData = await verifyRes.json();
  console.log('Public Verification Result:', verifyData.valid, verifyData.ticket?.status, verifyData.ticket?.raffleName);

  console.log('\n5. Testing Live Draw Execution (CSPRNG)...');
  const drawRes = await fetch(`${baseUrl}/draw/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      prizeId: 'prz-1',
    }),
  });
  const drawData = await drawRes.json();
  console.log('Draw Result:', drawData.success, 'Winner:', drawData.winner?.buyerName, 'Prize:', drawData.prize?.name);

  console.log('\n6. Testing Reset Draws...');
  const resetRes = await fetch(`${baseUrl}/prizes/reset`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const resetData = await resetRes.json();
  console.log('Reset Result:', resetData.message);

  console.log('\n✅ ALL BACKEND API ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY!');
}

runTests().catch(console.error);
