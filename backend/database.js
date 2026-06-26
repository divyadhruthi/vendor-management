const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','project_manager','site_engineer','vendor_coordinator','designer','client')),
    phone TEXT,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    city TEXT,
    client_type TEXT,
    company_name TEXT,
    gst_number TEXT,
    source TEXT,
    notes TEXT,
    status TEXT DEFAULT 'active',
    project_status TEXT DEFAULT 'New',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company_name TEXT,
    email TEXT,
    phone TEXT NOT NULL,
    skill_category TEXT NOT NULL,
    experience_years INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    total_projects INTEGER DEFAULT 0,
    address TEXT,
    city TEXT,
    gst_number TEXT,
    pan_number TEXT,
    bank_account TEXT,
    ifsc_code TEXT,
    status TEXT DEFAULT 'active',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    client_id INTEGER NOT NULL,
    project_type TEXT,
    status TEXT DEFAULT 'enquiry',
    priority TEXT DEFAULT 'medium',
    budget_estimate REAL,
    final_amount REAL,
    start_date DATE,
    expected_end_date DATE,
    actual_end_date DATE,
    site_address TEXT,
    city TEXT,
    area_sqft REAL,
    rooms TEXT,
    description TEXT,
    assigned_to INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS site_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    scheduled_date DATETIME NOT NULL,
    visited_date DATETIME,
    visited_by INTEGER,
    status TEXT DEFAULT 'scheduled',
    measurements TEXT,
    site_photos TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (visited_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    quotation_number TEXT UNIQUE,
    version INTEGER DEFAULT 1,
    items TEXT NOT NULL,
    subtotal REAL NOT NULL,
    tax_percent REAL DEFAULT 18,
    tax_amount REAL,
    discount_percent REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'draft',
    valid_until DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    brand TEXT,
    unit TEXT,
    unit_price REAL,
    vendor_id INTEGER,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assigned_vendor_id INTEGER,
    assigned_user_id INTEGER,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    start_date DATE,
    due_date DATE,
    completed_date DATE,
    estimated_cost REAL,
    actual_cost REAL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (assigned_vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (assigned_user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    vendor_id INTEGER,
    task_id INTEGER,
    amount REAL NOT NULL,
    payment_type TEXT,
    payment_mode TEXT,
    status TEXT DEFAULT 'pending',
    reference_number TEXT,
    paid_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  );

  CREATE TABLE IF NOT EXISTS milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    completed_date DATE,
    status TEXT DEFAULT 'pending',
    payment_percent REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS vendor_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER NOT NULL,
    project_id INTEGER,
    task_id INTEGER,
    quality_score INTEGER,
    timeliness_score INTEGER,
    communication_score INTEGER,
    overall_score REAL,
    review TEXT,
    rated_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (rated_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    is_read INTEGER DEFAULT 0,
    link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Ensure clients table has required columns
try {
  const clientCols = db.prepare("PRAGMA table_info(clients)").all().map(c => c.name);
  if (!clientCols.includes('project_status')) {
    db.exec("ALTER TABLE clients ADD COLUMN project_status TEXT DEFAULT 'New'");
  }
  if (!clientCols.includes('company_name')) {
    db.exec("ALTER TABLE clients ADD COLUMN company_name TEXT");
  }
  if (!clientCols.includes('gst_number')) {
    db.exec("ALTER TABLE clients ADD COLUMN gst_number TEXT");
  }
} catch (_) {}

// Auto-create admin user if no users exist (first-time setup)
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('admin@123', 10);
  db.prepare(
    'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)'
  ).run('Glory Simon', 'admin@glorysimon.com', hashedPassword, 'admin', '9876543210');
  console.log('Admin user created automatically (first-time setup)');
}

module.exports = db;
