import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Building2,
  DollarSign,
  Activity,
  Plus,
  ArrowRight,
  TrendingUp,
  Users,
  ClipboardList,
  CalendarCheck,
  FileText,
  Rocket,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import StatsCard from '../components/StatsCard';
import DataTable from '../components/DataTable';
import { fetchProjects, fetchVendors, fetchPayments } from '../utils/api';

const PIE_COLORS = ['#4f46e5', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([fetchProjects(), fetchVendors(), fetchPayments()])
      .then(([projRes, vendRes, payRes]) => {
        if (projRes.status === 'fulfilled') setProjects(projRes.value?.data || projRes.value || []);
        if (vendRes.status === 'fulfilled') setVendors(vendRes.value?.data || vendRes.value || []);
        if (payRes.status === 'fulfilled') setPayments(payRes.value?.data || payRes.value || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeProjects = projects.filter((p) => p.status === 'In Progress' || p.status === 'Active');
  const pendingPayments = payments.filter((p) => p.status === 'Pending');
  const totalPendingAmount = pendingPayments.reduce((s, p) => s + (p.amount || 0), 0);

  const statusChartData = ['Planning', 'In Progress', 'Completed', 'On Hold'].map((status) => ({
    name: status,
    count: projects.filter((p) => p.status === status).length,
  }));

  const hasStatusData = statusChartData.some((d) => d.count > 0);

  const categoryMap = {};
  vendors.forEach((v) => {
    const cat = v.skill_category || v.category || 'Other';
    categoryMap[cat] = (categoryMap[cat] || 0) + 1;
  });
  const categoryChartData = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.createdAt || b.start_date || 0) - new Date(a.createdAt || a.start_date || 0))
    .slice(0, 5);

  const projectColumns = [
    { key: 'project_name', label: 'Project' },
    { key: 'client_name', label: 'Client' },
    { key: 'status', label: 'Status', render: (v) => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
        v === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
        v === 'In Progress' ? 'bg-blue-50 text-blue-700' :
        'bg-amber-50 text-amber-700'
      }`}>{v || '—'}</span>
    )},
    { key: 'budget', label: 'Budget', render: (v) => v ? `₹${Number(v).toLocaleString('en-IN')}` : '—' },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  const isEmpty = projects.length === 0 && vendors.length === 0 && payments.length === 0;

  return (
    <div className="space-y-6">
      {/* Welcome Banner — shown only when the system is empty */}
      {isEmpty && (
        <div className="rounded-xl border border-primary-200 bg-gradient-to-r from-primary-50 to-indigo-50 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-100">
              <Rocket className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Welcome to Glory Simon Interiors</h2>
              <p className="mt-1 text-sm text-slate-600">
                Your Vendor & Contractor Management System is ready. Get started by adding your first client, vendor, or project using the quick actions below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard icon={FolderKanban} title="Total Projects" value={projects.length} change={`${activeProjects.length} active`} changeType="up" color="primary" />
        <StatsCard icon={Activity} title="Active Projects" value={activeProjects.length} color="blue" />
        <StatsCard icon={Building2} title="Total Vendors" value={vendors.length} color="violet" />
        <StatsCard icon={DollarSign} title="Pending Payments" value={`₹${totalPendingAmount.toLocaleString('en-IN')}`} change={`${pendingPayments.length} pending`} changeType="down" color="amber" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Project Status Bar Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Project Status Overview</h3>
          {hasStatusData ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusChartData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] flex-col items-center justify-center text-center">
              <FolderKanban className="mb-2 h-10 w-10 text-slate-200" />
              <p className="text-sm text-slate-400">No projects yet</p>
              <p className="text-xs text-slate-300">Create your first project to see status analytics</p>
            </div>
          )}
        </div>

        {/* Vendor Category Pie Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Vendor Categories</h3>
          {categoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                  {categoryChartData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] flex-col items-center justify-center text-center">
              <Building2 className="mb-2 h-10 w-10 text-slate-200" />
              <p className="text-sm text-slate-400">No vendors registered</p>
              <p className="text-xs text-slate-300">Add vendors to see category distribution</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Projects & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Recent Projects</h3>
            <button onClick={() => navigate('/projects')} className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <DataTable columns={projectColumns} data={recentProjects} onRowClick={() => navigate('/projects')} emptyMessage="No projects yet. Create your first project to get started!" />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">Quick Actions</h3>
          <div className="space-y-2">
            {[
              { label: 'New Project', path: '/projects', color: 'bg-primary-600 hover:bg-primary-700' },
              { label: 'Add Vendor', path: '/vendors', color: 'bg-emerald-600 hover:bg-emerald-700' },
              { label: 'Add Client', path: '/clients', color: 'bg-cyan-600 hover:bg-cyan-700' },
              { label: 'Record Payment', path: '/payments', color: 'bg-amber-600 hover:bg-amber-700' },
              { label: 'New Quotation', path: '/quotations', color: 'bg-violet-600 hover:bg-violet-700' },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition ${action.color}`}
              >
                <Plus className="h-4 w-4" /> {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
