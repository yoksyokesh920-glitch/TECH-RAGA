import db from '../server/db.js';

console.log('Clearing database tables...');
db.exec('DELETE FROM answers');
db.exec('DELETE FROM quiz_attempts');
db.exec('DELETE FROM participants');
db.exec("UPDATE sqlite_sequence SET seq = 0 WHERE name IN ('participants', 'quiz_attempts', 'answers')");
console.log('✅ Database reset to clean state (Participants: 0, Attempts: 0, Answers: 0)');
