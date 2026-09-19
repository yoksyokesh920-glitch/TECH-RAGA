import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authenticateAdmin, JWT_SECRET } from '../middleware/auth.js';

const router = express.Router();

// 1. ADMIN LOGIN
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username.trim());
  if (!admin) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const isMatch = bcrypt.compareSync(password, admin.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }

  const token = jwt.sign(
    { id: admin.id, username: admin.username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.json({
    message: 'Admin login successful.',
    token,
    user: { id: admin.id, username: admin.username }
  });
});

// All subsequent routes require admin authentication
router.use(authenticateAdmin);

// 2. DASHBOARD SUMMARY STATS
router.get('/dashboard-stats', (req, res) => {
  const totalParticipants = db.prepare('SELECT COUNT(*) as count FROM participants').get().count;
  const completedAttempts = db.prepare("SELECT COUNT(*) as count FROM quiz_attempts WHERE status = 'COMPLETED'").get().count;
  const registeredAttempts = db.prepare("SELECT COUNT(*) as count FROM quiz_attempts WHERE status = 'REGISTERED'").get().count;
  const inProgressAttempts = db.prepare("SELECT COUNT(*) as count FROM quiz_attempts WHERE status = 'IN_PROGRESS'").get().count;
  const numColleges = db.prepare('SELECT COUNT(DISTINCT college) as count FROM participants').get().count;

  const scoreStats = db.prepare(`
    SELECT AVG(score) as avgScore, MAX(score) as maxScore
    FROM quiz_attempts
    WHERE status = 'COMPLETED'
  `).get();

  const totalQuestions = db.prepare('SELECT COUNT(*) as count FROM questions').get().count;
  const totalMarks = db.prepare('SELECT SUM(marks) as total FROM questions').get().total || totalQuestions;

  return res.json({
    totalParticipants,
    completedAttempts,
    registeredAttempts,
    inProgressAttempts,
    numColleges,
    averageScore: scoreStats && scoreStats.avgScore !== null ? Number(scoreStats.avgScore.toFixed(1)) : 0,
    highestScore: scoreStats && scoreStats.maxScore !== null ? scoreStats.maxScore : 0,
    totalQuestions,
    totalMarks
  });
});

// 3. PARTICIPANT RESULTS TABLE (Deduplicated per candidate, showing latest attempt)
router.get('/results', (req, res) => {
  const { search, college, status, sortBy, sortOrder } = req.query;

  let query = `
    SELECT 
      p.id as participant_db_id,
      p.name,
      p.phone,
      p.college,
      p.access_status,
      p.created_at as registered_at,
      a.id as attempt_id,
      a.attempt_number,
      a.started_at,
      a.submitted_at,
      a.score,
      a.total_marks,
      a.time_taken,
      a.status
    FROM participants p
    LEFT JOIN (
      SELECT * FROM quiz_attempts
      WHERE id IN (
        SELECT MAX(id) FROM quiz_attempts GROUP BY participant_id
      )
    ) a ON p.id = a.participant_id
    WHERE 1=1
  `;

  const params = [];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    query += ` AND (p.name LIKE ? OR p.phone LIKE ? OR p.college LIKE ?)`;
    params.push(term, term, term);
  }

  if (college && college.trim()) {
    query += ` AND p.college = ?`;
    params.push(college.trim());
  }

  if (status && status.trim()) {
    query += ` AND a.status = ?`;
    params.push(status.trim());
  }

  // Sorting
  const order = sortOrder && sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  if (sortBy === 'score') {
    query += ` ORDER BY a.score ${order}, a.submitted_at DESC`;
  } else if (sortBy === 'submitted_at') {
    query += ` ORDER BY a.submitted_at ${order}`;
  } else if (sortBy === 'name') {
    query += ` ORDER BY p.name ${order}`;
  } else {
    query += ` ORDER BY p.id DESC`;
  }

  const results = db.prepare(query).all(...params);

  const formattedResults = results.map(r => {
    const tMarks = r.total_marks || 10;
    const percentage = r.score !== null && tMarks > 0 ? Number(((r.score / tMarks) * 100).toFixed(1)) : 0;
    return {
      ...r,
      percentage
    };
  });

  return res.json(formattedResults);
});

// 4. PARTICIPANT ATTEMPT HISTORY & INDIVIDUAL ANSWERS
router.get('/participant/:participantDbId', (req, res) => {
  const { participantDbId } = req.params;
  const participant = db.prepare('SELECT * FROM participants WHERE id = ?').get(participantDbId);

  if (!participant) {
    return res.status(404).json({ error: 'Participant not found.' });
  }

  const attempts = db.prepare('SELECT * FROM quiz_attempts WHERE participant_id = ? ORDER BY attempt_number DESC').all(participantDbId);
  const latestAttempt = attempts[0] || null;

  let answersWithQuestions = [];
  if (latestAttempt && latestAttempt.id) {
    answersWithQuestions = db.prepare(`
      SELECT 
        q.id as question_id,
        q.question,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_answer,
        q.marks,
        ans.selected_answer,
        ans.is_correct
      FROM questions q
      LEFT JOIN answers ans ON q.id = ans.question_id AND ans.attempt_id = ?
      ORDER BY q.id ASC
    `).all(latestAttempt.id);
  }

  return res.json({
    participant,
    attempts,
    latestAttempt,
    answers: answersWithQuestions
  });
});

// 5. ALLOW RETAKE / RESET ATTEMPT / BLOCK PARTICIPANT
router.post('/participant/allow-retake', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone is required.' });

  const participant = db.prepare('SELECT * FROM participants WHERE phone = ?').get(phone);
  if (!participant) return res.status(404).json({ error: 'Participant not found.' });

  db.prepare("UPDATE participants SET access_status = 'ALLOWED_RETAKE' WHERE id = ?").run(participant.id);
  return res.json({ success: true, message: 'Participant authorized for a new attempt.' });
});

router.post('/participant/toggle-block', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone is required.' });

  const participant = db.prepare('SELECT * FROM participants WHERE phone = ?').get(phone);
  if (!participant) return res.status(404).json({ error: 'Participant not found.' });

  const newStatus = participant.access_status === 'BLOCKED' ? 'ALLOWED' : 'BLOCKED';
  
  db.transaction(() => {
    db.prepare('UPDATE participants SET access_status = ? WHERE id = ?').run(newStatus, participant.id);
    const latestAttempt = db.prepare(`
      SELECT * FROM quiz_attempts 
      WHERE participant_id = ? 
      ORDER BY attempt_number DESC, id DESC 
      LIMIT 1
    `).get(participant.id);

    if (latestAttempt) {
      if (newStatus === 'BLOCKED' && latestAttempt.status === 'IN_PROGRESS') {
        db.prepare("UPDATE quiz_attempts SET status = 'BLOCKED' WHERE id = ?").run(latestAttempt.id);
      } else if (newStatus === 'ALLOWED' && latestAttempt.status === 'BLOCKED') {
        db.prepare("UPDATE quiz_attempts SET status = 'IN_PROGRESS' WHERE id = ?").run(latestAttempt.id);
      }
    }
  })();

  return res.json({ success: true, access_status: newStatus });
});

// 6. COLLEGE ANALYTICS
router.get('/colleges', (req, res) => {
  const collegeStats = db.prepare(`
    SELECT 
      p.college,
      COUNT(DISTINCT p.id) as totalParticipants,
      SUM(CASE WHEN a.status = 'COMPLETED' THEN 1 ELSE 0 END) as completedParticipants,
      ROUND(AVG(CASE WHEN a.status = 'COMPLETED' THEN a.score ELSE NULL END), 1) as avgScore,
      MAX(CASE WHEN a.status = 'COMPLETED' THEN a.score ELSE 0 END) as maxScore
    FROM participants p
    LEFT JOIN quiz_attempts a ON p.id = a.participant_id
    GROUP BY p.college
    ORDER BY totalParticipants DESC
  `).all();

  return res.json(collegeStats.map(c => ({
    college: c.college,
    totalParticipants: c.totalParticipants || 0,
    completedParticipants: c.completedParticipants || 0,
    avgScore: c.avgScore !== null ? c.avgScore : 0,
    highestScore: c.maxScore || 0
  })));
});

// 7. QUESTION ANALYSIS (Per Question Performance Stats)
router.get('/question-analysis', (req, res) => {
  const questions = db.prepare('SELECT * FROM questions ORDER BY id ASC').all();

  const analysis = questions.map(q => {
    const stats = db.prepare(`
      SELECT 
        COUNT(ans.id) as totalResponses,
        SUM(CASE WHEN ans.is_correct = 1 THEN 1 ELSE 0 END) as correctResponses,
        SUM(CASE WHEN ans.is_correct = 0 AND ans.selected_answer IS NOT NULL THEN 1 ELSE 0 END) as wrongResponses
      FROM answers ans
      JOIN quiz_attempts qa ON ans.attempt_id = qa.id
      WHERE ans.question_id = ? AND qa.status = 'COMPLETED'
    `).get(q.id);

    const total = stats ? stats.totalResponses : 0;
    const correct = stats ? stats.correctResponses || 0 : 0;
    const wrong = stats ? stats.wrongResponses || 0 : 0;
    const pct = total > 0 ? Number(((correct / total) * 100).toFixed(1)) : 0;

    return {
      id: q.id,
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      marks: q.marks,
      totalResponses: total,
      correctResponses: correct,
      wrongResponses: wrong,
      percentageCorrect: pct
    };
  });

  return res.json(analysis);
});

// 8. QUESTION MANAGEMENT CRUD & BULK IMPORT
router.post('/questions/import', (req, res) => {
  const { questions } = req.body;
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'Questions array is required.' });
  }

  const insertStmt = db.prepare(`
    INSERT INTO questions (question, option_a, option_b, option_c, option_d, correct_answer, marks)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const importTx = db.transaction(() => {
    let count = 0;
    for (const q of questions) {
      if (q.question && q.option_a && q.option_b && q.option_c && q.option_d) {
        insertStmt.run(
          q.question.trim(),
          q.option_a.trim(),
          q.option_b.trim(),
          q.option_c.trim(),
          q.option_d.trim(),
          (q.correct_answer || 'A').toUpperCase(),
          q.marks || 1
        );
        count++;
      }
    }
    return count;
  });

  try {
    const importedCount = importTx();
    return res.status(201).json({
      message: `${importedCount} questions imported successfully.`,
      importedCount
    });
  } catch (err) {
    console.error('Import questions error:', err);
    return res.status(500).json({ error: 'Failed to import questions.' });
  }
});

router.post('/questions', (req, res) => {
  const { question, option_a, option_b, option_c, option_d, correct_answer, marks } = req.body;

  if (!question || !option_a || !option_b || !option_c || !option_d || !correct_answer) {
    return res.status(400).json({ error: 'All question fields and options are required.' });
  }

  const validAnswers = ['A', 'B', 'C', 'D'];
  if (!validAnswers.includes(correct_answer.toUpperCase())) {
    return res.status(400).json({ error: 'Correct answer must be A, B, C, or D.' });
  }

  const result = db.prepare(`
    INSERT INTO questions (question, option_a, option_b, option_c, option_d, correct_answer, marks)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    question.trim(),
    option_a.trim(),
    option_b.trim(),
    option_c.trim(),
    option_d.trim(),
    correct_answer.toUpperCase(),
    marks || 1
  );

  return res.status(201).json({
    message: 'Question added successfully.',
    id: result.lastInsertRowid
  });
});

router.put('/questions/:id', (req, res) => {
  const { id } = req.params;
  const { question, option_a, option_b, option_c, option_d, correct_answer, marks } = req.body;

  const existing = db.prepare('SELECT 1 FROM questions WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Question not found.' });
  }

  db.prepare(`
    UPDATE questions
    SET question = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_answer = ?, marks = ?
    WHERE id = ?
  `).run(
    question.trim(),
    option_a.trim(),
    option_b.trim(),
    option_c.trim(),
    option_d.trim(),
    correct_answer.toUpperCase(),
    marks || 1,
    id
  );

  return res.json({ message: 'Question updated successfully.' });
});

router.delete('/questions/:id', (req, res) => {
  const { id } = req.params;

  db.transaction(() => {
    db.prepare('DELETE FROM answers WHERE question_id = ?').run(id);
    db.prepare('DELETE FROM questions WHERE id = ?').run(id);
  })();

  return res.json({ message: 'Question deleted successfully.' });
});

// 9. EXPORT CSV (Deduplicated per participant)
router.get('/export', (req, res) => {
  const rows = db.prepare(`
    SELECT 
      p.name,
      p.phone,
      p.college,
      a.attempt_number,
      a.score,
      a.total_marks,
      a.time_taken,
      a.submitted_at,
      a.status
    FROM participants p
    LEFT JOIN (
      SELECT * FROM quiz_attempts
      WHERE id IN (
        SELECT MAX(id) FROM quiz_attempts GROUP BY participant_id
      )
    ) a ON p.id = a.participant_id
    ORDER BY p.id ASC
  `).all();

  let csvContent = 'Name,Phone,College,Attempt Number,Score,Total Marks,Percentage,Time Taken (s),Submitted At,Status\n';

  rows.forEach(r => {
    const score = r.score !== null ? r.score : 0;
    const tMarks = r.total_marks || 10;
    const pct = tMarks > 0 ? ((score / tMarks) * 100).toFixed(1) : '0.0';
    const timeTaken = r.time_taken || 0;
    const subAt = r.submitted_at ? `"${r.submitted_at}"` : 'N/A';
    const name = `"${(r.name || '').replace(/"/g, '""')}"`;
    const college = `"${(r.college || '').replace(/"/g, '""')}"`;
    const attNum = r.attempt_number || 1;

    csvContent += `${name},${r.phone},${college},${attNum},${score},${tMarks},${pct}%,${timeTaken},${subAt},${r.status}\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="quiz_participants_results_2026.csv"');
  return res.send(csvContent);
});

// 10. GET & UPDATE ADMIN QUIZ SETTINGS
router.get('/settings', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'quiz_duration_minutes'").get();
  return res.json({ quiz_duration_minutes: row ? Number(row.value) : 15 });
});

router.put('/settings', (req, res) => {
  const { quiz_duration_minutes } = req.body;
  const numMinutes = Number(quiz_duration_minutes);
  if (isNaN(numMinutes) || numMinutes < 1 || numMinutes > 180) {
    return res.status(400).json({ error: 'Quiz duration must be between 1 and 180 minutes.' });
  }

  db.prepare(`
    INSERT INTO settings (key, value) VALUES ('quiz_duration_minutes', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(String(numMinutes));

  return res.json({
    message: 'Quiz settings updated successfully.',
    quiz_duration_minutes: numMinutes
  });
});

export default router;
