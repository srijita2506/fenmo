const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Initialize SQLite database (persists to file)
const db = new Database('expenses.db');

// Setup Schema
// - amount is stored as INTEGER (smallest currency unit, e.g., paise)
// - idempotency_key has a UNIQUE constraint to prevent duplicate charges
db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount INTEGER NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// GET / (Health Check)
app.get('/', (req, res) => {
  res.send('Expense Tracker API is running! Access /expenses to use the API.');
});

// POST /expenses
app.post('/expenses', (req, res) => {
  const { amount, category, description, date } = req.body;
  const idempotencyKey = req.headers['idempotency-key'];

  if (!idempotencyKey) {
    return res.status(400).json({ error: 'Idempotency-Key header is required' });
  }

  // Basic validation
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
  if (!date) return res.status(400).json({ error: 'Date is required' });

  try {
    // Check if request was already processed (Network retry handling)
    const existing = db.prepare('SELECT * FROM expenses WHERE idempotency_key = ?').get(idempotencyKey);
    if (existing) {
      return res.status(200).json(existing); // Return already processed record
    }

    // Convert amount to integer (e.g., ₹10.50 -> 1050 paise) to prevent floating-point errors
    const amountInSmallestUnit = Math.round(amount * 100);

    const stmt = db.prepare(`
      INSERT INTO expenses (amount, category, description, date, idempotency_key)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(amountInSmallestUnit, category, description, date, idempotencyKey);
    const newExpense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(info.lastInsertRowid);
    
    res.status(201).json(newExpense);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /expenses
app.get('/expenses', (req, res) => {
  const { category, sort } = req.query;
  
  let query = 'SELECT * FROM expenses WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (sort === 'date_desc') {
    query += ' ORDER BY date DESC, created_at DESC';
  } else {
    query += ' ORDER BY created_at DESC';
  }

  try {
    const expenses = db.prepare(query).all(params);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
