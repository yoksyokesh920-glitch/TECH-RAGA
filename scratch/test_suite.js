import db, { initDatabase } from '../server/db.js';
import participantRoutes from '../server/routes/participantRoutes.js';
import adminRoutes from '../server/routes/adminRoutes.js';
import express from 'express';
import http from 'http';

const app = express();
app.use(express.json());
initDatabase();
app.use('/api/participant', participantRoutes);
app.use('/api/quiz', participantRoutes);
app.use('/api/admin', adminRoutes);

const server = http.createServer(app);

async function runTests() {
  await new Promise(resolve => server.listen(3099, resolve));
  console.log('Test server running on port 3099');

  // Clean up any test records from prior runs
  db.prepare("DELETE FROM answers WHERE attempt_id IN (SELECT id FROM quiz_attempts WHERE participant_id IN (SELECT id FROM participants WHERE phone LIKE '987654%'))").run();
  db.prepare("DELETE FROM quiz_attempts WHERE participant_id IN (SELECT id FROM participants WHERE phone LIKE '987654%')").run();
  db.prepare("DELETE FROM participants WHERE phone LIKE '987654%'").run();

  const baseUrl = 'http://localhost:3099';
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Admin login & Set duration = 15 minutes
    const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    assert(loginRes.status === 200 && token, 'Test 1: Admin login succeeds');

    const durationRes = await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ quiz_duration_minutes: 15 })
    });
    assert(durationRes.status === 200, 'Test 1: Admin sets quiz duration = 15 minutes');

    // 2 & 3. User A starts
    const phoneA = '9876543210';
    await fetch(`${baseUrl}/api/participant/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User A', phone: phoneA, college: 'College A', email: 'usera@example.com' })
    });

    const startARes = await fetch(`${baseUrl}/api/quiz/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneA })
    });
    const startAData = await startARes.json();
    const startATime = new Date(startAData.started_at).getTime();
    const endATime = new Date(startAData.test_end_time).getTime();
    assert(startAData.status === 'IN_PROGRESS', 'Test 2: User A starts quiz');
    assert(Math.abs(endATime - (startATime + 15 * 60 * 1000)) < 2000, 'Test 3: Verify User A test_end_time = started_at + 15 mins');

    // 4 & 5. User B starts at different time
    const phoneB = '9876543211';
    await fetch(`${baseUrl}/api/participant/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User B', phone: phoneB, college: 'College B', email: 'userb@example.com' })
    });

    // Simulate 7 minutes gap for User B
    const startBRes = await fetch(`${baseUrl}/api/quiz/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneB })
    });
    const startBData = await startBRes.json();
    const startBTime = new Date(startBData.started_at).getTime();
    const endBTime = new Date(startBData.test_end_time).getTime();
    assert(startBData.status === 'IN_PROGRESS', 'Test 4: User B starts quiz independently');
    assert(Math.abs(endBTime - (startBTime + 15 * 60 * 1000)) < 2000 && endBTime !== endATime, 'Test 5: Verify User B test_end_time = User B started_at + 15 mins');

    // 6 & 7. Refresh User A
    const refreshARes = await fetch(`${baseUrl}/api/participant/session/${phoneA}`);
    const refreshAData = await refreshARes.json();
    assert(refreshAData.started_at === startAData.started_at && refreshAData.test_end_time === startAData.test_end_time, 'Test 6 & 7: Refresh User A returns SAME timestamps without reset');

    // 8 & 9. User A violation 1
    const warn1Res = await fetch(`${baseUrl}/api/quiz/tab-switch-block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneA })
    });
    const warn1Data = await warn1Res.json();
    assert(warn1Data.warningCount === 1 && warn1Data.status === 'IN_PROGRESS', 'Test 8 & 9: User A receives violation 1, warning_count = 1, status IN_PROGRESS');

    // Force cooldown timestamp back to allow violation 2
    db.prepare("UPDATE quiz_attempts SET last_warning_at = '2020-01-01T00:00:00.000Z' WHERE participant_id = (SELECT id FROM participants WHERE phone = ? AND access_status != 'REMOVED')").run(phoneA);

    // 10 & 11. User A violation 2
    const warn2Res = await fetch(`${baseUrl}/api/quiz/tab-switch-block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneA })
    });
    const warn2Data = await warn2Res.json();
    assert(warn2Data.warningCount === 2 && warn2Data.status === 'IN_PROGRESS', 'Test 10 & 11: User A receives violation 2, warning_count = 2 and test continues IN_PROGRESS');

    // Force cooldown timestamp back to allow violation 3
    db.prepare("UPDATE quiz_attempts SET last_warning_at = '2020-01-01T00:00:00.000Z' WHERE participant_id = (SELECT id FROM participants WHERE phone = ? AND access_status != 'REMOVED')").run(phoneA);

    // 12 & 13. User A violation 3 -> BLOCKED
    const warn3Res = await fetch(`${baseUrl}/api/quiz/tab-switch-block`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneA })
    });
    const warn3Data = await warn3Res.json();
    assert(warn3Data.warningCount === 3 && warn3Data.status === 'BLOCKED' && warn3Data.blocked, 'Test 12 & 13: User A receives violation 3, warning_count = 3, status BLOCKED');

    // 14 & 15. Refresh User A -> Still BLOCKED
    const blockRefRes = await fetch(`${baseUrl}/api/participant/session/${phoneA}`);
    const blockRefData = await blockRefRes.json();
    assert(blockRefData.status === 'BLOCKED', 'Test 14 & 15: Refresh User A returns still BLOCKED status');

    // 16, 17, 18. Admin unblocks before 10:30 (time remaining)
    const unblockRes = await fetch(`${baseUrl}/api/admin/participant/unblock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ phone: phoneA })
    });
    const unblockData = await unblockRes.json();
    assert(unblockData.status === 'IN_PROGRESS', 'Test 16, 17, 18: Admin unblocks before expiry -> Resumes IN_PROGRESS with original test_end_time');

    // 19 & 20 & 21. Let timer expire
    db.prepare("UPDATE quiz_attempts SET test_end_time = '2020-01-01T00:00:00.000Z' WHERE participant_id = (SELECT id FROM participants WHERE phone = ? AND access_status != 'REMOVED')").run(phoneA);

    const expSessRes = await fetch(`${baseUrl}/api/participant/session/${phoneA}`);
    const expSessData = await expSessRes.json();
    assert(expSessData.status === 'EXPIRED', 'Test 19 & 20: Timer expires -> Status becomes EXPIRED');

    // 22 & 23. Refresh while EXPIRED
    const expRefRes = await fetch(`${baseUrl}/api/participant/session/${phoneA}`);
    const expRefData = await expRefRes.json();
    assert(expRefData.status === 'EXPIRED', 'Test 22 & 23: Refresh while EXPIRED remains EXPIRED');

    // 24 & 25. Call /start while EXPIRED -> No new attempt created
    const startExpRes = await fetch(`${baseUrl}/api/quiz/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneA })
    });
    assert(startExpRes.status === 400, 'Test 24 & 25: Call /start while EXPIRED is rejected (no new attempt created)');

    // 26, 27, 28. Admin uses Reset & Restart
    const resetRes = await fetch(`${baseUrl}/api/admin/participant/reset-attempt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ phone: phoneA })
    });
    const resetData = await resetRes.json();
    assert(resetRes.status === 200 && resetData.success, 'Test 26: Admin uses Reset & Restart Attempt');

    const startNewRes = await fetch(`${baseUrl}/api/quiz/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneA })
    });
    const startNewData = await startNewRes.json();
    const newStartTime = new Date(startNewData.started_at).getTime();
    const newEndTime = new Date(startNewData.test_end_time).getTime();
    assert(startNewData.status === 'IN_PROGRESS' && newStartTime > startATime, 'Test 27: New attempt created with a NEW started_at');
    assert(Math.abs(newEndTime - (newStartTime + 15 * 60 * 1000)) < 2000, 'Test 28: NEW test_end_time = new started_at + 15 minutes');

    // 29. Verify normal user cannot call Reset & Restart
    const unauthResetRes = await fetch(`${baseUrl}/api/admin/participant/reset-attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phoneA })
    });
    assert(unauthResetRes.status === 401, 'Test 29: Normal user cannot call Reset & Restart endpoint without admin token');

    console.log(`\n========================================`);
    console.log(`29 ACCEPTANCE TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
