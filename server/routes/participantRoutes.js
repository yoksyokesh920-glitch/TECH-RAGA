import express from 'express';
import db from '../db.js';

const router = express.Router();

// Helper function: clean and validate 10-digit Indian phone number
function cleanAndValidatePhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return null;
  let digits = rawPhone.replace(/[\s\-\+]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  if (/^[6-9][0-9]{9}$/.test(digits)) {
    return digits;
  }
  return null;
}

// Helper function: get active quiz duration setting in minutes
function getQuizDurationMinutes() {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'quiz_duration_minutes'").get();
    return row ? Number(row.value) : 15;
  } catch (e) {
    return 15;
  }
}

// Helper function: check attempt expiration based on server time
function checkAndUpdateAttemptExpiry(attempt) {
  if (!attempt || attempt.status !== 'IN_PROGRESS') return attempt;

  const durationMinutes = getQuizDurationMinutes();
  let endTimeMs = 0;

  if (attempt.test_end_time) {
    endTimeMs = new Date(attempt.test_end_time).getTime();
  } else if (attempt.started_at) {
    endTimeMs = new Date(attempt.started_at).getTime() + (durationMinutes * 60 * 1000);
  }

  if (endTimeMs > 0 && Date.now() >= endTimeMs) {
    const durationSeconds = durationMinutes * 60;
    db.prepare(`
      UPDATE quiz_attempts
      SET status = 'EXPIRED', time_taken = ?
      WHERE id = ?
    `).run(durationSeconds, attempt.id);

    attempt.status = 'EXPIRED';
    attempt.time_taken = durationSeconds;
  }

  return attempt;
}

// 1. PARTICIPANT REGISTRATION & PHONE ACCESS CONTROL
router.post('/register', (req, res) => {
  const { name, phone, college } = req.body;

  // Validations
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Full Name cannot be empty.' });
  }

  const cleanPhone = cleanAndValidatePhone(phone);
  if (!cleanPhone) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit Indian phone number starting with 6, 7, 8, or 9.' });
  }

  if (!college || typeof college !== 'string' || !college.trim()) {
    return res.status(400).json({ error: 'College Name cannot be empty.' });
  }

  const cleanName = name.trim();
  const cleanCollege = college.trim();

  // Check if active registration already exists for this phone number
  const existingPart = db.prepare("SELECT * FROM participants WHERE phone = ? AND access_status != 'REMOVED'").get(cleanPhone);

  if (existingPart) {
    return res.status(400).json({
      alreadyRegistered: true,
      error: 'This phone number is already registered. You can register again only after an administrator removes the previous registration.'
    });
  }

  // Create New Participant & Attempt #1 atomically in a transaction
  const createNew = db.transaction(() => {
    const partResult = db.prepare(`
      INSERT INTO participants (name, phone, college, access_status)
      VALUES (?, ?, ?, 'ALLOWED')
    `).run(cleanName, cleanPhone, cleanCollege);

    const pId = partResult.lastInsertRowid;

    const attemptResult = db.prepare(`
      INSERT INTO quiz_attempts (participant_id, attempt_number, status, warning_count)
      VALUES (?, 1, 'REGISTERED', 0)
    `).run(pId);

    return { pId, attemptId: attemptResult.lastInsertRowid };
  });

  try {
    const { pId, attemptId } = createNew();
    return res.status(201).json({
      message: 'Registration successful!',
      phone: cleanPhone,
      name: cleanName,
      college: cleanCollege,
      attempt_id: attemptId,
      attempt_number: 1,
      status: 'REGISTERED'
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 'SQLITE_CONSTRAINT' || String(err).includes('UNIQUE')) {
      return res.status(400).json({
        alreadyRegistered: true,
        error: 'This phone number is already registered. You can register again only after an administrator removes the previous registration.'
      });
    }
    return res.status(500).json({ error: 'Failed to complete registration. Please try again.' });
  }
});

// 2. GET SESSION BY PHONE NUMBER (Server Authoritative Session)
router.get('/session/:phone', (req, res) => {
  const { phone } = req.params;
  const cleanPhone = phone.trim().replace(/[\s-]/g, '');

  const participant = db.prepare("SELECT * FROM participants WHERE phone = ? AND access_status != 'REMOVED'").get(cleanPhone);
  if (!participant) {
    return res.status(404).json({ error: 'Participant not found.' });
  }

  let latestAttempt = db.prepare(`
    SELECT * FROM quiz_attempts 
    WHERE participant_id = ? 
    ORDER BY attempt_number DESC, id DESC 
    LIMIT 1
  `).get(participant.id);

  if (latestAttempt) {
    latestAttempt = checkAndUpdateAttemptExpiry(latestAttempt);
  }

  const durationMinutes = getQuizDurationMinutes();
  let remainingSeconds = 0;
  let testEndTimeIso = null;

  if (latestAttempt && latestAttempt.status === 'IN_PROGRESS') {
    const endTimeMs = latestAttempt.test_end_time
      ? new Date(latestAttempt.test_end_time).getTime()
      : new Date(latestAttempt.started_at).getTime() + (durationMinutes * 60 * 1000);

    testEndTimeIso = new Date(endTimeMs).toISOString();
    remainingSeconds = Math.max(0, Math.floor((endTimeMs - Date.now()) / 1000));
  }

  let savedAnswers = {};
  if (latestAttempt && latestAttempt.id) {
    const answers = db.prepare('SELECT question_id, selected_answer FROM answers WHERE attempt_id = ?').all(latestAttempt.id);
    answers.forEach(a => {
      savedAnswers[a.question_id] = a.selected_answer;
    });
  }

  const effectiveStatus = (participant.access_status === 'BLOCKED' || (latestAttempt && latestAttempt.status === 'BLOCKED'))
    ? 'BLOCKED'
    : (latestAttempt ? latestAttempt.status : 'REGISTERED');

  return res.json({
    phone: participant.phone,
    name: participant.name,
    college: participant.college,
    access_status: participant.access_status,
    attempt_id: latestAttempt ? latestAttempt.id : null,
    attempt_number: latestAttempt ? latestAttempt.attempt_number : 1,
    status: effectiveStatus,
    warning_count: latestAttempt ? (latestAttempt.warning_count || 0) : 0,
    started_at: latestAttempt ? latestAttempt.started_at : null,
    test_end_time: testEndTimeIso,
    submitted_at: latestAttempt ? latestAttempt.submitted_at : null,
    durationMinutes,
    remainingSeconds,
    savedAnswers,
    serverTime: new Date().toISOString()
  });
});

// 3. START QUIZ (Server-Authoritative User-Specific Timer: Returns existing session if IN_PROGRESS)
router.post('/start', (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  const cleanPhone = phone.trim().replace(/[\s-]/g, '');
  const participant = db.prepare("SELECT * FROM participants WHERE phone = ? AND access_status != 'REMOVED'").get(cleanPhone);
  if (!participant) {
    return res.status(404).json({ error: 'Participant record not found.' });
  }

  if (participant.access_status === 'BLOCKED') {
    return res.status(403).json({ error: 'Participant is BLOCKED.', status: 'BLOCKED' });
  }

  let latestAttempt = db.prepare(`
    SELECT * FROM quiz_attempts 
    WHERE participant_id = ? 
    ORDER BY attempt_number DESC, id DESC 
    LIMIT 1
  `).get(participant.id);

  if (!latestAttempt) {
    return res.status(404).json({ error: 'No quiz attempt record found.' });
  }

  latestAttempt = checkAndUpdateAttemptExpiry(latestAttempt);

  const durationMinutes = getQuizDurationMinutes();
  const totalQuestions = db.prepare('SELECT COUNT(*) as count FROM questions').get().count;
  const totalMarks = db.prepare('SELECT SUM(marks) as total FROM questions').get().total || totalQuestions;

  // IF ALREADY IN_PROGRESS: DO NOT reset started_at or test_end_time! Return existing authoritative session.
  if (latestAttempt.status === 'IN_PROGRESS') {
    const endTimeMs = new Date(latestAttempt.test_end_time).getTime();
    const remainingSeconds = Math.max(0, Math.floor((endTimeMs - Date.now()) / 1000));
    return res.json({
      message: 'Resuming existing active attempt.',
      phone: cleanPhone,
      status: 'IN_PROGRESS',
      attempt_number: latestAttempt.attempt_number,
      totalQuestions,
      durationMinutes,
      started_at: latestAttempt.started_at,
      test_end_time: latestAttempt.test_end_time,
      remainingSeconds,
      warning_count: latestAttempt.warning_count || 0
    });
  }

  if (latestAttempt.status === 'COMPLETED') {
    return res.status(400).json({ error: 'Quiz has already been submitted.', status: 'COMPLETED' });
  }
  if (latestAttempt.status === 'EXPIRED') {
    return res.status(400).json({ error: 'Quiz attempt has expired. Contact administrator for reset.', status: 'EXPIRED' });
  }
  if (latestAttempt.status === 'BLOCKED') {
    return res.status(403).json({ error: 'Quiz attempt is BLOCKED.', status: 'BLOCKED' });
  }

  // FIRST TIME STARTING FOR THIS ATTEMPT: Set user-specific started_at and test_end_time
  const nowMs = Date.now();
  const startedAtIso = new Date(nowMs).toISOString();
  const testEndTimeIso = new Date(nowMs + (durationMinutes * 60 * 1000)).toISOString();

  db.prepare(`
    UPDATE quiz_attempts
    SET status = 'IN_PROGRESS', started_at = ?, test_end_time = ?, total_marks = ?, warning_count = 0
    WHERE id = ?
  `).run(startedAtIso, testEndTimeIso, totalMarks, latestAttempt.id);

  return res.json({
    message: 'Quiz started successfully.',
    phone: cleanPhone,
    status: 'IN_PROGRESS',
    attempt_number: latestAttempt.attempt_number,
    totalQuestions,
    durationMinutes,
    started_at: startedAtIso,
    test_end_time: testEndTimeIso,
    remainingSeconds: durationMinutes * 60,
    warning_count: 0
  });
});

// 4. SANITIZED QUIZ QUESTIONS
router.get('/questions', (req, res) => {
  const { phone } = req.query;
  if (phone) {
    const cleanPhone = String(phone).trim().replace(/[\s-]/g, '');
    const participant = db.prepare("SELECT * FROM participants WHERE phone = ? AND access_status != 'REMOVED'").get(cleanPhone);
    if (participant) {
      let attempt = db.prepare("SELECT * FROM quiz_attempts WHERE participant_id = ? ORDER BY attempt_number DESC, id DESC LIMIT 1").get(participant.id);
      if (attempt) {
        attempt = checkAndUpdateAttemptExpiry(attempt);
        if (participant.access_status === 'BLOCKED' || attempt.status === 'BLOCKED') {
          return res.status(403).json({ error: 'Attempt is BLOCKED.', status: 'BLOCKED' });
        }
        if (attempt.status === 'EXPIRED') {
          return res.status(403).json({ error: 'Attempt has EXPIRED.', status: 'EXPIRED' });
        }
      }
    }
  }

  const questions = db.prepare(`
    SELECT id, question, option_a, option_b, option_c, option_d
    FROM questions
    ORDER BY id ASC
  `).all();

  return res.json(questions);
});

// 4b. GET PUBLIC QUIZ SETTINGS
router.get('/settings', (req, res) => {
  const durationMinutes = getQuizDurationMinutes();
  return res.json({ durationMinutes });
});

// 5. SAVE INTERMEDIATE ANSWER
router.post('/save-answer', (req, res) => {
  const { phone, question_id, selected_answer } = req.body;
  if (!phone || !question_id) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  const cleanPhone = phone.trim().replace(/[\s-]/g, '');
  const participant = db.prepare("SELECT * FROM participants WHERE phone = ? AND access_status != 'REMOVED'").get(cleanPhone);
  if (!participant) {
    return res.status(404).json({ error: 'Participant not found.' });
  }

  if (participant.access_status === 'BLOCKED') {
    return res.status(403).json({ error: 'Participant is BLOCKED.', status: 'BLOCKED' });
  }

  let latestAttempt = db.prepare(`
    SELECT * FROM quiz_attempts 
    WHERE participant_id = ? AND status = 'IN_PROGRESS' 
    ORDER BY attempt_number DESC, id DESC 
    LIMIT 1
  `).get(participant.id);

  if (!latestAttempt) {
    return res.status(400).json({ error: 'Cannot save answer for an inactive or completed attempt.' });
  }

  latestAttempt = checkAndUpdateAttemptExpiry(latestAttempt);
  if (latestAttempt.status === 'EXPIRED') {
    return res.status(403).json({ error: 'Quiz time has expired.', status: 'EXPIRED' });
  }

  const upsertStmt = db.prepare(`
    INSERT INTO answers (attempt_id, question_id, selected_answer)
    VALUES (?, ?, ?)
    ON CONFLICT(attempt_id, question_id) DO UPDATE SET selected_answer = excluded.selected_answer
  `);

  upsertStmt.run(latestAttempt.id, question_id, selected_answer);
  return res.json({ success: true });
});

// 5b. THREE-STAGE WARNING SYSTEM & DEDUPLICATION (3-VIOLATION POLICY)
router.post('/tab-switch-block', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone is required.' });

  const cleanPhone = phone.trim().replace(/[\s-]/g, '');
  const participant = db.prepare("SELECT * FROM participants WHERE phone = ? AND access_status != 'REMOVED'").get(cleanPhone);
  if (!participant) return res.status(404).json({ error: 'Participant not found.' });

  let latestAttempt = db.prepare(`
    SELECT * FROM quiz_attempts 
    WHERE participant_id = ? 
    ORDER BY attempt_number DESC, id DESC 
    LIMIT 1
  `).get(participant.id);

  if (!latestAttempt) return res.status(404).json({ error: 'No active attempt found.' });

  latestAttempt = checkAndUpdateAttemptExpiry(latestAttempt);
  if (latestAttempt.status === 'EXPIRED') {
    return res.status(403).json({ error: 'Quiz time limit expired.', status: 'EXPIRED' });
  }
  if (latestAttempt.status === 'BLOCKED' || participant.access_status === 'BLOCKED') {
    return res.json({
      blocked: true,
      warningCount: 3,
      status: 'BLOCKED',
      message: 'Your test has been blocked due to repeated violations. Please contact the administrator.'
    });
  }

  const nowMs = Date.now();
  const lastWarningMs = latestAttempt.last_warning_at ? new Date(latestAttempt.last_warning_at).getTime() : 0;

  // SERVER-SIDE WARNING DEDUPLICATION: 3-second cooldown window
  if (nowMs - lastWarningMs < 3000) {
    const currentCount = latestAttempt.warning_count || 0;
    return res.json({
      blocked: currentCount >= 3,
      warningCount: currentCount,
      status: currentCount >= 3 ? 'BLOCKED' : 'IN_PROGRESS',
      message: currentCount === 1
        ? 'Warning 1 of 3: Leaving the quiz/fullscreen or switching tabs is not allowed.'
        : currentCount === 2
        ? 'Final Warning: One more violation will block your test.'
        : 'Your test has been blocked due to repeated violations. Please contact the administrator.'
    });
  }

  const newWarningCount = (latestAttempt.warning_count || 0) + 1;
  const nowIso = new Date(nowMs).toISOString();

  if (newWarningCount === 1) {
    db.prepare(`
      UPDATE quiz_attempts 
      SET warning_count = 1, tab_switch_count = 1, last_warning_at = ? 
      WHERE id = ?
    `).run(nowIso, latestAttempt.id);

    return res.json({
      blocked: false,
      warningCount: 1,
      status: 'IN_PROGRESS',
      message: 'Warning 1 of 3: Leaving the quiz/fullscreen or switching tabs is not allowed.'
    });
  }

  if (newWarningCount === 2) {
    db.prepare(`
      UPDATE quiz_attempts 
      SET warning_count = 2, tab_switch_count = 2, last_warning_at = ? 
      WHERE id = ?
    `).run(nowIso, latestAttempt.id);

    return res.json({
      blocked: false,
      warningCount: 2,
      status: 'IN_PROGRESS',
      message: 'Final Warning: One more violation will block your test.'
    });
  }

  // 3rd Violation -> Atomically Block candidate in DB transaction
  db.transaction(() => {
    db.prepare(`
      UPDATE quiz_attempts 
      SET warning_count = 3, tab_switch_count = 3, status = 'BLOCKED', last_warning_at = ? 
      WHERE id = ?
    `).run(nowIso, latestAttempt.id);
    
    db.prepare("UPDATE participants SET access_status = 'BLOCKED' WHERE id = ?").run(participant.id);
  })();

  return res.json({
    blocked: true,
    warningCount: 3,
    status: 'BLOCKED',
    message: 'Your test has been blocked due to repeated violations. Please contact the administrator.'
  });
});

// 6. SUBMIT QUIZ (SERVER TIME RACE CONDITION & COMPLETION VALIDATION)
router.post('/submit', (req, res) => {
  const { phone, answers } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  const cleanPhone = phone.trim().replace(/[\s-]/g, '');
  const participant = db.prepare("SELECT * FROM participants WHERE phone = ? AND access_status != 'REMOVED'").get(cleanPhone);
  if (!participant) {
    return res.status(404).json({ error: 'Participant record not found.' });
  }

  if (participant.access_status === 'BLOCKED') {
    return res.status(403).json({ error: 'Participant is BLOCKED.', status: 'BLOCKED' });
  }

  let latestAttempt = db.prepare(`
    SELECT * FROM quiz_attempts 
    WHERE participant_id = ? AND status = 'IN_PROGRESS' 
    ORDER BY attempt_number DESC, id DESC 
    LIMIT 1
  `).get(participant.id);

  if (!latestAttempt) {
    return res.status(400).json({ error: 'No in-progress attempt found to submit.' });
  }

  // Check server time vs test_end_time
  latestAttempt = checkAndUpdateAttemptExpiry(latestAttempt);
  if (latestAttempt.status === 'EXPIRED') {
    return res.status(400).json({
      error: 'Submission Rejected',
      message: 'The quiz time limit has expired. Submission could not be accepted.',
      status: 'EXPIRED'
    });
  }

  // Fetch all questions to verify 100% completion
  const allQuestions = db.prepare('SELECT id, correct_answer, marks FROM questions').all();
  const userAnswersMap = new Map();

  // Query intermediate saved answers in DB
  const savedDbAnswers = db.prepare('SELECT question_id, selected_answer FROM answers WHERE attempt_id = ?').all(latestAttempt.id);
  savedDbAnswers.forEach(a => {
    if (a.selected_answer) userAnswersMap.set(a.question_id, a.selected_answer);
  });

  if (answers && Array.isArray(answers)) {
    answers.forEach(a => {
      if (a.selected_answer) {
        userAnswersMap.set(a.question_id, a.selected_answer);
      }
    });
  }

  // Verify EVERY question has been answered
  const unansweredQIds = [];
  allQuestions.forEach(q => {
    if (!userAnswersMap.has(q.id)) {
      unansweredQIds.push(q.id);
    }
  });

  if (unansweredQIds.length > 0) {
    return res.status(400).json({
      error: 'Incomplete Submission',
      message: 'All questions must be answered before submitting.',
      unansweredQuestionIds: unansweredQIds,
      unansweredCount: unansweredQIds.length
    });
  }

  // Compute score server-side
  let totalScore = 0;
  let maxMarks = 0;
  const qMap = new Map();
  allQuestions.forEach(q => {
    qMap.set(q.id, q);
    maxMarks += (q.marks || 1);
  });

  const upsertAnswerStmt = db.prepare(`
    INSERT INTO answers (attempt_id, question_id, selected_answer, is_correct)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(attempt_id, question_id) DO UPDATE SET
      selected_answer = excluded.selected_answer,
      is_correct = excluded.is_correct
  `);

  const submitTransaction = db.transaction(() => {
    for (const [qId, selAns] of userAnswersMap.entries()) {
      const q = qMap.get(qId);
      let isCorrect = 0;
      if (q && selAns && selAns.toUpperCase() === q.correct_answer.toUpperCase()) {
        isCorrect = 1;
        totalScore += (q.marks || 1);
      }
      upsertAnswerStmt.run(latestAttempt.id, qId, selAns, isCorrect);
    }

    let timeTakenSeconds = 0;
    if (latestAttempt.started_at) {
      const startTime = new Date(latestAttempt.started_at).getTime();
      const endTime = Date.now();
      timeTakenSeconds = Math.max(1, Math.round((endTime - startTime) / 1000));
    }

    db.prepare(`
      UPDATE quiz_attempts
      SET status = 'COMPLETED',
          score = ?,
          total_marks = ?,
          submitted_at = CURRENT_TIMESTAMP,
          time_taken = ?
      WHERE id = ?
    `).run(totalScore, maxMarks, timeTakenSeconds, latestAttempt.id);
  });

  try {
    submitTransaction();
    return res.json({
      success: true,
      status: 'COMPLETED',
      message: 'Quiz Submitted Successfully'
    });
  } catch (err) {
    console.error('Submission error:', err);
    return res.status(500).json({ error: 'Error submitting quiz answers. Please try again.' });
  }
});

export default router;
