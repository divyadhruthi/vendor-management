const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', (req, res) => {
  try {
    const { project_id, status, vendor_id, priority, search } = req.query;
    let query = `
      SELECT t.*, p.title as project_title, v.name as vendor_name, u.name as assigned_user_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN vendors v ON t.assigned_vendor_id = v.id
      LEFT JOIN users u ON t.assigned_user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (project_id) {
      query += ' AND t.project_id = ?';
      params.push(project_id);
    }
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    if (vendor_id) {
      query += ' AND t.assigned_vendor_id = ?';
      params.push(vendor_id);
    }
    if (priority) {
      query += ' AND t.priority = ?';
      params.push(priority);
    }
    if (search) {
      query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }

    query += ' ORDER BY t.created_at DESC';
    const tasks = db.prepare(query).all(...params).map((t) => ({
      ...t,
      task_name: t.title,
      project_name: t.project_title,
    }));
    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error('List tasks error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});

router.post('/', (req, res) => {
  try {
    const {
      project_id, project_name, title, task_name, description,
      assigned_vendor_id, vendor_name, assigned_user_id,
      status, priority, start_date, due_date, estimated_cost, notes
    } = req.body;

    const taskTitle = title || task_name;

    let resolvedProjectId = project_id;
    if (!resolvedProjectId && project_name) {
      const found = db.prepare('SELECT id FROM projects WHERE title = ?').get(project_name);
      if (found) resolvedProjectId = found.id;
    }

    let resolvedVendorId = assigned_vendor_id;
    if (!resolvedVendorId && vendor_name) {
      const found = db.prepare('SELECT id FROM vendors WHERE name = ?').get(vendor_name);
      if (found) resolvedVendorId = found.id;
    }

    if (!resolvedProjectId || !taskTitle) {
      return res.status(400).json({ success: false, error: 'Project and task name are required' });
    }

    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(resolvedProjectId);
    if (!project) {
      return res.status(400).json({ success: false, error: 'Project not found' });
    }

    const effectiveStatus = resolvedVendorId ? (status || 'assigned') : (status || 'pending');

    const result = db.prepare(
      `INSERT INTO tasks (project_id, title, description, assigned_vendor_id, assigned_user_id, status, priority, start_date, due_date, estimated_cost, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      resolvedProjectId, taskTitle, description || null,
      resolvedVendorId || null, assigned_user_id || null,
      effectiveStatus, priority || 'medium',
      start_date || null, due_date || null,
      estimated_cost || null, notes || null
    );

    const task = db.prepare(
      `SELECT t.*, p.title as project_title, v.name as vendor_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN vendors v ON t.assigned_vendor_id = v.id
       WHERE t.id = ?`
    ).get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: { ...task, task_name: task.title, project_name: task.project_title } });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const {
      title, task_name, description, assigned_vendor_id, vendor_name, assigned_user_id,
      status, priority, start_date, due_date, completed_date,
      estimated_cost, actual_cost, notes
    } = req.body;

    const taskTitle = title || task_name;

    let resolvedVendorId = assigned_vendor_id;
    if (resolvedVendorId === undefined && vendor_name) {
      const found = db.prepare('SELECT id FROM vendors WHERE name = ?').get(vendor_name);
      if (found) resolvedVendorId = found.id;
    }

    let finalCompletedDate = completed_date !== undefined ? completed_date : existing.completed_date;
    if (status === 'completed' && !existing.completed_date && !completed_date) {
      finalCompletedDate = new Date().toISOString().split('T')[0];
    }

    db.prepare(
      `UPDATE tasks SET title = ?, description = ?, assigned_vendor_id = ?, assigned_user_id = ?,
       status = ?, priority = ?, start_date = ?, due_date = ?, completed_date = ?,
       estimated_cost = ?, actual_cost = ?, notes = ?
       WHERE id = ?`
    ).run(
      taskTitle || existing.title,
      description !== undefined ? description : existing.description,
      resolvedVendorId !== undefined ? resolvedVendorId : existing.assigned_vendor_id,
      assigned_user_id !== undefined ? assigned_user_id : existing.assigned_user_id,
      status || existing.status,
      priority || existing.priority,
      start_date !== undefined ? start_date : existing.start_date,
      due_date !== undefined ? due_date : existing.due_date,
      finalCompletedDate,
      estimated_cost !== undefined ? estimated_cost : existing.estimated_cost,
      actual_cost !== undefined ? actual_cost : existing.actual_cost,
      notes !== undefined ? notes : existing.notes,
      req.params.id
    );

    const task = db.prepare(
      `SELECT t.*, p.title as project_title, v.name as vendor_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN vendors v ON t.assigned_vendor_id = v.id
       WHERE t.id = ?`
    ).get(req.params.id);

    res.json({ success: true, data: { ...task, task_name: task.title, project_name: task.project_title } });
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    db.prepare('DELETE FROM payments WHERE task_id = ?').run(req.params.id);
    db.prepare('DELETE FROM vendor_ratings WHERE task_id = ?').run(req.params.id);
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: { message: 'Task deleted successfully' } });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

module.exports = router;
