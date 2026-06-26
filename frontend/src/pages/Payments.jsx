import { useEffect, useState } from 'react';
import { DollarSign, Plus, Search, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import StatsCard from '../components/StatsCard';
import DataTable from '../components/DataTable';
import { fetchPayments, createPayment, fetchVendors, fetchProjects } from '../utils/api';

const PAYMENT_STATUSES = ['Pending', 'Paid', 'Cancelled'];
const PAYMENT_TYPES = ['Advance', 'Progress', 'Final', 'Retention', 'Other'];
const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other'];

const emptyForm = {
  vendor_name: '', vendor_id: '', project_name: '', project_id: '',
  amount: '', payment_type: 'Progress', payment_mode: 'Bank Transfer',
  status: 'Pending', payment_date: '', reference_number: '', notes: '',
};

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    Promise.allSettled([fetchPayments(), fetchVendors(), fetchProjects()])
      .then(([payRes, venRes, projRes]) => {
        if (payRes.status === 'fulfilled') setPayments(payRes.value?.data || payRes.value || []);
        if (venRes.status === 'fulfilled') setVendors(venRes.value?.data || venRes.value || []);
        if (projRes.status === 'fulfilled') setProjects(projRes.value?.data || projRes.value || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const totalAmount = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const paidAmount = payments.filter((p) => p.status === 'Paid').reduce((s, p) => s + (p.amount || 0), 0);
  const pendingAmount = payments.filter((p) => p.status === 'Pending').reduce((s, p) => s + (p.amount || 0), 0);

  const filtered = payments.filter((p) => {
    if (filterStatus && p.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return (p.vendor_name || '').toLowerCase().includes(s) || (p.project_name || '').toLowerCase().includes(s);
    }
    return true;
  });

  const fmtCurrency = (v) => v != null ? `₹${Number(v).toLocaleString('en-IN')}` : '—';
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createPayment({ ...form, amount: Number(form.amount) });
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'vendor_name', label: 'Vendor', render: (v) => <span className="font-medium text-slate-800">{v || '—'}</span> },
    { key: 'project_name', label: 'Project' },
    { key: 'amount', label: 'Amount', render: (v) => <span className="font-semibold">{fmtCurrency(v)}</span> },
    { key: 'payment_type', label: 'Type' },
    { key: 'payment_mode', label: 'Mode' },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} /> },
    { key: 'payment_date', label: 'Date', render: (v) => fmtDate(v) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-800">Payments</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add Payment</button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard icon={CheckCircle2} title="Total Paid" value={fmtCurrency(paidAmount)} color="green" />
        <StatsCard icon={Clock} title="Pending Amount" value={fmtCurrency(pendingAmount)} color="amber" />
        <StatsCard icon={TrendingUp} title="Total Amount" value={fmtCurrency(totalAmount)} color="blue" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input-field pl-9" placeholder="Search payments..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      ) : (
        <DataTable columns={columns} data={filtered} emptyMessage={search || filterStatus ? 'No payments match your filters. Try adjusting your search criteria.' : 'No payments recorded yet. Click "Add Payment" to record your first transaction.'} />
      )}

      {/* Add Payment Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Payment">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Vendor *</label>
              <select className="input-field" required value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}>
                <option value="">Select vendor</option>
                {vendors.map((v) => <option key={v._id || v.id} value={v.vendor_name}>{v.vendor_name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Project *</label>
              <select className="input-field" required value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })}>
                <option value="">Select project</option>
                {projects.map((p) => <option key={p._id || p.id} value={p.project_name}>{p.project_name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Amount (₹) *</label>
              <input className="input-field" type="number" required min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Payment Type</label>
              <select className="input-field" value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })}>
                {PAYMENT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Payment Mode</label>
              <select className="input-field" value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}>
                {PAYMENT_MODES.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Payment Date</label>
              <input className="input-field" type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Reference Number</label>
              <input className="input-field" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea className="input-field" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Payment'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
