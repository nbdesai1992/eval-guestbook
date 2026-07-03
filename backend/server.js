'use strict';

const express = require('express');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('FATAL: DATABASE_URL is not set');
  process.exit(1);
}

// SSL only for Render external hosts (*.render.com); internal host needs no SSL.
const useSsl = /\.render\.com/.test(DATABASE_URL);
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

const app = express();
app.use(express.json());

// Permissive CORS (defensive; normal traffic is server-side proxied).
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/entries', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, message, created_at FROM entries ORDER BY created_at DESC, id DESC LIMIT 50'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/entries failed:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

app.post('/api/entries', async (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || !message) {
    return res.status(400).json({ error: 'name and message are required' });
  }
  if (name.length > 80) {
    return res.status(400).json({ error: 'name must be 80 characters or fewer' });
  }
  if (message.length > 500) {
    return res.status(400).json({ error: 'message must be 500 characters or fewer' });
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO entries (name, message) VALUES ($1, $2) RETURNING id, name, message, created_at',
      [name, message]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/entries failed:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`eval-guestbook-api listening on ${port} (ssl=${useSsl})`);
});
