const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', (req, res) => {
  try {
    const { status, client_type, search } = req.query;
    let query = 'SELECT * FROM clients WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (client_type) {
      query += ' AND client_type = ?';
      params.push(client_type);
    }
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY created_at DESC';
    const clients = db.prepare(query).all(...params).map((c) => ({
      ...c,
      client_name: c.name,
    }));
    res.json({ success: true, data: clients });
  } catch (err) {
    console.error('List clients error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch clients' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const projects = db.prepare('SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json({ success: true, data: { ...client, client_name: client.name, projects } });
  } catch (err) {
    console.error('Get client error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch client' });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, client_name, email, phone, address, city, client_type, company_name, gst_number, source, notes, status, project_status } = req.body;

    const clientName = name || client_name;
    if (!clientName || !phone) {
      return res.status(400).json({ success: false, error: 'Name and phone are required' });
    }

    const result = db.prepare(
      `INSERT INTO clients (name, email, phone, address, city, client_type, company_name, gst_number, source, notes, status, project_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(clientName, email || null, phone, address || null, city || null, client_type || null, company_name || null, gst_number || null, source || null, notes || null, status || 'active', project_status || 'New');

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: { ...client, client_name: client.name } });
  } catch (err) {
    console.error('Create client error:', err);
    res.status(500).json({ success: false, error: 'Failed to create client' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const { name, client_name, email, phone, address, city, client_type, company_name, gst_number, source, notes, status, project_status } = req.body;

    const clientName = name || client_name;

    db.prepare(
      `UPDATE clients SET name = ?, email = ?, phone = ?, address = ?, city = ?, client_type = ?, company_name = ?, gst_number = ?, source = ?, notes = ?, status = ?, project_status = ?
       WHERE id = ?`
    ).run(
      clientName || existing.name,
      email !== undefined ? email : existing.email,
      phone || existing.phone,
      address !== undefined ? address : existing.address,
      city !== undefined ? city : existing.city,
      client_type !== undefined ? client_type : existing.client_type,
      company_name !== undefined ? company_name : existing.company_name,
      gst_number !== undefined ? gst_number : existing.gst_number,
      source !== undefined ? source : existing.source,
      notes !== undefined ? notes : existing.notes,
      status || existing.status,
      project_status !== undefined ? project_status : existing.project_status,
      req.params.id
    );

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: { ...client, client_name: client.name } });
  } catch (err) {
    console.error('Update client error:', err);
    res.status(500).json({ success: false, error: 'Failed to update client' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects WHERE client_id = ?').get(req.params.id);
    if (projectCount.count > 0) {
      return res.status(400).json({ success: false, error: 'Cannot delete client with existing projects' });
    }

    db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: { message: 'Client deleted successfully' } });
  } catch (err) {
    console.error('Delete client error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete client' });
  }
});

module.exports = router;
