const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/stats', (req, res) => {
  try {
    const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
    const activeProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status IN ('in_progress', 'design_phase', 'approved')").get().count;
    const totalVendors = db.prepare("SELECT COUNT(*) as count FROM vendors WHERE status = 'active'").get().count;
    const totalClients = db.prepare('SELECT COUNT(*) as count FROM clients').get().count;
    const pendingPayments = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'pending'").get().total;
    const revenue = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'paid'").get().total;
    const pendingTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status IN ('pending', 'assigned')").get().count;
    const completedProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'completed'").get().count;

    res.json({
      success: true,
      data: {
        total_projects: totalProjects,
        active_projects: activeProjects,
        completed_projects: completedProjects,
        total_vendors: totalVendors,
        total_clients: totalClients,
        pending_payments: pendingPayments,
        revenue,
        pending_tasks: pendingTasks
      }
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/recent-activities', (req, res) => {
  try {
    const recentProjects = db.prepare(
      `SELECT p.id, p.title, p.status, p.updated_at, c.name as client_name
       FROM projects p
       LEFT JOIN clients c ON p.client_id = c.id
       ORDER BY p.updated_at DESC
       LIMIT 10`
    ).all();

    const recentTasks = db.prepare(
      `SELECT t.id, t.title, t.status, t.created_at, p.title as project_title, v.name as vendor_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN vendors v ON t.assigned_vendor_id = v.id
       ORDER BY t.created_at DESC
       LIMIT 10`
    ).all();

    const recentPayments = db.prepare(
      `SELECT pay.id, pay.amount, pay.status, pay.payment_type, pay.created_at, p.title as project_title, v.name as vendor_name
       FROM payments pay
       LEFT JOIN projects p ON pay.project_id = p.id
       LEFT JOIN vendors v ON pay.vendor_id = v.id
       ORDER BY pay.created_at DESC
       LIMIT 10`
    ).all();

    res.json({
      success: true,
      data: {
        recent_projects: recentProjects,
        recent_tasks: recentTasks,
        recent_payments: recentPayments
      }
    });
  } catch (err) {
    console.error('Recent activities error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch recent activities' });
  }
});

router.get('/project-status-breakdown', (req, res) => {
  try {
    const breakdown = db.prepare(
      `SELECT status, COUNT(*) as count
       FROM projects
       GROUP BY status
       ORDER BY count DESC`
    ).all();

    res.json({ success: true, data: breakdown });
  } catch (err) {
    console.error('Project status breakdown error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch project status breakdown' });
  }
});

router.get('/vendor-category-breakdown', (req, res) => {
  try {
    const breakdown = db.prepare(
      `SELECT skill_category, COUNT(*) as count, ROUND(AVG(rating), 2) as avg_rating
       FROM vendors
       WHERE status = 'active'
       GROUP BY skill_category
       ORDER BY count DESC`
    ).all();

    res.json({ success: true, data: breakdown });
  } catch (err) {
    console.error('Vendor category breakdown error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch vendor category breakdown' });
  }
});

module.exports = router;
