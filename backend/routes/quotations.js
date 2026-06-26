const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

function generateQuotationNumber() {
  const count = db.prepare('SELECT COUNT(*) as count FROM quotations').get().count;
  const num = String(count + 1).padStart(4, '0');
  return `GSI-Q-${num}`;
}

router.get('/', (req, res) => {
  try {
    const { project_id, status } = req.query;
    let query = `
      SELECT q.*, p.title as project_title, c.name as client_name
      FROM quotations q
      LEFT JOIN projects p ON q.project_id = p.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (project_id) {
      query += ' AND q.project_id = ?';
      params.push(project_id);
    }
    if (status) {
      query += ' AND q.status = ?';
      params.push(status);
    }

    query += ' ORDER BY q.created_at DESC';
    const quotations = db.prepare(query).all(...params);

    const parsed = quotations.map(q => ({
      ...q,
      project_name: q.project_title,
      date: q.created_at,
      line_items: q.items ? JSON.parse(q.items) : [],
      items: q.items ? JSON.parse(q.items) : [],
    }));

    res.json({ success: true, data: parsed });
  } catch (err) {
    console.error('List quotations error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch quotations' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const quotation = db.prepare(
      `SELECT q.*, p.title as project_title, c.name as client_name, c.email as client_email, c.phone as client_phone, c.address as client_address
       FROM quotations q
       LEFT JOIN projects p ON q.project_id = p.id
       LEFT JOIN clients c ON p.client_id = c.id
       WHERE q.id = ?`
    ).get(req.params.id);

    if (!quotation) {
      return res.status(404).json({ success: false, error: 'Quotation not found' });
    }

    quotation.items = quotation.items ? JSON.parse(quotation.items) : [];
    res.json({ success: true, data: quotation });
  } catch (err) {
    console.error('Get quotation error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch quotation' });
  }
});

router.post('/', (req, res) => {
  try {
    const {
      project_id, project_name, quotation_number: qNum,
      items, line_items, subtotal, tax_percent, tax_amount,
      discount_percent, discount_amount, total_amount, status,
      valid_until, date, notes
    } = req.body;

    const resolvedItems = items || line_items;
    const resolvedTotal = total_amount || (resolvedItems ? resolvedItems.reduce((s, i) => s + (i.amount || 0), 0) : 0);
    const resolvedSubtotal = subtotal || resolvedTotal;

    let resolvedProjectId = project_id;
    if (!resolvedProjectId && project_name) {
      const found = db.prepare('SELECT id FROM projects WHERE title = ?').get(project_name);
      if (found) resolvedProjectId = found.id;
    }

    if (!resolvedProjectId || !resolvedItems || resolvedItems.length === 0) {
      return res.status(400).json({ success: false, error: 'Project and at least one line item are required' });
    }

    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(resolvedProjectId);
    if (!project) {
      return res.status(400).json({ success: false, error: 'Project not found' });
    }

    const existingVersions = db.prepare('SELECT MAX(version) as max_version FROM quotations WHERE project_id = ?').get(resolvedProjectId);
    const version = (existingVersions.max_version || 0) + 1;

    const quotation_number = qNum || generateQuotationNumber();
    const itemsString = typeof resolvedItems === 'string' ? resolvedItems : JSON.stringify(resolvedItems);

    const result = db.prepare(
      `INSERT INTO quotations (project_id, quotation_number, version, items, subtotal, tax_percent, tax_amount, discount_percent, discount_amount, total_amount, status, valid_until, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      resolvedProjectId, quotation_number, version, itemsString,
      resolvedSubtotal, tax_percent || 18, tax_amount || 0,
      discount_percent || 0, discount_amount || 0,
      resolvedTotal, (status || 'draft').toLowerCase(), valid_until || date || null, notes || null
    );

    const quotation = db.prepare('SELECT * FROM quotations WHERE id = ?').get(result.lastInsertRowid);
    quotation.items = JSON.parse(quotation.items);
    res.status(201).json({ success: true, data: quotation });
  } catch (err) {
    console.error('Create quotation error:', err);
    res.status(500).json({ success: false, error: 'Failed to create quotation' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Quotation not found' });
    }

    const {
      items, subtotal, tax_percent, tax_amount,
      discount_percent, discount_amount, total_amount,
      valid_until, notes
    } = req.body;

    const itemsString = items ? (typeof items === 'string' ? items : JSON.stringify(items)) : existing.items;

    db.prepare(
      `UPDATE quotations SET items = ?, subtotal = ?, tax_percent = ?, tax_amount = ?,
       discount_percent = ?, discount_amount = ?, total_amount = ?, valid_until = ?, notes = ?
       WHERE id = ?`
    ).run(
      itemsString,
      subtotal !== undefined ? subtotal : existing.subtotal,
      tax_percent !== undefined ? tax_percent : existing.tax_percent,
      tax_amount !== undefined ? tax_amount : existing.tax_amount,
      discount_percent !== undefined ? discount_percent : existing.discount_percent,
      discount_amount !== undefined ? discount_amount : existing.discount_amount,
      total_amount !== undefined ? total_amount : existing.total_amount,
      valid_until !== undefined ? valid_until : existing.valid_until,
      notes !== undefined ? notes : existing.notes,
      req.params.id
    );

    const quotation = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id);
    quotation.items = JSON.parse(quotation.items);
    res.json({ success: true, data: quotation });
  } catch (err) {
    console.error('Update quotation error:', err);
    res.status(500).json({ success: false, error: 'Failed to update quotation' });
  }
});

router.put('/:id/status', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Quotation not found' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    db.prepare('UPDATE quotations SET status = ? WHERE id = ?').run(status, req.params.id);

    if (status === 'approved') {
      db.prepare("UPDATE projects SET status = 'approved' WHERE id = ? AND status IN ('enquiry', 'quotation_sent', 'design_phase')").run(existing.project_id);
    }

    const quotation = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id);
    quotation.items = JSON.parse(quotation.items);
    res.json({ success: true, data: quotation });
  } catch (err) {
    console.error('Update quotation status error:', err);
    res.status(500).json({ success: false, error: 'Failed to update quotation status' });
  }
});

module.exports = router;
