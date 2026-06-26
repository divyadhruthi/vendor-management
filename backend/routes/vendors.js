const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', (req, res) => {
  try {
    const { skill_category, status, search } = req.query;
    let query = 'SELECT * FROM vendors WHERE 1=1';
    const params = [];

    if (skill_category) {
      query += ' AND skill_category = ?';
      params.push(skill_category);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (name LIKE ? OR company_name LIKE ? OR phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY rating DESC, created_at DESC';
    const vendors = db.prepare(query).all(...params).map((v) => ({
      ...v,
      vendor_name: v.name,
    }));
    res.json({ success: true, data: vendors });
  } catch (err) {
    console.error('List vendors error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch vendors' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const ratings = db.prepare(
      `SELECT vr.*, p.title as project_title, u.name as rated_by_name
       FROM vendor_ratings vr
       LEFT JOIN projects p ON vr.project_id = p.id
       LEFT JOIN users u ON vr.rated_by = u.id
       WHERE vr.vendor_id = ?
       ORDER BY vr.created_at DESC`
    ).all(req.params.id);

    const tasks = db.prepare(
      `SELECT t.*, p.title as project_title
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.assigned_vendor_id = ?
       ORDER BY t.created_at DESC`
    ).all(req.params.id);

    res.json({ success: true, data: { ...vendor, vendor_name: vendor.name, ratings, tasks } });
  } catch (err) {
    console.error('Get vendor error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch vendor' });
  }
});

router.post('/', (req, res) => {
  try {
    const {
      name, vendor_name, company_name, email, phone, skill_category,
      experience_years, address, city, gst_number, pan_number,
      bank_account, ifsc_code, notes, status
    } = req.body;

    const vendorName = name || vendor_name;
    if (!vendorName || !phone || !skill_category) {
      return res.status(400).json({ success: false, error: 'Name, phone, and skill category are required' });
    }

    const result = db.prepare(
      `INSERT INTO vendors (name, company_name, email, phone, skill_category, experience_years, address, city, gst_number, pan_number, bank_account, ifsc_code, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      vendorName, company_name || null, email || null, phone, skill_category.toLowerCase(),
      experience_years || 0, address || null, city || null,
      gst_number || null, pan_number || null, bank_account || null,
      ifsc_code || null, notes || null, (status || 'active').toLowerCase()
    );

    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: { ...vendor, vendor_name: vendor.name } });
  } catch (err) {
    console.error('Create vendor error:', err);
    res.status(500).json({ success: false, error: 'Failed to create vendor' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const {
      name, vendor_name, company_name, email, phone, skill_category,
      experience_years, address, city, gst_number, pan_number,
      bank_account, ifsc_code, notes, status
    } = req.body;

    const vendorName = name || vendor_name;
    const resolvedCategory = skill_category ? skill_category.toLowerCase() : existing.skill_category;
    const resolvedStatus = status ? status.toLowerCase() : existing.status;

    db.prepare(
      `UPDATE vendors SET name = ?, company_name = ?, email = ?, phone = ?, skill_category = ?,
       experience_years = ?, address = ?, city = ?, gst_number = ?, pan_number = ?,
       bank_account = ?, ifsc_code = ?, notes = ?, status = ?
       WHERE id = ?`
    ).run(
      vendorName || existing.name,
      company_name !== undefined ? company_name : existing.company_name,
      email !== undefined ? email : existing.email,
      phone || existing.phone,
      resolvedCategory,
      experience_years !== undefined ? experience_years : existing.experience_years,
      address !== undefined ? address : existing.address,
      city !== undefined ? city : existing.city,
      gst_number !== undefined ? gst_number : existing.gst_number,
      pan_number !== undefined ? pan_number : existing.pan_number,
      bank_account !== undefined ? bank_account : existing.bank_account,
      ifsc_code !== undefined ? ifsc_code : existing.ifsc_code,
      notes !== undefined ? notes : existing.notes,
      resolvedStatus,
      req.params.id
    );

    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: { ...vendor, vendor_name: vendor.name } });
  } catch (err) {
    console.error('Update vendor error:', err);
    res.status(500).json({ success: false, error: 'Failed to update vendor' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE assigned_vendor_id = ? AND status NOT IN (\'completed\', \'cancelled\')').get(req.params.id);
    if (taskCount.count > 0) {
      return res.status(400).json({ success: false, error: 'Cannot delete vendor with active tasks' });
    }

    db.prepare('DELETE FROM vendor_ratings WHERE vendor_id = ?').run(req.params.id);
    db.prepare('DELETE FROM vendors WHERE id = ?').run(req.params.id);
    res.json({ success: true, data: { message: 'Vendor deleted successfully' } });
  } catch (err) {
    console.error('Delete vendor error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete vendor' });
  }
});

router.get('/:id/ratings', (req, res) => {
  try {
    const vendor = db.prepare('SELECT id, name FROM vendors WHERE id = ?').get(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const ratings = db.prepare(
      `SELECT vr.*, p.title as project_title, u.name as rated_by_name
       FROM vendor_ratings vr
       LEFT JOIN projects p ON vr.project_id = p.id
       LEFT JOIN users u ON vr.rated_by = u.id
       WHERE vr.vendor_id = ?
       ORDER BY vr.created_at DESC`
    ).all(req.params.id);

    res.json({ success: true, data: ratings });
  } catch (err) {
    console.error('Get vendor ratings error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch vendor ratings' });
  }
});

router.post('/:id/ratings', (req, res) => {
  try {
    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    const { project_id, task_id, quality_score, timeliness_score, communication_score, review } = req.body;

    if (!quality_score || !timeliness_score || !communication_score) {
      return res.status(400).json({ success: false, error: 'Quality, timeliness, and communication scores are required' });
    }

    const overall_score = ((quality_score + timeliness_score + communication_score) / 3).toFixed(2);

    const result = db.prepare(
      `INSERT INTO vendor_ratings (vendor_id, project_id, task_id, quality_score, timeliness_score, communication_score, overall_score, review, rated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      req.params.id, project_id || null, task_id || null,
      quality_score, timeliness_score, communication_score,
      overall_score, review || null, req.user.id
    );

    const avgRating = db.prepare('SELECT AVG(overall_score) as avg_rating, COUNT(*) as total FROM vendor_ratings WHERE vendor_id = ?').get(req.params.id);
    db.prepare('UPDATE vendors SET rating = ?, total_projects = ? WHERE id = ?').run(
      parseFloat(avgRating.avg_rating).toFixed(2), avgRating.total, req.params.id
    );

    const rating = db.prepare('SELECT * FROM vendor_ratings WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: rating });
  } catch (err) {
    console.error('Add vendor rating error:', err);
    res.status(500).json({ success: false, error: 'Failed to add vendor rating' });
  }
});

module.exports = router;
