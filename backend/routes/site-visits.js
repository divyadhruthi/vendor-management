const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', (req, res) => {
  try {
    const { project_id, status } = req.query;
    let query = `
      SELECT sv.*, p.title as project_title, p.site_address, u.name as visited_by_name, c.name as client_name
      FROM site_visits sv
      LEFT JOIN projects p ON sv.project_id = p.id
      LEFT JOIN users u ON sv.visited_by = u.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (project_id) {
      query += ' AND sv.project_id = ?';
      params.push(project_id);
    }
    if (status) {
      query += ' AND sv.status = ?';
      params.push(status);
    }

    query += ' ORDER BY sv.scheduled_date DESC';
    const visits = db.prepare(query).all(...params).map((v) => ({
      ...v,
      project_name: v.project_title,
      address: v.site_address,
    }));
    res.json({ success: true, data: visits });
  } catch (err) {
    console.error('List site visits error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch site visits' });
  }
});

router.post('/', (req, res) => {
  try {
    const { project_id, project_name, scheduled_date, visited_by, status, measurements, site_photos, notes } = req.body;

    let resolvedProjectId = project_id;
    if (!resolvedProjectId && project_name) {
      const found = db.prepare('SELECT id FROM projects WHERE title = ?').get(project_name);
      if (found) resolvedProjectId = found.id;
    }

    if (!resolvedProjectId || !scheduled_date) {
      return res.status(400).json({ success: false, error: 'Project and scheduled date are required' });
    }

    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(resolvedProjectId);
    if (!project) {
      return res.status(400).json({ success: false, error: 'Project not found' });
    }

    const result = db.prepare(
      `INSERT INTO site_visits (project_id, scheduled_date, visited_by, status, measurements, site_photos, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      resolvedProjectId, scheduled_date, visited_by || req.user.id,
      status || 'scheduled', measurements || null,
      site_photos || null, notes || null
    );

    const visit = db.prepare(
      `SELECT sv.*, p.title as project_title, u.name as visited_by_name
       FROM site_visits sv
       LEFT JOIN projects p ON sv.project_id = p.id
       LEFT JOIN users u ON sv.visited_by = u.id
       WHERE sv.id = ?`
    ).get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: visit });
  } catch (err) {
    console.error('Create site visit error:', err);
    res.status(500).json({ success: false, error: 'Failed to create site visit' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM site_visits WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Site visit not found' });
    }

    const { scheduled_date, visited_date, visited_by, status, measurements, site_photos, notes } = req.body;

    db.prepare(
      `UPDATE site_visits SET scheduled_date = ?, visited_date = ?, visited_by = ?, status = ?, measurements = ?, site_photos = ?, notes = ?
       WHERE id = ?`
    ).run(
      scheduled_date || existing.scheduled_date,
      visited_date !== undefined ? visited_date : existing.visited_date,
      visited_by !== undefined ? visited_by : existing.visited_by,
      status || existing.status,
      measurements !== undefined ? measurements : existing.measurements,
      site_photos !== undefined ? site_photos : existing.site_photos,
      notes !== undefined ? notes : existing.notes,
      req.params.id
    );

    if (status === 'completed') {
      db.prepare("UPDATE projects SET status = 'site_visit_done' WHERE id = ? AND status = 'site_visit_scheduled'").run(existing.project_id);
    }

    const visit = db.prepare(
      `SELECT sv.*, p.title as project_title, u.name as visited_by_name
       FROM site_visits sv
       LEFT JOIN projects p ON sv.project_id = p.id
       LEFT JOIN users u ON sv.visited_by = u.id
       WHERE sv.id = ?`
    ).get(req.params.id);

    res.json({ success: true, data: visit });
  } catch (err) {
    console.error('Update site visit error:', err);
    res.status(500).json({ success: false, error: 'Failed to update site visit' });
  }
});

module.exports = router;
