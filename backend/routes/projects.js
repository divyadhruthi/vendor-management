const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', (req, res) => {
  try {
    const { status, priority, client_id, search } = req.query;
    let query = `
      SELECT p.*, c.name as client_name, u.name as assigned_to_name
      FROM projects p
      LEFT JOIN clients c ON p.client_id = c.id
      LEFT JOIN users u ON p.assigned_to = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }
    if (priority) {
      query += ' AND p.priority = ?';
      params.push(priority);
    }
    if (client_id) {
      query += ' AND p.client_id = ?';
      params.push(client_id);
    }
    if (search) {
      query += ' AND (p.title LIKE ? OR p.site_address LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }

    query += ' ORDER BY p.updated_at DESC';
    const projects = db.prepare(query).all(...params).map((p) => ({
      ...p,
      project_name: p.title,
      budget: p.budget_estimate,
      end_date: p.expected_end_date,
      address: p.site_address,
    }));
    res.json({ success: true, data: projects });
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const project = db.prepare(
      `SELECT p.*, c.name as client_name, c.phone as client_phone, c.email as client_email, u.name as assigned_to_name
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       LEFT JOIN users u ON p.assigned_to = u.id
       WHERE p.id = ?`
    ).get(req.params.id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const tasks = db.prepare(
      `SELECT t.*, v.name as vendor_name, u.name as assigned_user_name
       FROM tasks t
       LEFT JOIN vendors v ON t.assigned_vendor_id = v.id
       LEFT JOIN users u ON t.assigned_user_id = u.id
       WHERE t.project_id = ?
       ORDER BY t.created_at DESC`
    ).all(req.params.id);

    const milestones = db.prepare('SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date ASC').all(req.params.id);

    const payments = db.prepare(
      `SELECT pay.*, v.name as vendor_name
       FROM payments pay
       LEFT JOIN vendors v ON pay.vendor_id = v.id
       WHERE pay.project_id = ?
       ORDER BY pay.created_at DESC`
    ).all(req.params.id);

    const quotations = db.prepare('SELECT * FROM quotations WHERE project_id = ? ORDER BY version DESC').all(req.params.id);

    const site_visits = db.prepare(
      `SELECT sv.*, u.name as visited_by_name
       FROM site_visits sv
       LEFT JOIN users u ON sv.visited_by = u.id
       WHERE sv.project_id = ?
       ORDER BY sv.scheduled_date DESC`
    ).all(req.params.id);

    res.json({
      success: true,
      data: { ...project, tasks, milestones, payments, quotations, site_visits }
    });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
});

router.post('/', (req, res) => {
  try {
    const {
      title, project_name, client_id, client_name, project_type, status, priority,
      budget_estimate, budget, start_date, expected_end_date, end_date,
      site_address, address, city, area_sqft, rooms, description, assigned_to
    } = req.body;

    const projectTitle = title || project_name;
    const resolvedBudget = budget_estimate || budget || null;
    const resolvedEndDate = expected_end_date || end_date || null;
    const resolvedAddress = site_address || address || null;

    let resolvedClientId = client_id;
    if (!resolvedClientId && client_name) {
      const found = db.prepare('SELECT id FROM clients WHERE name = ?').get(client_name);
      if (found) resolvedClientId = found.id;
    }

    if (!projectTitle || !resolvedClientId) {
      return res.status(400).json({ success: false, error: 'Project name and client are required' });
    }

    const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(resolvedClientId);
    if (!client) {
      return res.status(400).json({ success: false, error: 'Client not found. Please add the client first.' });
    }

    const result = db.prepare(
      `INSERT INTO projects (title, client_id, project_type, status, priority, budget_estimate, start_date, expected_end_date, site_address, city, area_sqft, rooms, description, assigned_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      projectTitle, resolvedClientId, project_type || null, status || 'enquiry',
      priority || 'medium', resolvedBudget,
      start_date || null, resolvedEndDate,
      resolvedAddress, city || null, area_sqft || null,
      rooms || null, description || null, assigned_to || null
    );

    const project = db.prepare(
      `SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = ?`
    ).get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: { ...project, project_name: project.title, budget: project.budget_estimate, end_date: project.expected_end_date, address: project.site_address } });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ success: false, error: 'Failed to create project' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const {
      title, project_name, client_id, client_name, project_type, status, priority,
      budget_estimate, budget, final_amount, start_date, expected_end_date, end_date,
      actual_end_date, site_address, address, city, area_sqft, rooms,
      description, assigned_to
    } = req.body;

    const projectTitle = title || project_name;
    const resolvedBudget = budget_estimate !== undefined ? budget_estimate : (budget !== undefined ? budget : undefined);
    const resolvedEndDate = expected_end_date !== undefined ? expected_end_date : (end_date !== undefined ? end_date : undefined);
    const resolvedAddress = site_address !== undefined ? site_address : (address !== undefined ? address : undefined);

    let resolvedClientId = client_id;
    if (!resolvedClientId && client_name) {
      const found = db.prepare('SELECT id FROM clients WHERE name = ?').get(client_name);
      if (found) resolvedClientId = found.id;
    }

    if (status === 'completed' && !existing.actual_end_date && !actual_end_date) {
      req.body.actual_end_date = new Date().toISOString().split('T')[0];
    }

    db.prepare(
      `UPDATE projects SET title = ?, client_id = ?, project_type = ?, status = ?, priority = ?,
       budget_estimate = ?, final_amount = ?, start_date = ?, expected_end_date = ?,
       actual_end_date = ?, site_address = ?, city = ?, area_sqft = ?, rooms = ?,
       description = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      projectTitle || existing.title,
      resolvedClientId || existing.client_id,
      project_type !== undefined ? project_type : existing.project_type,
      status || existing.status,
      priority || existing.priority,
      resolvedBudget !== undefined ? resolvedBudget : existing.budget_estimate,
      final_amount !== undefined ? final_amount : existing.final_amount,
      start_date !== undefined ? start_date : existing.start_date,
      resolvedEndDate !== undefined ? resolvedEndDate : existing.expected_end_date,
      actual_end_date || req.body.actual_end_date || existing.actual_end_date,
      resolvedAddress !== undefined ? resolvedAddress : existing.site_address,
      city !== undefined ? city : existing.city,
      area_sqft !== undefined ? area_sqft : existing.area_sqft,
      rooms !== undefined ? rooms : existing.rooms,
      description !== undefined ? description : existing.description,
      assigned_to !== undefined ? assigned_to : existing.assigned_to,
      req.params.id
    );

    const project = db.prepare(
      `SELECT p.*, c.name as client_name FROM projects p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = ?`
    ).get(req.params.id);
    res.json({ success: true, data: { ...project, project_name: project.title, budget: project.budget_estimate, end_date: project.expected_end_date, address: project.site_address } });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ success: false, error: 'Failed to update project' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const deleteRelated = db.transaction(() => {
      db.prepare('DELETE FROM site_visits WHERE project_id = ?').run(req.params.id);
      db.prepare('DELETE FROM quotations WHERE project_id = ?').run(req.params.id);
      db.prepare('DELETE FROM milestones WHERE project_id = ?').run(req.params.id);
      db.prepare('DELETE FROM payments WHERE project_id = ?').run(req.params.id);
      db.prepare('DELETE FROM vendor_ratings WHERE project_id = ?').run(req.params.id);
      db.prepare('DELETE FROM tasks WHERE project_id = ?').run(req.params.id);
      db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    });

    deleteRelated();
    res.json({ success: true, data: { message: 'Project and related data deleted successfully' } });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

module.exports = router;
