const Database = require('better-sqlite3');
const crypto = require('crypto');

const db = new Database('sqlite.db');

const username = process.env.SEED_ADMIN_USERNAME || 'admin';
const password = process.env.SEED_ADMIN_PASSWORD;

if (!password) {
  throw new Error('Set SEED_ADMIN_PASSWORD before seeding the admin user.');
}

// Generate a random salt
const salt = crypto.randomBytes(16).toString('hex');
// Hash the password with the salt using scryptSync
const hash = crypto.scryptSync(password, salt, 64).toString('hex');
const passwordHash = `${salt}:${hash}`;

db.prepare(`
  INSERT INTO users (username, passwordHash, name, role, createdAt, updatedAt, lastSignInAt)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(username) DO UPDATE SET
    passwordHash = excluded.passwordHash,
    updatedAt = excluded.updatedAt
`).run(
  username,
  passwordHash,
  'Super Admin',
  'admin',
  new Date().getTime(),
  new Date().getTime(),
  new Date().getTime()
);

console.log('Seed successful. Created user:', username);
