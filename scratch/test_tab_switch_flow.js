import http from 'http';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const reqHeaders = { ...headers };
    let postData = '';
    if (body) {
      postData = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING TAB SWITCH & UNBLOCK E2E VERIFICATION ---');

  const candidatePhone = '9876543210';

  // 1. Register candidate
  console.log('1. Registering candidate...');
  const regRes = await request('POST', '/api/participant/register', {
    name: 'Test AntiCheat Candidate',
    phone: candidatePhone,
    college: 'IIT Madras',
    email: 'anticheat@iitm.ac.in',
  });
  console.log('Registration Response:', regRes.status, regRes.body);

  // 2. Start Quiz
  console.log('\n2. Starting quiz attempt...');
  const startRes = await request('POST', '/api/quiz/start', { phone: candidatePhone });
  console.log('Start Quiz Response:', startRes.status, startRes.body);

  // 3. Trigger Tab Switch Lock
  console.log('\n3. Triggering Tab Switch Detection...');
  const tabSwitchRes = await request('POST', '/api/quiz/tab-switch-block', { phone: candidatePhone });
  console.log('Tab Switch Response:', tabSwitchRes.status, tabSwitchRes.body);

  // 4. Verify Session when Blocked
  console.log('\n4. Checking Session State (Should be BLOCKED)...');
  const sessBlocked = await request('GET', `/api/participant/session/${candidatePhone}`);
  console.log('Session Blocked State:', sessBlocked.body.access_status, 'Attempt Status:', sessBlocked.body.status);

  if (sessBlocked.body.access_status !== 'BLOCKED' || sessBlocked.body.status !== 'BLOCKED') {
    throw new Error('FAILED: Session state was not properly set to BLOCKED');
  }

  // 5. Admin Login & Unblock Candidate
  console.log('\n5. Admin Login & Unblocking Candidate...');
  const loginRes = await request('POST', '/api/admin/login', { username: 'admin', password: 'admin123' });
  console.log('Login Response:', loginRes.body);

  const authHeaders = { Authorization: `Bearer ${loginRes.body.token}` };

  // Toggle Block (Unblock) by phone
  const unblockRes = await request('POST', '/api/admin/participant/toggle-block', { phone: candidatePhone }, authHeaders);
  console.log('Unblock Response:', unblockRes.status, unblockRes.body);

  // 6. Verify Session state restored
  console.log('\n6. Checking Session State after Admin Unblock...');
  const sessUnblocked = await request('GET', `/api/participant/session/${candidatePhone}`);
  console.log('Session Unblocked State:', sessUnblocked.body.access_status, 'Attempt Status:', sessUnblocked.body.status);

  if (sessUnblocked.body.access_status !== 'ALLOWED' || sessUnblocked.body.status !== 'IN_PROGRESS') {
    throw new Error('FAILED: Session state was not restored to ALLOWED / IN_PROGRESS');
  }

  console.log('\n✅ ALL TAB SWITCH DETECTION & ADMIN UNBLOCK TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
