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

  // Check if phone already exists
  const existingPart = db.prepare('SELECT * FROM participants WHERE phone = ?').get(cleanPhone);

  if (existingPart) {
    // Fetch latest quiz attempt for this participant
    const latestAttempt = db.prepare(`
      SELECT * FROM quiz_attempts 
      WHERE participant_id = ? 
      ORDER BY attempt_number DESC, id DESC 
      LIMIT 1
    `).get(existingPart.id);

    if (latestAttempt && latestAttempt.status === 'COMPLETED') {
      if (existingPart.access_status !== 'ALLOWED_RETAKE') {
        return res.status(400).json({
          alreadyCompleted: true,
          error: 'Already Registered',
          message: 'This phone number has already been used for this quiz.'
        });
      }

      // If admin granted retake permission: create a new attempt
      const newAttemptNum = (latestAttempt.attempt_number || 1) + 1;
      
      const createRetake = db.transaction(() => {
        db.prepare('UPDATE participants SET access_status = ? WHERE id = ?').run('ALLOWED', existingPart.id);
        const result = db.prepare(`
          INSERT INTO quiz_attempts (participant_id, attempt_number, status)
          VALUES (?, ?, 'REGISTERED')
        `).run(existingPart.id, newAttemptNum);
        return result.lastInsertRowid;
      });

      const attemptId = createRetake();
      return res.status(201).json({
        message: 'New attempt authorized.',
        phone: cleanPhone,
        name: existingPart.name,
        college: existingPart.college,
        attempt_id: attemptId,
        attempt_number: newAttemptNum,
        status: 'REGISTERED'
      });
    }

    // If existing attempt is REGISTERED or IN_PROGRESS, allow continuing
    return res.json({
      message: 'Registration retrieved successfully.',
      phone: cleanPhone,
      name: existingPart.name,
      college: existingPart.college,
      attempt_id: latestAttempt ? latestAttempt.id : null,
      attempt_number: latestAttempt ? latestAttempt.attempt_number : 1,
      status: latestAttempt ? latestAttempt.status : 'REGISTERED'
    });
  }

  // Create New Participant & Attempt #1
  const createNew = db.transaction(() => {
    const partResult = db.prepare(`
      INSERT INTO participants (name, phone, college, access_status)
      VALUES (?, ?, ?, 'ALLOWED')
    `).run(cleanName, cleanPhone, cleanCollege);

    const pId = partResult.lastInsertRowid;

    const attemptResult = db.prepare(`
      INSERT INTO quiz_attempts (participant_id, attempt_number, status)
      VALUES (?, 1, 'REGISTERED')
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
    return res.status(500).json({ error: 'Failed to complete registration. Please try again.' });
  }
});

// 2. GET SESSION BY PHONE NUMBER
router.get('/session/:phone', (req, res) => {
  const { phone } = req.params;
  const cleanPhone = phone.trim().replace(/[\s-]/g, '');

  const participant = db.prepare('SELECT * FROM participants WHERE phone = ?').get(cleanPhone);
  if (!participant) {
    return res.status(404).json({ error: 'Participant not found.' });
  }

  const latestAttempt = db.prepare(`
    SELECT * FROM quiz_attempts 
    WHERE participant_id = ? 
    ORDER BY attempt_number DESC, id DESC 
    LIMIT 1
  `).get(participant.id);

  let savedAnswers = {};
  if (latestAttempt && latestAttempt.id) {
    const answers = db.prepare('SELECT question_id, selected_answer FROM answers WHERE attempt_id = ?').all(latestAttempt.id);
    answers.forEach(a => {
      savedAnswers[a.question_id] = a.selected_answer;
    });
  }

  return res.json({
    phone: participant.phone,
    name: participant.name,
    college: participant.college,
    access_status: participant.access_status,
    attempt_id: latestAttempt ? latestAttempt.id : null,
    attempt_number: latestAttempt ? latestAttempt.attempt_number : 1,
    status: latestAttempt ? latestAttempt.status : 'REGISTERED',
    started_at: latestAttempt ? latestAttempt.started_at : null,
    submitted_at: latestAttempt ? latestAttempt.submitted_at : null,
    savedAnswers
  });
});

// 3. START QUIZ
router.post('/start', (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  const cleanPhone = phone.trim().replace(/[\s-]/g, '');
  const participant = db.prepare('SELECT * FROM participants WHERE phone = ?').get(cleanPhone);
  if (!participant) {
    return res.status(404).json({ error: 'Participant record not found.' });
  }

  const latestAttempt = db.prepare(`
    SELECT * FROM quiz_attempts 
    WHERE participant_id = ? 
    ORDER BY attempt_number DESC, id DESC 
    LIMIT 1
  `).get(participant.id);

  if (!latestAttempt) {
    return res.status(404).json({ error: 'No active quiz attempt found.' });
  }

  if (latestAttempt.status === 'COMPLETED') {
    return res.status(400).json({ error: 'Quiz has already been submitted.' });
  }

  const totalQuestions = db.prepare('SELECT COUNT(*) as count FROM questions').get().count;
  const totalMarks = db.prepare('SELECT SUM(marks) as total FROM questions').get().total || totalQuestions;

  if (latestAttempt.status === 'REGISTERED') {
    db.prepare(`
      UPDATE quiz_attempts
      SET status = 'IN_PROGRESS', started_at = CURRENT_TIMESTAMP, total_marks = ?
      WHERE id = ?
    `).run(totalMarks, latestAttempt.id);
  }

  return res.json({
    message: 'Quiz started successfully.',
    phone: cleanPhone,
    status: 'IN_PROGRESS',
    attempt_number: latestAttempt.attempt_number,
    totalQuestions
  });
});

// 4. SANITIZED QUIZ QUESTIONS (NO CORRECT ANSWERS OR MARKS LEAKED!)
router.get('/questions', (req, res) => {
  const questions = db.prepare(`
    SELECT id, question, option_a, option_b, option_c, option_d
    FROM questions
    ORDER BY id ASC
  `).all();

  return res.json(questions);
});

// 4b. GET PUBLIC QUIZ SETTINGS (e.g. Duration in minutes)
router.get('/settings', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'quiz_duration_minutes'").get();
  const durationMinutes = row ? Number(row.value) : 30;
  return res.json({ durationMinutes });
});

// 5. SAVE INTERMEDIATE ANSWER
router.post('/save-answer', (req, res) => {
  const { phone, question_id, selected_answer } = req.body;
  if (!phone || !question_id) {
    return res.status(400).json({ error: 'Missing required parameters.' });
  }

  const cleanPhone = phone.trim().replace(/[\s-]/g, '');
  const participant = db.prepare('SELECT * FROM participants WHERE phone = ?').get(cleanPhone);
  if (!participant) {
    return res.status(404).json({ error: 'Participant not found.' });
  }

  const latestAttempt = db.prepare(`
    SELECT * FROM quiz_attempts 
    WHERE participant_id = ? AND status = 'IN_PROGRESS' 
    ORDER BY attempt_number DESC, id DESC 
    LIMIT 1
  `).get(participant.id);

  if (!latestAttempt) {
    return res.status(400).json({ error: 'Cannot save answer for an inactive attempt.' });
  }

  const upsertStmt = db.prepare(`
    INSERT INTO answers (attempt_id, question_id, selected_answer)
    VALUES (?, ?, ?)
    ON CONFLICT(attempt_id, question_id) DO UPDATE SET selected_answer = excluded.selected_answer
  `);

  upsertStmt.run(latestAttempt.id, question_id, selected_answer);
  return res.json({ success: true });
});

// 5b. TAB SWITCH DETECTION LOCK ENDPOINT
router.post('/tab-switch-block', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone is required.' });

  const cleanPhone = phone.trim().replace(/[\s-]/g, '');
  const participant = db.prepare('SELECT * FROM participants WHERE phone = ?').get(cleanPhone);
  if (!participant) return res.status(404).json({ error: 'Participant not found.' });

  const latestAttempt = db.prepare(`
    SELECT * FROM quiz_attempts 
    WHERE participant_id = ? 
    ORDER BY attempt_number DESC, id DESC 
    LIMIT 1
  `).get(participant.id);

  db.transaction(() => {
    db.prepare("UPDATE participants SET access_status = 'BLOCKED' WHERE id = ?").run(participant.id);
    if (latestAttempt && latestAttempt.status === 'IN_PROGRESS') {
      db.prepare("UPDATE quiz_attempts SET status = 'BLOCKED' WHERE id = ?").run(latestAttempt.id);
    }
  })();

  return res.json({
    blocked: true,
    message: 'Quiz locked due to tab switch or window blur detection.'
  });
});

// 6. SUBMIT QUIZ (STRICT 100% ANSWERED ENFORCEMENT & RESULT PRIVACY)
router.post('/submit', (req, res) => {
  const { phone, answers } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }

  const cleanPhone = phone.trim().replace(/[\s-]/g, '');
  const participant = db.prepare('SELECT * FROM participants WHERE phone = ?').get(cleanPhone);
  if (!participant) {
    return res.status(404).json({ error: 'Participant record not found.' });
  }

  const latestAttempt = db.prepare(`
    SELECT * FROM quiz_attempts 
    WHERE participant_id = ? AND status = 'IN_PROGRESS' 
    ORDER BY attempt_number DESC, id DESC 
    LIMIT 1
  `).get(participant.id);

  if (!latestAttempt) {
    return res.status(400).json({ error: 'No in-progress attempt found to submit.' });
  }

  // Fetch all questions to verify 100% completion
  const allQuestions = db.prepare('SELECT id, correct_answer, marks FROM questions').all();
  const userAnswersMap = new Map();
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

    // Time taken calculation
    let timeTakenSeconds = 0;
    if (latestAttempt.started_at) {
      const startTime = new Date(latestAttempt.started_at + 'Z').getTime();
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
    // PRIVACY GUARANTEE: NEVER RETURN SCORES / PERCENTAGE TO PARTICIPANT API!
    return res.json({
      success: true,
      message: 'Quiz Submitted'
    });
  } catch (err) {
    console.error('Submission error:', err);
    return res.status(500).json({ error: 'Error submitting quiz answers. Please try again.' });
  }
});

export default router;
