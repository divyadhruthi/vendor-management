const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/summary', (req, res) => {
  try {
    const totalPayments = db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM payments').get();
    const paidPayments = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid'").get();
    const pendingPayments = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'pending'").get();
    const approvedPayments = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'approved'").get();

    const byType = db.prepare(
      `SELECT payment_type, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM payments
       GROUP BY payment_type`
    ).all();

    const byMode = db.prepare(
      `SELECT payment_mode, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
       FROM payments
       WHERE status = 'paid'
       GROUP BY payment_mode`
    ).all();

    res.json({
      success: true,
      data: {
        total_amount: totalPayments.total,
        paid_amount: paidPayments.total,
        pending_amount: pendingPayments.total,
        approved_amount: approvedPayments.total,
        by_type: byType,
        by_mode: byMode
      }
    });
  } catch (err) {
    console.error('Payment summary error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch payment summary' });
  }
});

router.get('/', (req, res) => {
  try {
    const { project_id, vendor_id, status, payment_type } = req.query;
    let query = `
      SELECT pay.*, p.title as project_title, v.name as vendor_name, t.title as task_title
      FROM payments pay
      LEFT JOIN projects p ON pay.project_id = p.id
      LEFT JOIN vendors v ON pay.vendor_id = v.id
      LEFT JOIN tasks t ON pay.task_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (project_id) {
      query += ' AND pay.project_id = ?';
      params.push(project_id);
    }
    if (vendor_id) {
      query += ' AND pay.vendor_id = ?';
      params.push(vendor_id);
    }
    if (status) {
      query += ' AND pay.status = ?';
      params.push(status);
    }
    if (payment_type) {
      query += ' AND pay.payment_type = ?';
      params.push(payment_type);
    }

    query += ' ORDER BY pay.created_at DESC';
    const payments = db.prepare(query).all(...params).map((p) => ({
      ...p,
      project_name: p.project_title,
      payment_date: p.paid_date,
    }));
    res.json({ success: true, data: payments });
  } catch (err) {
    console.error('List payments error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch payments' });
  }
});

router.post('/', (req, res) => {
  try {
    const {
      project_id, project_name, vendor_id, vendor_name, task_id, amount, payment_type,
      payment_mode, status, reference_number, paid_date, payment_date, notes
    } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, error: 'Amount is required' });
    }

    let resolvedProjectId = project_id;
    if (!resolvedProjectId && project_name) {
      const found = db.prepare('SELECT id FROM projects WHERE title = ?').get(project_name);
      if (found) resolvedProjectId = found.id;
    }

    let resolvedVendorId = vendor_id;
    if (!resolvedVendorId && vendor_name) {
      const found = db.prepare('SELECT id FROM vendors WHERE name = ?').get(vendor_name);
      if (found) resolvedVendorId = found.id;
    }

    const resolvedPaidDate = paid_date || payment_date || null;
    const finalStatus = (status || 'pending').toLowerCase();
    const finalPaidDate = finalStatus === 'paid' ? (resolvedPaidDate || new Date().toISOString().split('T')[0]) : resolvedPaidDate;

    const result = db.prepare(
      `INSERT INTO payments (project_id, vendor_id, task_id, amount, payment_type, payment_mode, status, reference_number, paid_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      resolvedProjectId || null, resolvedVendorId || null, task_id || null,
      amount, (payment_type || '').toLowerCase() || null, (payment_mode || '').toLowerCase().replace(/ /g, '_') || null,
      finalStatus, reference_number || null, finalPaidDate, notes || null
    );

    const payment = db.prepare(
      `SELECT pay.*, p.title as project_title, v.name as vendor_name
       FROM payments pay
       LEFT JOIN projects p ON pay.project_id = p.id
       LEFT JOIN vendors v ON pay.vendor_id = v.id
       WHERE pay.id = ?`
    ).get(result.lastInsertRowid);

    res.status(201).json({ success: true, data: { ...payment, project_name: payment.project_title, payment_date: payment.paid_date } });
  } catch (err) {
    console.error('Create payment error:', err);
    res.status(500).json({ success: false, error: 'Failed to create payment' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM payments WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    const {
      amount, payment_type, payment_mode, status,
      reference_number, paid_date, notes
    } = req.body;

    let finalPaidDate = paid_date !== undefined ? paid_date : existing.paid_date;
    if (status === 'paid' && !existing.paid_date && !paid_date) {
      finalPaidDate = new Date().toISOString().split('T')[0];
    }

    db.prepare(
      `UPDATE payments SET amount = ?, payment_type = ?, payment_mode = ?, status = ?,
       reference_number = ?, paid_date = ?, notes = ?
       WHERE id = ?`
    ).run(
      amount !== undefined ? amount : existing.amount,
      payment_type !== undefined ? payment_type : existing.payment_type,
      payment_mode !== undefined ? payment_mode : existing.payment_mode,
      status || existing.status,
      reference_number !== undefined ? reference_number : existing.reference_number,
      finalPaidDate,
      notes !== undefined ? notes : existing.notes,
      req.params.id
    );

    const payment = db.prepare(
      `SELECT pay.*, p.title as project_title, v.name as vendor_name
       FROM payments pay
       LEFT JOIN projects p ON pay.project_id = p.id
       LEFT JOIN vendors v ON pay.vendor_id = v.id
       WHERE pay.id = ?`
    ).get(req.params.id);

    res.json({ success: true, data: payment });
  } catch (err) {
    console.error('Update payment error:', err);
    res.status(500).json({ success: false, error: 'Failed to update payment' });
  }
});

module.exports = router;
