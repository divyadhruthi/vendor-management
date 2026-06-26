const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

const routesDir = path.join(__dirname, 'routes');
const middlewareDir = path.join(__dirname, 'middleware');
if (!fs.existsSync(routesDir)) fs.mkdirSync(routesDir, { recursive: true });
if (!fs.existsSync(middlewareDir)) fs.mkdirSync(middlewareDir, { recursive: true });

require('./database');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/site-visits', require('./routes/site-visits'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });
}

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Glory Simon Interiors - Vendor Management API running on port ${PORT}`);
});

module.exports = app;
