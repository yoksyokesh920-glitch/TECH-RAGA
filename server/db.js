import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'quiz_database.db');
const db = new Database(dbPath);

// Enable WAL mode & concurrency tuning for 1000+ simultaneous participants
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 10000');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000'); // 64MB memory page cache
db.pragma('temp_store = MEMORY');
db.pragma('mmap_size = 268435456'); // 256MB memory mapping for fast zero-copy reads

// Helper function to execute write transactions with exponential backoff on SQLITE_BUSY
export function dbWriteWithRetry(fn, maxRetries = 6, delayMs = 25) {
  let attempt = 0;
  while (true) {
    try {
      return fn();
    } catch (err) {
      const isBusy = err.code === 'SQLITE_BUSY' || err.code === 'SQLITE_LOCKED' || String(err).includes('locked');
      if (isBusy && attempt < maxRetries) {
        attempt++;
        const wait = delayMs * Math.pow(2, attempt - 1);
        const end = Date.now() + wait;
        while (Date.now() < end) {}
        continue;
      }
      throw err;
    }
  }
}

export function initDatabase() {
  // Drop old tables if participant_id column exists from previous version to cleanly migrate
  try {
    const pCols = db.pragma('table_info(participants)');
    const hasParticipantId = pCols.some(c => c.name === 'participant_id');
    if (hasParticipantId) {
      console.log('Migrating database schema: removing participant_id column...');
      db.exec('DROP TABLE IF EXISTS answers');
      db.exec('DROP TABLE IF EXISTS quiz_attempts');
      db.exec('DROP TABLE IF EXISTS participants');
    }
  } catch (e) {
    // ignore
  }

  // 1. PARTICIPANTS (No Participant ID string!)
  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      college TEXT NOT NULL,
      access_status TEXT DEFAULT 'ALLOWED',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Handle duplicate phone numbers if any exist in existing database before enforcing index
  try {
    const dupes = db.prepare(`
      SELECT phone, COUNT(*) as count 
      FROM participants 
      WHERE access_status != 'REMOVED'
      GROUP BY phone 
      HAVING count > 1
    `).all();

    if (dupes.length > 0) {
      console.log(`Found ${dupes.length} duplicate phone number groups in participants table. Resolving...`);
      for (const d of dupes) {
        const records = db.prepare("SELECT id FROM participants WHERE phone = ? AND access_status != 'REMOVED' ORDER BY id DESC").all(d.phone);
        const [keepId, ...removeIds] = records.map(r => r.id);
        if (removeIds.length > 0) {
          const updateStmt = db.prepare("UPDATE participants SET access_status = 'REMOVED' WHERE id = ?");
          for (const remId of removeIds) {
            updateStmt.run(remId);
          }
        }
      }
    }
  } catch (e) {
    console.error('Error resolving duplicate phone numbers:', e);
  }

  // Create Unique Index for active participants
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_active_phone ON participants(phone) WHERE access_status != 'REMOVED'`);
  } catch (e) {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_participants_phone ON participants(phone)`);
  }

  // 2. QUESTIONS
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      option_a TEXT NOT NULL,
      option_b TEXT NOT NULL,
      option_c TEXT NOT NULL,
      option_d TEXT NOT NULL,
      correct_answer TEXT NOT NULL,
      marks INTEGER DEFAULT 1
    )
  `);

  // 3. QUIZ_ATTEMPTS
  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL,
      attempt_number INTEGER DEFAULT 1,
      started_at DATETIME,
      test_end_time DATETIME,
      submitted_at DATETIME,
      score INTEGER DEFAULT 0,
      total_marks INTEGER DEFAULT 0,
      time_taken INTEGER DEFAULT 0,
      warning_count INTEGER DEFAULT 0,
      tab_switch_count INTEGER DEFAULT 0,
      last_warning_at DATETIME,
      status TEXT DEFAULT 'REGISTERED',
      FOREIGN KEY (participant_id) REFERENCES participants(id)
    )
  `);

  // Column Migrations for existing database
  try {
    const qCols = db.pragma('table_info(quiz_attempts)');
    const colNames = qCols.map(c => c.name);
    if (!colNames.includes('test_end_time')) {
      db.exec('ALTER TABLE quiz_attempts ADD COLUMN test_end_time DATETIME');
    }
    if (!colNames.includes('warning_count')) {
      db.exec('ALTER TABLE quiz_attempts ADD COLUMN warning_count INTEGER DEFAULT 0');
    }
    if (!colNames.includes('tab_switch_count')) {
      db.exec('ALTER TABLE quiz_attempts ADD COLUMN tab_switch_count INTEGER DEFAULT 0');
    }
    if (!colNames.includes('last_warning_at')) {
      db.exec('ALTER TABLE quiz_attempts ADD COLUMN last_warning_at DATETIME');
    }
  } catch (e) {
    console.error('Error migrating quiz_attempts columns:', e);
  }

  // 4. ANSWERS
  db.exec(`
    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attempt_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_answer TEXT,
      is_correct INTEGER DEFAULT 0,
      UNIQUE(attempt_id, question_id),
      FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    )
  `);

  // 5. ADMIN_USERS
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 6. SETTINGS (Quiz duration, options, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  // 7. PERFORMANCE INDEXES FOR 1000+ CONCURRENT PARTICIPANTS
  db.exec(`CREATE INDEX IF NOT EXISTS idx_participants_phone ON participants(phone)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quiz_attempts_participant ON quiz_attempts(participant_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_quiz_attempts_status ON quiz_attempts(status)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_answers_attempt ON answers(attempt_id)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_answers_attempt_q ON answers(attempt_id, question_id)`);

  // Seed Admin user if none exists
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin_users').get().count;
  if (adminCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run('admin', hash);
    console.log('Seeded default admin user: admin / admin123');
  }

  // Seed sample questions if empty
  const questionCount = db.prepare('SELECT COUNT(*) as count FROM questions').get().count;
  if (questionCount === 0) {
    const sampleQuestions = [
      {
        question: 'Which programming language is primary for native Android app development?',
        option_a: 'Java / Kotlin',
        option_b: 'HTML5',
        option_c: 'CSS3',
        option_d: 'SQL',
        correct_answer: 'A',
        marks: 1
      },
      {
        question: 'What does CSS stand for in web technologies?',
        option_a: 'Creative Style Sheets',
        option_b: 'Cascading Style Sheets',
        option_c: 'Computer Style Software',
        option_d: 'Colorful Style Syntax',
        correct_answer: 'B',
        marks: 1
      },
      {
        question: 'Which data structure follows the First-In, First-Out (FIFO) principle?',
        option_a: 'Stack',
        option_b: 'Tree',
        option_c: 'Queue',
        option_d: 'Graph',
        correct_answer: 'C',
        marks: 1
      },
      {
        question: 'What is the time complexity of searching in a balanced Binary Search Tree (BST)?',
        option_a: 'O(1)',
        option_b: 'O(n)',
        option_c: 'O(n log n)',
        option_d: 'O(log n)',
        correct_answer: 'D',
        marks: 1
      },
      {
        question: 'Which protocol is used for secure encrypted web communication?',
        option_a: 'HTTP',
        option_b: 'HTTPS',
        option_c: 'FTP',
        option_d: 'SMTP',
        correct_answer: 'B',
        marks: 1
      },
      {
        question: 'In relational databases, what does SQL stand for?',
        option_a: 'Sequential Query Language',
        option_b: 'Structured Query Language',
        option_c: 'System Query Logic',
        option_d: 'Simple Query Line',
        correct_answer: 'B',
        marks: 1
      },
      {
        question: 'Which component is known as the "Brain" of a computer system?',
        option_a: 'RAM',
        option_b: 'Hard Disk',
        option_c: 'Central Processing Unit (CPU)',
        option_d: 'GPU',
        correct_answer: 'C',
        marks: 1
      },
      {
        question: 'What is the primary function of Git in software development?',
        option_a: 'Database Management',
        option_b: 'Distributed Version Control',
        option_c: 'Cloud Hosting',
        option_d: 'Code Compilation',
        correct_answer: 'B',
        marks: 1
      },
      {
        question: 'Which HTTP method is typically used to create a new resource on a server?',
        option_a: 'GET',
        option_b: 'POST',
        option_c: 'DELETE',
        option_d: 'HEAD',
        correct_answer: 'B',
        marks: 1
      },
      {
        question: 'In JavaScript, which keyword declares a block-scoped variable that can be reassigned?',
        option_a: 'var',
        option_b: 'const',
        option_c: 'let',
        option_d: 'static',
        correct_answer: 'C',
        marks: 1
      }
    ];

    const insertStmt = db.prepare(`
      INSERT INTO questions (question, option_a, option_b, option_c, option_d, correct_answer, marks)
      VALUES (@question, @option_a, @option_b, @option_c, @option_d, @correct_answer, @marks)
    `);

    const insertMany = db.transaction((qs) => {
      for (const q of qs) insertStmt.run(q);
    });

    insertMany(sampleQuestions);
    console.log(`Seeded ${sampleQuestions.length} initial sample questions.`);
  }
}

export default db;
