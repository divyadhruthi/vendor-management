const db = require('./database');
const bcrypt = require('bcryptjs');

console.log('Initializing database for Glory Simon Interiors...\n');

const seed = db.transaction(() => {
  db.prepare('DELETE FROM notifications').run();
  db.prepare('DELETE FROM vendor_ratings').run();
  db.prepare('DELETE FROM payments').run();
  db.prepare('DELETE FROM milestones').run();
  db.prepare('DELETE FROM tasks').run();
  db.prepare('DELETE FROM site_visits').run();
  db.prepare('DELETE FROM quotations').run();
  db.prepare('DELETE FROM materials').run();
  db.prepare('DELETE FROM projects').run();
  db.prepare('DELETE FROM vendors').run();
  db.prepare('DELETE FROM clients').run();
  db.prepare('DELETE FROM users').run();

  db.prepare("DELETE FROM sqlite_sequence").run();

  const hashedPassword = bcrypt.hashSync('admin@123', 10);

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)'
  );
  insertUser.run('Glory Simon', 'admin@glorysimon.com', hashedPassword, 'admin', '9876543210');

  console.log('  1 admin user created');
  console.log('  All demo data cleared');
});

try {
  seed();
  console.log('\nDatabase initialized successfully!');
  console.log('\nAdmin login credentials:');
  console.log('  Email:    admin@glorysimon.com');
  console.log('  Password: admin@123');
} catch (err) {
  console.error('Initialization failed:', err);
  process.exit(1);
}
