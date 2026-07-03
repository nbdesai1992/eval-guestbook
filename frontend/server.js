'use strict';

const path = require('path');
const express = require('express');

// Tolerate whatever form API_URL is set to (imperative create sets a full https URL;
// a blueprint `fromService property:host` would yield a scheme-less hostname).
let _apiUrl = (process.env.API_URL || 'http://localhost:3001').replace(/\/+$/, '');
if (!/^https?:\/\//.test(_apiUrl)) _apiUrl = 'https://' + _apiUrl;
const API_URL = _apiUrl;

const app = express();

// Health check (register before the /api proxy; distinct path anyway).
app.get('/healthz', (req, res) => {
  res.json({ ok: true });
});

// Capture the raw request body for proxying (JSON passthrough).
function rawBody(req, res, next) {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks);
    next();
  });
  req.on('error', next);
}

// Proxy ALL methods on /api/* to the backend, preserving path, method,
// Content-Type and JSON body. Return upstream status + JSON to the caller.
app.all('/api/*', rawBody, async (req, res) => {
  const target = API_URL + req.originalUrl;
  const headers = {};
  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type'];
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && req.rawBody && req.rawBody.length > 0;

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? req.rawBody : undefined,
    });

    const text = await upstream.text();
    const ct = upstream.headers.get('content-type') || 'application/json';
    res.status(upstream.status);
    res.setHeader('Content-Type', ct);
    res.send(text);
  } catch (err) {
    console.error(`proxy ${req.method} ${target} failed:`, err.message);
    res.status(502).json({ error: 'bad gateway (backend unreachable)' });
  }
});

// Static site.
app.use(express.static(path.join(__dirname, 'public')));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`eval-guestbook-web listening on ${port} (API_URL=${API_URL})`);
});
